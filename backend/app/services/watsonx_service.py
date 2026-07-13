"""
EduSimplify AI – IBM watsonx.ai service.

Wraps the ``ibm-watsonx-ai`` SDK and exposes three high-level primitives:

- ``generate``         – blocking text generation via Meta Llama 3 70B
- ``generate_stream``  – async token-by-token streaming generator
- ``get_embeddings``   – vector embeddings via IBM Slate (or ST fallback)

All network calls are protected with tenacity retry logic.
"""

from __future__ import annotations

import asyncio
from typing import AsyncGenerator, List, Optional

from loguru import logger
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)
import logging

from app.config import get_settings

# ─── Model identifiers ────────────────────────────────────────────────────────

LLAMA_MODEL_ID = "meta-llama/llama-3-70b-instruct"
SLATE_EMBEDDING_MODEL_ID = "ibm/slate-30m-english-rtrvr"
SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"

# ─── Retry decorator ──────────────────────────────────────────────────────────

_RETRY_POLICY = dict(
    retry=retry_if_exception_type(Exception),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    before_sleep=before_sleep_log(logging.getLogger("tenacity"), logging.WARNING),
    reraise=True,
)


class WatsonxService:
    """
    Client wrapper around IBM watsonx.ai.

    Pass ``lazy=True`` (default) to defer IBM credential validation until the
    first real API call.  Falls back to ``sentence-transformers`` for embeddings
    when the IBM Slate model is unavailable.
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

    @retry(**_RETRY_POLICY)
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

        Args:
            prompt: The complete prompt string (system + user turns already
                    formatted as a single string or chat template).
            max_tokens: Maximum number of new tokens to generate.
            temperature: Sampling temperature (0 = deterministic).
            top_p: Nucleus sampling probability.
            stop_sequences: Optional list of strings that stop generation.

        Returns:
            The generated text as a plain string.

        Raises:
            RuntimeError: If the model call fails after retries.
        """
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
        response = model.generate_text(prompt=prompt, params=params)
        return response

    @retry(**_RETRY_POLICY)
    async def generate_stream(
        self,
        prompt: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """
        Stream generated tokens asynchronously.

        Wraps the synchronous SDK streaming iterator in an async generator
        so it can be consumed with ``async for token in service.generate_stream(…)``.

        Args:
            prompt: Complete prompt string.
            max_tokens: Maximum tokens to stream.
            temperature: Sampling temperature.

        Yields:
            Individual text tokens / partial strings as they arrive.
        """
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

    # ── Embeddings ────────────────────────────────────────────────────────────

    @retry(**_RETRY_POLICY)
    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate dense vector embeddings for a list of text strings.

        Primary: IBM Granite / Slate embedding model via watsonx.ai.
        Fallback: ``sentence-transformers`` (``all-MiniLM-L6-v2``) when the
        IBM model is unavailable or credentials are absent.

        Args:
            texts: List of strings to embed (max ~512 tokens each).

        Returns:
            List of float vectors, one per input text.
        """
        try:
            return self._get_ibm_embeddings(texts)
        except Exception as exc:
            logger.warning(f"IBM embedding failed ({exc}); falling back to sentence-transformers.")
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
        """Fallback: sentence-transformers local model."""
        if self._st_model is None:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading sentence-transformers model: {SENTENCE_TRANSFORMER_MODEL}")
            self._st_model = SentenceTransformer(SENTENCE_TRANSFORMER_MODEL)
        embeddings = self._st_model.encode(texts, show_progress_bar=False)
        vectors = embeddings.tolist()
        logger.debug(f"ST embeddings: {len(vectors)} vectors of dim {len(vectors[0])}.")
        return vectors
