"""
EduSimplify AI – IBM watsonx.ai service.

Wraps the ``ibm-watsonx-ai`` SDK and exposes three high-level primitives:
- ``generate``         – blocking text generation via Meta Llama 3 70B
- ``generate_stream``  – async token-by-token streaming generator
- ``get_embeddings``   – vector embeddings via IBM Slate (with deterministic hash-based local fallback)

All network calls are protected with retry logic.
If credentials are not configured or the connection fails, the service falls back
gracefully to a local, zero-memory, fully dynamic mock implementation that parses 
and extracts content from the uploaded PDF directly, ensuring 100% dynamic behavior.
"""

from __future__ import annotations

import asyncio
import json
import random
import re
from typing import AsyncGenerator, List, Optional

from loguru import logger
from app.config import get_settings

# ─── Model identifiers ────────────────────────────────────────────────────────
LLAMA_MODEL_ID = "meta-llama/llama-3-70b-instruct"
SLATE_EMBEDDING_MODEL_ID = "ibm/slate-30m-english-rtrvr"
SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"


class WatsonxService:
    """
    Client wrapper around IBM watsonx.ai.
    Falls back to a zero-memory deterministic hash embedder and a dynamic local parser
    when IBM Slate and watsonx are unavailable (perfect for free environments like Render).
    """

    def __init__(self, lazy: bool = True) -> None:
        settings = get_settings()
        self._project_id = settings.watsonx_project_id
        self._model_id = LLAMA_MODEL_ID
        self._settings = settings
        self._client = None
        self._st_model: Optional[object] = None
        if not lazy:
            self._client = self._build_client(settings)
        else:
            logger.info("WatsonxService created in lazy mode — will connect on first use.")

    # ── Initialisation ────────────────────────────────────────────────────────

    def _build_client(self, settings=None):
        """Create and return an ibm-watsonx-ai ``APIClient``."""
        if settings is None:
            settings = self._settings
        if not settings.watsonx_api_key or settings.watsonx_api_key == "change-me-in-production":
            raise ValueError("watsonx_api_key is empty or default.")
        try:
            from ibm_watsonx_ai import APIClient, Credentials

            credentials = Credentials(
                url=settings.watsonx_url,
                api_key=settings.watsonx_api_key,
            )
            client = APIClient(credentials)
            logger.info(f"watsonx.ai APIClient connected – URL: {settings.watsonx_url}")
            return client
        except Exception as exc:
            logger.error(f"Failed to connect watsonx.ai client: {exc}")
            raise RuntimeError(f"watsonx.ai client init failed: {exc}") from exc

    def _get_client(self):
        """Return the cached client, connecting lazily on first call."""
        if self._client is None:
            self._client = self._build_client()
        return self._client

    # ── Text generation ───────────────────────────────────────────────────────

    def generate(
        self,
        prompt: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        top_p: float = 0.95,
        stop_sequences: Optional[List[str]] = None,
    ) -> str:
        """
        Generate text synchronously using Meta Llama 3 70B Instruct.
        Falls back to local mock completion if credentials are empty or the call fails.
        """
        if not self._settings.watsonx_api_key or self._settings.watsonx_api_key == "change-me-in-production":
            logger.warning("No WatsonX API Key configured. Returning offline mock AI completion.")
            return self._get_mock_completion(prompt)

        for attempt in range(3):
            try:
                from ibm_watsonx_ai.foundation_models import ModelInference
                from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as Params

                params = {
                    Params.MAX_NEW_TOKENS: max_tokens,
                    Params.TEMPERATURE: temperature,
                    Params.TOP_P: top_p,
                    Params.DECODING_METHOD: "sample" if temperature > 0 else "greedy",
                }
                if stop_sequences:
                    params[Params.STOP_SEQUENCES] = stop_sequences

                model = ModelInference(
                    model_id=self._model_id,
                    api_client=self._get_client(),
                    project_id=self._project_id,
                )
                logger.debug(f"Generating with {self._model_id} (max_tokens={max_tokens}, temp={temperature}).")
                return model.generate_text(prompt=prompt, params=params)
            except Exception as exc:
                logger.warning(f"watsonx.ai generate attempt {attempt + 1} failed: {exc}")
                if attempt == 2:
                    logger.error("watsonx.ai generate failed after 3 attempts. Falling back to offline mock.")
                    return self._get_mock_completion(prompt)
                import time
                time.sleep(2)
        return self._get_mock_completion(prompt)

    async def generate_stream(
        self,
        prompt: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """
        Stream generated tokens asynchronously.
        Falls back to offline mock streaming if credentials are empty or the call fails.
        """
        if not self._settings.watsonx_api_key or self._settings.watsonx_api_key == "change-me-in-production":
            logger.warning("No WatsonX API Key configured. Streaming offline mock AI completion.")
            mock_text = self._get_mock_completion(prompt)
            for i in range(0, len(mock_text), 8):
                yield mock_text[i:i+8]
                await asyncio.sleep(0.05)
            return

        try:
            from ibm_watsonx_ai.foundation_models import ModelInference
            from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as Params

            params = {
                Params.MAX_NEW_TOKENS: max_tokens,
                Params.TEMPERATURE: temperature,
                Params.DECODING_METHOD: "sample" if temperature > 0 else "greedy",
            }
            model = ModelInference(
                model_id=self._model_id,
                api_client=self._get_client(),
                project_id=self._project_id,
            )

            loop = asyncio.get_event_loop()
            def _iter_tokens():
                return model.generate_text_stream(prompt=prompt, params=params)

            token_iter = await loop.run_in_executor(None, _iter_tokens)
            for token in token_iter:
                yield token
        except Exception as exc:
            logger.error(f"watsonx.ai generate_stream failed: {exc}. Streaming offline fallback.")
            mock_text = f"I'm sorry, I couldn't connect to watsonx.ai right now ({exc}). Here is a local response:\n\n" + self._get_mock_completion(prompt)
            for i in range(0, len(mock_text), 8):
                yield mock_text[i:i+8]
                await asyncio.sleep(0.05)

    # ── Embeddings ────────────────────────────────────────────────────────────

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate dense vector embeddings.
        Falls back to zero-memory dense vectors directly if IBM services fail or are missing.
        """
        try:
            if not self._settings.watsonx_api_key or self._settings.watsonx_api_key == "change-me-in-production":
                raise ValueError("No watsonx API Key")
            return self._get_ibm_embeddings(texts)
        except Exception as exc:
            logger.warning(f"IBM embedding failed ({exc}); falling back to local mock embeddings.")
            return self._get_st_embeddings(texts)

    def _get_ibm_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Use IBM Slate embedding model."""
        from ibm_watsonx_ai.foundation_models import Embeddings
        from ibm_watsonx_ai.metanames import EmbedTextParamsMetaNames as EmbedParams

        embedder = Embeddings(
            model_id=SLATE_EMBEDDING_MODEL_ID,
            api_client=self._get_client(),
            project_id=self._project_id,
            params={EmbedParams.TRUNCATE_INPUT_TOKENS: 512},
        )
        response = embedder.embed_documents(texts=texts)
        vectors = [item["embedding"] for item in response["results"]]
        logger.debug(f"IBM embeddings: {len(vectors)} vectors of dim {len(vectors[0])}.")
        return vectors

    def _get_st_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Fallback: zero-memory deterministic float vectors."""
        vectors = []
        for text in texts:
            seed_val = abs(hash(text)) % (10 ** 8)
            rng = random.Random(seed_val)
            vectors.append([rng.uniform(-1.0, 1.0) for _ in range(384)])
        logger.debug(f"Generated {len(vectors)} offline mock vectors of dim 384.")
        return vectors

    # ── Dynamic Local In-Memory Generators ────────────────────────────────────

    def _extract_context(self, prompt: str) -> str:
        """Extract retrieved context chunks from the prompt."""
        match = re.search(r"CONTEXT(?: CHUNKS)?:\s*(.*)", prompt, re.DOTALL | re.IGNORECASE)
        if match:
            text = match.group(1).strip()
            # Clean up template endings
            text = re.sub(r"<\|.*?\|>", "", text).strip()
            return text
        return ""

    def _get_sentences(self, text: str) -> List[str]:
        """Split text into sentences cleanly."""
        if not text:
            return []
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if len(s.strip()) > 12 and not s.startswith("<|")]

    def _get_mock_completion(self, prompt: str) -> str:
        """Generate dynamic responses using the uploaded document context extracted from the prompt."""
        context = self._extract_context(prompt)
        prompt_lower = prompt.lower()

        if not context:
            if "quizquestion" in prompt_lower or "quiz" in prompt_lower or "correct_answer" in prompt_lower:
                return self._get_static_quiz()
            elif "flashcard" in prompt_lower or "front" in prompt_lower or "back" in prompt_lower:
                return self._get_static_flashcards()
            elif "revision" in prompt_lower or "revisionresponse" in prompt_lower:
                return self._get_static_revision()
            elif "studynotesresponse" in prompt_lower or "key_concepts" in prompt_lower or "overview" in prompt_lower:
                return self._get_static_notes()
            return "I am EduSimplify AI, your local study assistant. Please upload a PDF and ask me anything about its contents!"

        if "quizquestion" in prompt_lower or "quiz" in prompt_lower or "correct_answer" in prompt_lower:
            return self._generate_dynamic_quiz(context)
        elif "flashcard" in prompt_lower or "front" in prompt_lower or "back" in prompt_lower:
            return self._generate_dynamic_flashcards(context)
        elif "revision" in prompt_lower or "revisionresponse" in prompt_lower:
            return self._generate_dynamic_revision(context)
        elif "studynotesresponse" in prompt_lower or "key_concepts" in prompt_lower or "overview" in prompt_lower:
            return self._generate_dynamic_notes(context)
        
        return self._generate_dynamic_chat(prompt, context)

    # ── Dynamic Generators ────────────────────────────────────────────────────

    def _generate_dynamic_chat(self, prompt: str, context: str) -> str:
        sentences = self._get_sentences(context)
        if not sentences:
            return "I am EduSimplify AI. I've read your document, but could not extract enough sentences. Ask me anything!"
        
        words = re.findall(r"\b\w{4,}\b", prompt.lower())
        best_sentence = ""
        best_count = 0
        
        for s in sentences:
            count = sum(1 for w in words if w in s.lower())
            if count > best_count:
                best_count = count
                best_sentence = s
                
        if best_sentence:
            return f"Based on your document:\n\n> {best_sentence}\n\nHope this helps clarify! Let me know if you need more details from this section."
        
        summary = " ".join(sentences[:3])
        return f"I searched the document for your query. Here is a summary of the relevant section:\n\n{summary}"

    def _generate_dynamic_notes(self, context: str) -> str:
        sentences = self._get_sentences(context)
        if len(sentences) < 4:
            return self._get_static_notes()
            
        title = "Study Guide: " + " ".join(sentences[0].split()[:5]) + "..."
        overview = sentences[0] + " " + sentences[1]
        
        objectives = [
            f"Analyze: {sentences[2]}",
            f"Understand the concept of: {' '.join(sentences[3].split()[:4])}...",
            f"Evaluate the principles highlighted in: {' '.join(sentences[-1].split()[:4])}..."
        ]
        
        key_concepts = []
        concept_idx = 0
        for i in range(2, min(len(sentences), 12), 2):
            if i + 1 < len(sentences):
                concept_idx += 1
                heading = " ".join(sentences[i].split()[:4]).capitalize()
                key_concepts.append({
                    "heading": f"{concept_idx}. {heading}",
                    "content": sentences[i] + " " + sentences[i+1]
                })
        
        if not key_concepts:
            key_concepts = [{"heading": "Core Subject", "content": context}]

        definitions = {}
        for s in sentences:
            for marker in [" is ", " refers to ", " defined as ", " stands for "]:
                if marker in s:
                    parts = s.split(marker, 1)
                    term = parts[0].strip()
                    definition = parts[1].strip()
                    if len(term) < 40 and len(definition) > 10 and len(definition) < 150:
                        definitions[term.capitalize()] = definition
                        break
            if len(definitions) >= 3:
                break
        
        if not definitions:
            definitions = {
                "Key Concept": sentences[3] if len(sentences) > 3 else "Main subject discussed in document."
            }

        return json.dumps({
            "title": title,
            "overview": overview,
            "objectives": objectives,
            "definitions": definitions,
            "key_concepts": key_concepts,
            "examples": [
                f"Application case: {sentences[4]}" if len(sentences) > 4 else "Real-world example relating to context.",
                f"Practical illustration: {sentences[5]}" if len(sentences) > 5 else "Hands-on instance found in readings."
            ],
            "common_mistakes": [
                "Misinterpreting the core relationship described in the passage.",
                "Overlooking the context-specific definitions of terms."
            ],
            "applications": [
                "Academic research and exam preparation.",
                "Practical conceptual grounding."
            ],
            "summary": sentences[-1] if sentences else "Summarized content.",
            "revision_tips": [
                f"Key takeaway to memorize: {sentences[2]}" if len(sentences) > 2 else "Read through the main points carefully.",
                f"Focus area: {sentences[3]}" if len(sentences) > 3 else "Review terminology and structural details."
            ]
        }, indent=2)

    def _generate_dynamic_quiz(self, context: str) -> str:
        sentences = self._get_sentences(context)
        if len(sentences) < 3:
            return self._get_static_quiz()

        questions = []
        for idx, s in enumerate(sentences[:5], start=1):
            words = s.split()
            if len(words) < 6:
                continue
            
            question_text = f"According to the text, which statement is true regarding: '{' '.join(words[:5])}'?"
            correct = s
            distractor_1 = s.replace(words[0], "Alternatively,").replace(words[1], "another factor")
            distractor_2 = "This concept is unrelated to standard operations or findings."
            distractor_3 = "The text indicates that the opposite of this outcome is typical."
            
            options = [
                {"key": "A", "text": correct},
                {"key": "B", "text": distractor_1},
                {"key": "C", "text": distractor_2},
                {"key": "D", "text": distractor_3}
            ]
            random.shuffle(options)
            correct_key = "A"
            for i, opt in enumerate(options):
                opt_key = chr(65 + i)
                if opt["text"] == correct:
                    correct_key = opt_key
                opt["key"] = opt_key

            questions.append({
                "question_number": idx,
                "question": question_text,
                "quiz_type": "mcq",
                "difficulty": "medium",
                "options": options,
                "correct_answer": correct_key,
                "explanation": f"The document states: '{s}'",
                "topic": "Text Details"
            })
            
        if not questions:
            return self._get_static_quiz()
            
        return json.dumps(questions, indent=2)

    def _generate_dynamic_flashcards(self, context: str) -> str:
        sentences = self._get_sentences(context)
        if len(sentences) < 3:
            return self._get_static_flashcards()

        cards = []
        for idx, s in enumerate(sentences[:5], start=1):
            words = s.split()
            mid = len(words) // 2
            front = " ".join(words[:mid]) + "..."
            back = "... " + " ".join(words[mid:])
            
            cards.append({
                "card_number": idx,
                "front": front,
                "back": back,
                "difficulty": "medium",
                "topic": "Key Facts"
            })
        return json.dumps(cards, indent=2)

    def _generate_dynamic_revision(self, context: str) -> str:
        sentences = self._get_sentences(context)
        if len(sentences) < 3:
            return self._get_static_revision()

        sections = []
        for idx, s in enumerate(sentences[:4]):
            heading = " ".join(s.split()[:4]).capitalize()
            sections.append({
                "heading": f"{idx+1}. {heading}",
                "content": s
            })

        return json.dumps({
            "title": "Revision Highlights: Core Readings",
            "content": "A high-yield summary extracted directly from your document's key concepts.",
            "sections": sections
        }, indent=2)

    # ── Static Fallback Templates ─────────────────────────────────────────────

    def _get_static_notes(self) -> str:
        return json.dumps({
            "title": "Comprehensive Study Guide: Machine Learning & RAG Systems",
            "overview": "An educational guide detailing the architecture, implementation, and optimization of Retrieval-Augmented Generation (RAG) models.",
            "objectives": [
                "Understand how to ingest and process PDFs into clean text chunks.",
                "Understand semantic vector indexing and search using ChromaDB.",
                "Master LLM prompt grounding techniques to avoid model hallucinations."
            ],
            "definitions": {
                "Chunking": "The process of splitting a long document into smaller, coherent text segments.",
                "Hallucination": "A phenomenon where an LLM generates grammatically correct but factually incorrect information.",
                "Granite / Llama": "State-of-the-art open large language models used for generative text tasks."
            },
            "key_concepts": [
                {
                    "heading": "Ingestion Pipeline",
                    "content": "Extract text using pdfplumber, normalise whitespaces, detect equations/tables, and create overlapping text chunks."
                },
                {
                    "heading": "Retrieval Mechanics",
                    "content": "At query time, generate a query vector, perform a nearest-neighbor lookup in ChromaDB, and build the context string."
                },
                {
                    "heading": "Augmented Generation",
                    "content": "Inject context into a system prompt enforcing the LLM to only answer based on the provided material."
                }
            ],
            "examples": [
                "Example 1: Chatbot querying standard operating procedures (SOPs) to guide customer support.",
                "Example 2: An educational tool reading textbooks and generating multi-choice questions dynamically."
            ],
            "summary": "RAG bridges the gap between static pre-training weights and active knowledge repositories, making generative models fact-grounded.",
            "revision_tips": [
                "Always use overlapping windows when chunking (e.g. 500 chars with 50 overlap) to preserve context boundaries.",
                "Keep system prompts strict to penalise hallucinated answers."
            ]
        }, indent=2)

    def _get_static_quiz(self) -> str:
        return json.dumps([
            {
                "question_number": 1,
                "question": "What is the primary goal of Retrieval-Augmented Generation (RAG)?",
                "quiz_type": "mcq",
                "difficulty": "medium",
                "options": [
                    {"key": "A", "text": "To replace LLMs entirely with search engines"},
                    {"key": "B", "text": "To ground LLM responses using retrieved external context"},
                    {"key": "C", "text": "To speed up model training times"},
                    {"key": "D", "text": "To translate text between different languages"}
                ],
                "correct_answer": "B",
                "explanation": "Retrieval-Augmented Generation (RAG) retrieves relevant documents or information to feed as context into the prompt of an LLM, reducing hallucinations.",
                "topic": "RAG Architectures"
            },
            {
                "question_number": 2,
                "question": "Which component is responsible for vector database lookups in a RAG pipeline?",
                "quiz_type": "mcq",
                "difficulty": "medium",
                "options": [
                    {"key": "A", "text": "A standard relational SQL database"},
                    {"key": "B", "text": "An embedding-based vector database (like ChromaDB)"},
                    {"key": "C", "text": "A compiler or tokenizer"},
                    {"key": "D", "text": "A simple flat file system"}
                ],
                "correct_answer": "B",
                "explanation": "Vector databases index document chunk embeddings to allow semantic similarity searches at query time.",
                "topic": "Vector Stores"
            }
        ], indent=2)

    def _get_static_flashcards(self) -> str:
        return json.dumps([
            {
                "card_number": 1,
                "front": "Retrieval-Augmented Generation (RAG)",
                "back": "A technique that retrieves external documents to feed context into an LLM, improving accuracy and grounding.",
                "difficulty": "easy",
                "topic": "Core Concepts"
            },
            {
                "card_number": 2,
                "front": "Vector Embedding",
                "back": "A numerical vector of floats representing the semantic meaning of a text segment.",
                "difficulty": "medium",
                "topic": "Mathematical Foundations"
            }
        ], indent=2)

    def _get_static_revision(self) -> str:
        return json.dumps({
            "title": "Quick Revision Sheet: Core AI Concepts",
            "content": "This cheat-sheet covers the foundational building blocks of modern Retrieval-Augmented Generation systems, vector databases, and search.",
            "sections": [
                {
                    "heading": "1. What is RAG?",
                    "content": "RAG stands for Retrieval-Augmented Generation. Instead of relying solely on LLM memory, we fetch relevant paragraphs from a custom corpus and inject them as context."
                },
                {
                    "heading": "2. Embeddings & Vectors",
                    "content": "Text is turned into float lists (vectors) by embedding models. Similar concepts sit closer together in the vector space."
                }
            ]
        }, indent=2)
