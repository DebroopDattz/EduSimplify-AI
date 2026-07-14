"""
EduSimplify AI – Local file-based mock of IBM Cloudant service.

Provides a fully offline, local JSON file-based database implementation matching the 
CloudantService interface. This eliminates the need for any external database platform 
for demo and submission purposes.
"""

from __future__ import annotations

import os
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from loguru import logger

class CloudantService:
    """
    Local file-based document store that acts as a drop-in replacement for IBM Cloudant.
    Stores all collection data inside a local 'local_db.json' file.
    """

    def __init__(self, lazy: bool = True) -> None:
        self._db_path = "./local_db.json"
        logger.info(f"Using local file-based database at '{self._db_path}' (IBM Cloudant bypassed).")
        # Ensure the file exists
        if not os.path.exists(self._db_path):
            self._write_db({})

    def _read_db(self) -> Dict[str, Any]:
        try:
            if os.path.exists(self._db_path):
                with open(self._db_path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as exc:
            logger.error(f"Failed to read local database: {exc}")
        return {}

    def _write_db(self, data: Dict[str, Any]) -> None:
        try:
            with open(self._db_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as exc:
            logger.error(f"Failed to write local database: {exc}")

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    # ─── Public API ───────────────────────────────────────────────────────────

    def create_document(
        self,
        doc: Dict[str, Any],
        db_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        db = self._read_db()
        target_db = db_name or "edusimplify"
        
        if target_db not in db:
            db[target_db] = {}

        if "_id" not in doc:
            doc["_id"] = str(uuid.uuid4())
        doc.setdefault("created_at", self._now_iso())
        doc["updated_at"] = self._now_iso()
        doc["_rev"] = f"1-{uuid.uuid4().hex[:8]}"

        db[target_db][doc["_id"]] = doc
        self._write_db(db)
        logger.debug(f"Created local document id={doc['_id']} in '{target_db}'.")
        return {"id": doc["_id"], "rev": doc["_rev"], "ok": True}

    def get_document(
        self,
        doc_id: str,
        db_name: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        db = self._read_db()
        target_db = db_name or "edusimplify"
        
        doc = db.get(target_db, {}).get(doc_id)
        if doc:
            return dict(doc)
        return None

    def update_document(
        self,
        doc_id: str,
        updates: Dict[str, Any],
        db_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        db = self._read_db()
        target_db = db_name or "edusimplify"
        
        existing = db.get(target_db, {}).get(doc_id)
        if existing is None:
            raise FileNotFoundError(f"Document '{doc_id}' not found in '{target_db}'.")

        merged = {**existing, **updates, "_id": doc_id}
        merged["updated_at"] = self._now_iso()
        merged["_rev"] = f"2-{uuid.uuid4().hex[:8]}"

        db[target_db][doc_id] = merged
        self._write_db(db)
        logger.debug(f"Updated local document id={doc_id} in '{target_db}'.")
        return {"id": doc_id, "rev": merged["_rev"], "ok": True}

    def query_documents(
        self,
        selector: Dict[str, Any],
        fields: Optional[List[str]] = None,
        limit: int = 25,
        db_name: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        db = self._read_db()
        target_db = db_name or "edusimplify"
        docs = list(db.get(target_db, {}).values())

        # Simple selector matching (Mango style)
        results = []
        for doc in docs:
            match = True
            for key, val in selector.items():
                doc_val = doc.get(key)
                if isinstance(val, dict):
                    if "$eq" in val:
                        target_val = val["$eq"]
                    else:
                        target_val = val
                else:
                    target_val = val

                if doc_val != target_val:
                    match = False
                    break
            
            if match:
                if fields:
                    filtered_doc = {f: doc.get(f) for f in fields if f in doc}
                    if "_id" in fields and "_id" not in filtered_doc:
                        filtered_doc["_id"] = doc["_id"]
                    results.append(filtered_doc)
                else:
                    results.append(dict(doc))

        results.sort(key=lambda d: d.get("uploaded_at", ""), reverse=True)
        return results[:limit]

    def delete_document(
        self,
        doc_id: str,
        rev: Optional[str] = None,
        db_name: Optional[str] = None,
    ) -> bool:
        db = self._read_db()
        target_db = db_name or "edusimplify"
        
        if target_db in db and doc_id in db[target_db]:
            del db[target_db][doc_id]
            self._write_db(db)
            logger.info(f"Deleted local document id={doc_id} from '{target_db}'.")
            return True
        return False
