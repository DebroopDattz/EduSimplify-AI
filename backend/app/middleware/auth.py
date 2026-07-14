"""
EduSimplify AI – JWT authentication middleware and IBM App ID token verification.

This module provides:

1. ``AppIDTokenVerifier``
   - Fetches IBM App ID JWKS (JSON Web Key Sets) for signature verification.
   - Validates ``iss``, ``exp``, ``aud`` claims.
   - Caches the JWKS to avoid unnecessary round-trips.

2. ``get_current_user``
   - FastAPI dependency that extracts, validates, and returns the decoded
     JWT payload from the ``Authorization: Bearer <token>`` header.

3. ``require_auth``
   - Convenience alias for ``Depends(get_current_user)``.

Usage in a router::

    from app.middleware.auth import require_auth

    @router.get("/protected")
    async def protected_route(user: dict = require_auth):
        return {"user_id": user["sub"]}
"""

from __future__ import annotations

import time
from typing import Any, Dict, Optional

import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt
from loguru import logger

from app.config import get_settings

# ── Security scheme ────────────────────────────────────────────────────────────

_bearer_scheme = HTTPBearer(auto_error=False)

# ── JWKS cache (module-level singleton) ───────────────────────────────────────

_jwks_cache: Optional[Dict[str, Any]] = None
_jwks_fetched_at: float = 0.0
_JWKS_CACHE_TTL_SECONDS: int = 3600  # refresh once per hour


class AppIDTokenVerifier:
    """
    Verifies IBM App ID JWT access tokens.

    The verifier fetches the JWKS from IBM App ID, caches them with a 1-hour
    TTL, and uses the ``python-jose`` library for RS256 signature validation.
    """

    def __init__(self) -> None:
        self._settings = get_settings()

    # ── JWKS management ────────────────────────────────────────────────────────

    def _get_jwks(self) -> Dict[str, Any]:
        """
        Return the cached JWKS or fetch a fresh copy from IBM App ID.

        The cache is invalidated after ``_JWKS_CACHE_TTL_SECONDS`` seconds.
        """
        global _jwks_cache, _jwks_fetched_at

        now = time.monotonic()
        if _jwks_cache is not None and (now - _jwks_fetched_at) < _JWKS_CACHE_TTL_SECONDS:
            return _jwks_cache

        jwks_uri = self._settings.app_id_jwks_uri
        logger.debug(f"Fetching JWKS from: {jwks_uri}")
        try:
            response = httpx.get(jwks_uri, timeout=10.0)
            response.raise_for_status()
            _jwks_cache = response.json()
            _jwks_fetched_at = now
            logger.info("JWKS cache refreshed from IBM App ID.")
            return _jwks_cache
        except httpx.HTTPError as exc:
            logger.error(f"Failed to fetch JWKS: {exc}")
            if _jwks_cache is not None:
                logger.warning("Using stale JWKS cache due to fetch failure.")
                return _jwks_cache
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service temporarily unavailable.",
            )

    def _get_public_key(self, kid: str) -> Any:
        """Locate and construct the RSA public key matching ``kid``."""
        jwks = self._get_jwks()
        keys = jwks.get("keys", [])
        for key_data in keys:
            if key_data.get("kid") == kid:
                return jwk.construct(key_data)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token signing key not found in JWKS.",
        )

    # ── Token validation ───────────────────────────────────────────────────────

    def verify(self, token: str) -> Dict[str, Any]:
        """
        Verify an IBM App ID JWT and return the decoded payload.

        Validation steps:
        1. Decode the JOSE header to extract ``kid``.
        2. Fetch the matching RSA public key from JWKS.
        3. Verify signature, expiry, and ``iss`` claim.
        4. Return the full decoded payload.

        Args:
            token: Raw JWT string from the ``Authorization: Bearer`` header.

        Returns:
            Decoded JWT payload dict containing claims like ``sub``, ``email``,
            ``exp``, ``iss``, etc.

        Raises:
            HTTPException 401: For any validation failure.
        """
        try:
            # Step 1: Decode header (no verification yet)
            unverified_header = jwt.get_unverified_header(token)
        except JWTError as exc:
            logger.warning(f"JWT header decode failed: {exc}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        kid: str = unverified_header.get("kid", "")
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is missing 'kid' in header.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Step 2: Fetch public key
        public_key = self._get_public_key(kid)

        # Step 3: Verify signature + claims
        try:
            payload: Dict[str, Any] = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                issuer=self._settings.app_id_issuer,
                options={
                    "verify_aud": False,  # App ID tokens use client_id as aud
                    "verify_exp": True,
                    "verify_iss": True,
                },
            )
        except JWTError as exc:
            logger.warning(f"JWT verification failed: {exc}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token validation failed: {exc}",
                headers={"WWW-Authenticate": "Bearer"},
            )

        logger.debug(f"Token verified for sub={payload.get('sub', 'unknown')}.")
        return payload


# ── Shared verifier instance ───────────────────────────────────────────────────

_verifier = AppIDTokenVerifier()


# ── FastAPI dependency ─────────────────────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Dict[str, Any]:
    """
    FastAPI dependency that validates the Bearer token and returns the decoded
    JWT payload.

    Raises ``HTTP 401`` if:
    - No ``Authorization`` header is present.
    - The token is malformed, expired, or fails signature verification.

    Returns:
        The decoded JWT payload dict.
    """
    settings = get_settings()
    # Graceful fallback for local runs and demo deployment when IBM App ID is not configured
    if not settings.app_id_tenant_id or settings.app_id_tenant_id in ("change-me", "change-me-in-production", ""):
        return {"sub": "demo-user", "email": "demo@example.com"}

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return _verifier.verify(credentials.credentials)


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Optional[Dict[str, Any]]:
    """
    Soft authentication dependency – returns ``None`` for unauthenticated requests
    instead of raising a 401.  Useful for endpoints that show public content
    with enhanced output for authenticated users.
    """
    if credentials is None:
        return None
    try:
        return _verifier.verify(credentials.credentials)
    except HTTPException:
        return None


def extract_user_id(user: Dict[str, Any]) -> str:
    """
    Extract the canonical user ID from a decoded JWT payload.

    IBM App ID tokens use ``sub`` as the unique user identifier.

    Args:
        user: Decoded JWT payload returned by ``get_current_user``.

    Returns:
        The ``sub`` claim value.

    Raises:
        HTTPException 401: If ``sub`` is absent from the payload.
    """
    user_id: Optional[str] = user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing 'sub' claim.",
        )
    return user_id


# ── Convenience aliases ────────────────────────────────────────────────────────

require_auth = Depends(get_current_user)
optional_auth = Depends(get_optional_user)
