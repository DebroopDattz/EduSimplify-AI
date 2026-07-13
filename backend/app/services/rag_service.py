"""
EduSimplify AI – Retrieval-Augmented Generation (RAG) pipeline service.

Manages the full RAG lifecycle:
- Embedding document chunks and persisting them in ChromaDB.
- Retrieving the most semantically relevant chunks for a query.
- Formatting those chunks into a context string ready for prompting.

The service is deliberately context-grounded: it never generates text itself;
it only supplies context.  Downstream agents/routers are responsible for
asserting in their system prompts that the LLM must not hallucinate beyond
the supplied context.
"""

from __future__ import annotations

from typing import List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings
from loguru import logger

from app.services.watsonx_service import WatsonxService
from app.services.pdf_service import TextChunk


# ─── ChromaDB collection naming ───────────────────────────────────────────────

_CHROMA_PERSIST_DIR = "./chroma_db"
_COLLECTION_PREFIX = "edusimplify_"


class RAGService:
    """
    Manages the vector store (ChromaDB) and retrieval pipeline.

    Each document gets its own ChromaDB collection keyed by ``doc_id`` so
    that retrieval is always scoped to a single user document.
    """

    def __init__(self) -> None:
        self._chroma = chromadb.PersistentClient(
            path=_CHROMA_PERSIST_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        # WatsonxService is injected lazily to avoid double-init
        self._watsonx: Optional[WatsonxService] = None
        logger.info(f"RAGService initialised – ChromaDB at '{_CHROMA_PERSIST_DIR}'.")

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _get_watsonx(self) -> WatsonxService:
        """Lazily obtain a WatsonxService instance."""
        if self._watsonx is None:
            self._watsonx = WatsonxService()
        return self._watsonx

    def _collection_name(self, doc_id: str) -> str:
        """Return the ChromaDB collection name for a given document ID."""
        # ChromaDB collection names must be 3-63 chars, alphanumeric + hyphens.
        safe_id = doc_id.replace("_", "-")[:50]
        return f"{_COLLECTION_PREFIX}{safe_id}"

    def _get_or_create_collection(self, doc_id: str) -> chromadb.Collection:
        """Get or create a ChromaDB collection for *doc_id*."""
        name = self._collection_name(doc_id)
        collection = self._chroma.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"},
        )
        return collection

    # ── Public API ────────────────────────────────────────────────────────────

    def embed_and_store(self, doc_id: str, chunks: List[TextChunk]) -> int:
        """
        Generate embeddings for *chunks* and persist them in ChromaDB.

        Args:
            doc_id: Unique document identifier used as the collection key.
            chunks: List of :class:`~app.services.pdf_service.TextChunk`
                    objects produced by ``chunk_document``.

        Returns:
            Number of chunks stored.

        Raises:
            RuntimeError: If embedding or ChromaDB storage fails.
        """
        if not chunks:
            logger.warning(f"embed_and_store called with empty chunk list for doc_id={doc_id}.")
            return 0

        texts = [c.text for c in chunks]
        ids = [f"{doc_id}_{c.chunk_id}" for c in chunks]
        metadatas = [
            {
                "doc_id": doc_id,
                "chunk_id": c.chunk_id,
                "start_char": c.start_char,
                "end_char": c.end_char,
            }
            for c in chunks
        ]

        logger.info(f"Generating embeddings for {len(chunks)} chunks (doc_id={doc_id}).")
        watsonx = self._get_watsonx()
        embeddings = watsonx.get_embeddings(texts)

        collection = self._get_or_create_collection(doc_id)
        collection.upsert(
            documents=texts,
            embeddings=embeddings,
            ids=ids,
            metadatas=metadatas,
        )
        logger.info(f"Stored {len(chunks)} chunks in ChromaDB collection '{self._collection_name(doc_id)}'.")
        return len(chunks)

    def retrieve(
        self,
        doc_id: str,
        query: str,
        top_k: int = 5,
    ) -> List[dict]:
        """
        Retrieve the *top_k* most relevant chunks for *query*.

        Args:
            doc_id: The document to search within.
            query: Natural-language query string.
            top_k: Maximum number of chunks to return.

        Returns:
            List of dicts with keys ``text``, ``chunk_id``, ``distance``.
            Returns an empty list if the collection does not exist.
        """
        collection_name = self._collection_name(doc_id)

        # Guard: if collection does not exist, return empty
        existing = [c.name for c in self._chroma.list_collections()]
        if collection_name not in existing:
            logger.warning(
                f"Collection '{collection_name}' not found – returning empty context."
            )
            return []

        watsonx = self._get_watsonx()
        query_embedding = watsonx.get_embeddings([query])[0]

        collection = self._chroma.get_collection(collection_name)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, collection.count()),
            include=["documents", "metadatas", "distances"],
        )

        retrieved: List[dict] = []
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        dists = results.get("distances", [[]])[0]

        for doc_text, meta, dist in zip(docs, metas, dists):
            retrieved.append(
                {
                    "text": doc_text,
                    "chunk_id": meta.get("chunk_id", ""),
                    "distance": dist,
                    "start_char": meta.get("start_char", 0),
                }
            )

        logger.debug(f"Retrieved {len(retrieved)} chunks for query (doc_id={doc_id}).")
        return retrieved

    def build_context(self, chunks: List[dict], max_chars: int = 4096) -> str:
        """
        Format retrieved chunks into a single context string for the LLM prompt.

        Chunks are ordered by relevance (ascending distance) and concatenated
        up to *max_chars* characters to avoid exceeding the context window.

        Args:
            chunks: List returned by :meth:`retrieve`.
            max_chars: Hard cap on total context length.

        Returns:
            A formatted multi-paragraph context string.
        """
        if not chunks:
            return "No relevant context found in the document."

        # Sort by distance (lower = more similar) – already ordered by ChromaDB
        # but re-sorting is harmless and makes the ordering explicit.
        sorted_chunks = sorted(chunks, key=lambda c: c.get("distance", 1.0))

        parts: List[str] = []
        total = 0
        for idx, chunk in enumerate(sorted_chunks, start=1):
            text = chunk["text"].strip()
            segment = f"[Source {idx}]\n{text}"
            if total + len(segment) > max_chars:
                remaining = max_chars - total
                if remaining > 100:  # Only append if meaningful content remains
                    parts.append(segment[:remaining] + "…")
                break
            parts.append(segment)
            total += len(segment)

        return "\n\n---\n\n".join(parts)

    def delete_collection(self, doc_id: str) -> None:
        """
        Delete the ChromaDB collection for a document (e.g. after COS deletion).

        Args:
            doc_id: The document whose collection should be removed.
        """
        name = self._collection_name(doc_id)
        try:
            self._chroma.delete_collection(name)
            logger.info(f"Deleted ChromaDB collection '{name}'.")
        except Exception as exc:
            logger.warning(f"Could not delete collection '{name}': {exc}")

    def collection_exists(self, doc_id: str) -> bool:
        """Return True if a ChromaDB collection exists for *doc_id*."""
        name = self._collection_name(doc_id)
        existing = [c.name for c in self._chroma.list_collections()]
        return name in existing

    def count_chunks(self, doc_id: str) -> int:
        """Return the number of stored chunks for *doc_id*, or 0 if absent."""
        if not self.collection_exists(doc_id):
            return 0
        collection = self._chroma.get_collection(self._collection_name(doc_id))
        return collection.count()
