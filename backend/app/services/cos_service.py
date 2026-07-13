"""
EduSimplify AI – IBM Cloud Object Storage service.

Wraps the ``ibm-cos-sdk`` (boto3-compatible) client and exposes four
high-level operations:

- ``upload_file``        – store raw bytes under a given object key
- ``download_file``      – retrieve bytes for an existing object
- ``delete_file``        – permanently remove an object
- ``get_presigned_url``  – generate a time-limited download URL
"""

from __future__ import annotations

from typing import Optional

import ibm_boto3
from ibm_botocore.client import Config
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings


class COSService:
    """
    High-level wrapper around IBM Cloud Object Storage.

    Pass ``lazy=True`` (the default) to defer SDK connection until the first
    real request.  This allows the server to boot without valid credentials.
    """

    def __init__(self, lazy: bool = True) -> None:
        settings = get_settings()
        self._bucket = settings.ibm_cos_bucket_name
        self._settings = settings
        self._client = None
        if not lazy:
            self._client = self._build_client(settings)

    def _build_client(self, settings=None):
        if settings is None:
            settings = self._settings
        client = ibm_boto3.client(
            "s3",
            ibm_api_key_id=settings.ibm_cos_api_key,
            ibm_service_instance_id=settings.ibm_cos_instance_crn,
            config=Config(signature_version="oauth"),
            endpoint_url=settings.ibm_cos_endpoint,
        )
        logger.info(
            f"COSService connected – endpoint={settings.ibm_cos_endpoint}, "
            f"bucket={self._bucket}."
        )
        return client

    def _get_client(self):
        if self._client is None:
            self._client = self._build_client()
        return self._client

    # ─── Public methods ───────────────────────────────────────────────────────

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8), reraise=True)
    def upload_file(
        self,
        key: str,
        file_bytes: bytes,
        content_type: str = "application/octet-stream",
        bucket: Optional[str] = None,
    ) -> str:
        """
        Upload *file_bytes* to COS under the given *key*.

        Args:
            key: Object key (path) within the bucket.
            file_bytes: Raw bytes to store.
            content_type: MIME type of the content.
            bucket: Override bucket name (defaults to ``IBM_COS_BUCKET_NAME``).

        Returns:
            The full COS object key that was written.

        Raises:
            RuntimeError: If the upload fails after retries.
        """
        target_bucket = bucket or self._bucket
        logger.debug(f"Uploading {len(file_bytes):,} bytes → {target_bucket}/{key}.")
        try:
            self._get_client().put_object(
                Bucket=target_bucket,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
            )
            logger.info(f"COS upload successful: {target_bucket}/{key}.")
            return key
        except Exception as exc:
            logger.error(f"COS upload failed for key '{key}': {exc}")
            raise RuntimeError(f"COS upload failed: {exc}") from exc

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8), reraise=True)
    def download_file(self, key: str, bucket: Optional[str] = None) -> bytes:
        """
        Download an object from COS and return its raw bytes.

        Args:
            key: Object key within the bucket.
            bucket: Override bucket name.

        Returns:
            Raw bytes of the stored object.

        Raises:
            FileNotFoundError: If the object does not exist.
            RuntimeError: On any other storage error.
        """
        target_bucket = bucket or self._bucket
        logger.debug(f"Downloading {target_bucket}/{key}.")
        try:
            client = self._get_client()
            response = client.get_object(Bucket=target_bucket, Key=key)
            data: bytes = response["Body"].read()
            logger.info(f"COS download successful: {target_bucket}/{key} ({len(data):,} bytes).")
            return data
        except client.exceptions.NoSuchKey:
            raise FileNotFoundError(f"COS object not found: {target_bucket}/{key}")
        except Exception as exc:
            logger.error(f"COS download failed for key '{key}': {exc}")
            raise RuntimeError(f"COS download failed: {exc}") from exc

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8), reraise=True)
    def delete_file(self, key: str, bucket: Optional[str] = None) -> None:
        """
        Permanently delete an object from COS.

        Args:
            key: Object key to delete.
            bucket: Override bucket name.

        Raises:
            RuntimeError: If deletion fails after retries.
        """
        target_bucket = bucket or self._bucket
        logger.debug(f"Deleting {target_bucket}/{key}.")
        try:
            self._get_client().delete_object(Bucket=target_bucket, Key=key)
            logger.info(f"COS delete successful: {target_bucket}/{key}.")
        except Exception as exc:
            logger.error(f"COS delete failed for key '{key}': {exc}")
            raise RuntimeError(f"COS delete failed: {exc}") from exc

    def get_presigned_url(
        self,
        key: str,
        expiry: int = 3600,
        bucket: Optional[str] = None,
    ) -> str:
        """
        Generate a pre-signed URL for temporary object access.

        Args:
            key: Object key.
            expiry: URL validity in seconds (default 1 hour).
            bucket: Override bucket name.

        Returns:
            Pre-signed HTTPS URL string.

        Raises:
            RuntimeError: If URL generation fails.
        """
        target_bucket = bucket or self._bucket
        try:
            url: str = self._get_client().generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": target_bucket, "Key": key},
                ExpiresIn=expiry,
            )
            logger.debug(f"Generated presigned URL for {target_bucket}/{key} (expires in {expiry}s).")
            return url
        except Exception as exc:
            logger.error(f"Presigned URL generation failed for key '{key}': {exc}")
            raise RuntimeError(f"Presigned URL generation failed: {exc}") from exc

    def object_exists(self, key: str, bucket: Optional[str] = None) -> bool:
        """
        Check whether an object exists in COS without downloading it.

        Args:
            key: Object key.
            bucket: Override bucket name.

        Returns:
            True if the object exists, False otherwise.
        """
        target_bucket = bucket or self._bucket
        try:
            self._client.head_object(Bucket=target_bucket, Key=key)
            return True
        except Exception:
            return False
