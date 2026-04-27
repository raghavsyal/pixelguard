# services/firebase.py
import json
import os
import firebase_admin
from firebase_admin import credentials, firestore

FIREBASE_CREDS_JSON = os.getenv("FIREBASE_CREDS_JSON", "")

_db = None


def get_db():
    global _db
    if _db is not None:
        return _db
    if not firebase_admin._apps:
        if FIREBASE_CREDS_JSON:
            cred = credentials.Certificate(json.loads(FIREBASE_CREDS_JSON))
        else:
            cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
    _db = firestore.client()
    return _db


def save_artwork(data: dict) -> bool:
    try:
        db = get_db()
        data["registered_at"] = firestore.SERVER_TIMESTAMP
        db.collection("artworks").document(data["asset_id"]).set(data)
        return True
    except Exception as e:
        print(f"Firestore save_artwork error: {e}")
        return False


def save_violations(asset_id: str, violations: list) -> bool:
    try:
        db = get_db()
        db.collection("artworks").document(asset_id).update({
            "violations":      violations,
            "last_scanned_at": firestore.SERVER_TIMESTAMP,
        })
        return True
    except Exception as e:
        print(f"Firestore save_violations error: {e}")
        return False


def get_artwork(asset_id: str) -> dict | None:
    try:
        db  = get_db()
        doc = db.collection("artworks").document(asset_id).get()
        return doc.to_dict() if doc.exists else None
    except Exception as e:
        print(f"Firestore get_artwork error: {e}")
        return None


def get_user_artworks(email: str) -> list:
    try:
        db   = get_db()
        docs = db.collection("artworks").where("owner_email", "==", email).stream()
        return [d.to_dict() for d in docs]
    except Exception as e:
        print(f"Firestore get_user_artworks error: {e}")
        return []
