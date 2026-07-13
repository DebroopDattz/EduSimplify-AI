"""
EduSimplify AI – IBM Cloudant service.

Wraps the ``ibmcloudant`` Python SDK and exposes a simple document-oriented
interface aligned with what the rest of the application needs:

- ``create_document``   – insert a new document (auto-generates ``_id`` if absent)
- ``get_document``      – fetch a document by its ID
- ``update_document``   – replace/merge a document (requires current ``_rev``)
- ``query_documents``   – Cloudant Selector (Mango) query
- ``delete_document``   – soft-delete via the ``_deleted`` flag approach or
                          hard-delete using ``_rev``
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ibmcloudant.cloudant_v1 import CloudantV1, Document
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings


class CloudantService:
    """
    Document-store client backed by IBM Cloudant.

    All methods accept a ``db_name`` parameter so the service can be reused
    across multiple logical databases (e.g. documents, progress, feedback).
    """

    def __init__(self, lazy: bool = True) -> None:
        settings = get_settings()
        self._settings = settings
        self._default_db = settings.cloudant_db_name
        self._client = None
        if not lazy:
            self._client = self._build_client(settings)
        else:
            logger.info("CloudantService created in lazy mode — will connect on first use.")

    def _build_client(self, settings=None):
        if settings is None:
            settings = self._settings
        authenticator = IAMAuthenticator(apikey=settings.cloudant_apikey)
        client = CloudantV1(authenticator=authenticator)
        client.set_service_url(settings.cloudant_url)
        logger.info(f"CloudantService connected – URL: {settings.cloudant_url}.")
        return client

    def _get_client(self) -> CloudantV1:
        if self._client is None:
            self._client = self._build_client()
        return self._client

    # ─── Internal helpers ─────────────────────────────────────────────────────

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    def _ensure_db(self, db_name: str) -> None:
        """Create the database if it does not already exist."""
        try:
            self._get_client().put_database(db=db_name).get_result()
            logger.debug(f"Database '{db_name}' created.")
        except Exception as exc:
            # 412 = already exists – that is fine
            if "already exists" not in str(exc).lower() and "412" not in str(exc):
                logger.warning(f"Could not create database '{db_name}': {exc}")

    # ─── Public API ───────────────────────────────────────────────────────────

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8), reraise=True)
    def create_document(
        self,
        doc: Dict[str, Any],
        db_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Insert a new document into Cloudant.

        If the doc does not contain ``_id``, a UUID4 is generated.
        ``created_at`` and ``updated_at`` timestamps are added automatically.

        Args:
            doc: The document dict to insert.
            db_name: Target database (defaults to ``CLOUDANT_DB_NAME``).

        Returns:
            The response dict containing ``id``, ``rev``, and ``ok``.
        """
        target_db = db_name or self._default_db
        self._ensure_db(target_db)

        if "_id" not in doc:
            doc["_id"] = str(uuid.uuid4())
        doc.setdefault("created_at", self._now_iso())
        doc["updated_at"] = self._now_iso()

        cloudant_doc = Document.from_dict(doc)
        result = self._get_client().post_document(db=target_db, document=cloudant_doc).get_result()
        logger.debug(f"Created document id={result.get('id')} in '{target_db}'.")
        return result

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8), reraise=True)
    def get_document(
        self,
        doc_id: str,
        db_name: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch a single document by ID.

        Args:
            doc_id: The ``_id`` of the target document.
            db_name: Target database.

        Returns:
            Document dict, or ``None`` if not found.
        """
        target_db = db_name or self._default_db
        try:
            doc = self._get_client().get_document(db=target_db, doc_id=doc_id).get_result()
            return doc
        except Exception as exc:
            if "404" in str(exc) or "not found" in str(exc).lower():
                return None
            logger.error(f"get_document failed for id={doc_id}: {exc}")
            raise

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8), reraise=True)
    def update_document(
        self,
        doc_id: str,
        updates: Dict[str, Any],
        db_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Update an existing document by merging *updates* into the stored doc.

        Fetches the current revision, merges ``updates``, and writes back.

        Args:
            doc_id: ID of the document to update.
            updates: Key-value pairs to merge (shallow).
            db_name: Target database.

        Returns:
            Cloudant response dict with the new ``rev``.

        Raises:
            FileNotFoundError: If the document does not exist.
        """
        target_db = db_name or self._default_db
        existing = self.get_document(doc_id, db_name=target_db)
        if existing is None:
            raise FileNotFoundError(f"Document '{doc_id}' not found in '{target_db}'.")

        merged = {**existing, **updates, "_id": doc_id, "_rev": existing["_rev"]}
        merged["updated_at"] = self._now_iso()

        cloudant_doc = Document.from_dict(merged)
        result = self._get_client().post_document(db=target_db, document=cloudant_doc).get_result()
        logger.debug(f"Updated document id={doc_id} in '{target_db}' → rev={result.get('rev')}.")
        return result

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8), reraise=True)
    def query_documents(
        self,
        selector: Dict[str, Any],
        fields: Optional[List[str]] = None,
        limit: int = 25,
        db_name: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Execute a Cloudant Mango (selector) query.

        Args:
            selector: Mango selector expression, e.g. ``{"user_id": {"$eq": "abc"}}``.
            fields: Optional list of field names to include in results.
            limit: Maximum number of documents to return.
            db_name: Target database.

        Returns:
            List of matching document dicts.
        """
        target_db = db_name or self._default_db
        payload: Dict[str, Any] = {"selector": selector, "limit": limit}
        if fields:
            payload["fields"] = fields

        try:
            result = self._get_client().post_find(db=target_db, selector=selector, limit=limit).get_result()
            docs: List[Dict[str, Any]] = result.get("docs", [])
            logger.debug(f"Mango query on '{target_db}' returned {len(docs)} doc(s).")
            return docs
        except Exception as exc:
            logger.error(f"Mango query failed on '{target_db}': {exc}")
            raise

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8), reraise=True)
    def delete_document(
        self,
        doc_id: str,
        rev: Optional[str] = None,
        db_name: Optional[str] = None,
    ) -> bool:
        """
        Hard-delete a document from Cloudant.

        If *rev* is not supplied, the current revision is fetched first.

        Args:
            doc_id: The ``_id`` of the document.
            rev: The current ``_rev``; fetched automatically if omitted.
            db_name: Target database.

        Returns:
            True on success, False if the document was not found.
        """
        target_db = db_name or self._default_db

        if rev is None:
            existing = self.get_document(doc_id, db_name=target_db)
            if existing is None:
                return False
            rev = existing["_rev"]

        try:
            self._get_client().delete_document(db=target_db, doc_id=doc_id, rev=rev)
            logger.info(f"Deleted document id={doc_id} from '{target_db}'.")
            return True
        except Exception as exc:
            logger.error(f"delete_document failed for id={doc_id}: {exc}")
            raise

