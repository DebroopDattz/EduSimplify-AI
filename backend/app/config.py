"""
EduSimplify AI – Application configuration.

All settings are sourced from environment variables (or a .env file) via
pydantic-settings.  A single cached Settings instance is returned by
``get_settings()`` so that it is safe to call from any module without
re-reading the environment on every request.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application-wide settings loaded from environment variables.

    Values can be overridden by a ``.env`` file placed at the project root.
    See ``.env.example`` for the full list of supported keys.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── IBM watsonx.ai ────────────────────────────────────────────────────────
    watsonx_api_key: str = ""
    watsonx_project_id: str = ""
    watsonx_url: str = "https://us-south.ml.cloud.ibm.com"

    # ── IBM Cloud Object Storage ──────────────────────────────────────────────
    ibm_cos_api_key: str = ""
    ibm_cos_instance_crn: str = ""
    ibm_cos_endpoint: str = "https://s3.us-south.cloud-object-storage.appdomain.cloud"
    ibm_cos_bucket_name: str = "edusimplify-documents"

    # ── IBM Cloudant ──────────────────────────────────────────────────────────
    cloudant_url: str = ""
    cloudant_apikey: str = ""
    cloudant_db_name: str = "edusimplify"

    # ── IBM App ID ────────────────────────────────────────────────────────────
    app_id_client_id: str = ""
    app_id_client_secret: str = ""
    app_id_tenant_id: str = ""
    app_id_region: str = "us-south"

    # ── Application security ──────────────────────────────────────────────────
    secret_key: str = "change-me-in-production"

    # ── CORS ──────────────────────────────────────────────────────────────────
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Derived / computed properties ─────────────────────────────────────────

    @property
    def app_id_jwks_uri(self) -> str:
        """JWKS endpoint for IBM App ID token verification."""
        return (
            f"https://{self.app_id_region}.appid.cloud.ibm.com"
            f"/oauth/v4/{self.app_id_tenant_id}/publickeys"
        )

    @property
    def app_id_issuer(self) -> str:
        """Token issuer URI for IBM App ID."""
        return (
            f"https://{self.app_id_region}.appid.cloud.ibm.com"
            f"/oauth/v4/{self.app_id_tenant_id}"
        )

    @field_validator("secret_key")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        if v in ("change-me-in-production", "") or len(v) < 32:
            import warnings
            warnings.warn(
                "SECRET_KEY is weak or unset. Set a strong 32+ character key in production.",
                stacklevel=2,
            )
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()
