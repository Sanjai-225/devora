"""Devora Backend — Firebase initialization."""

import logging
from typing import Optional

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, firestore

from app.core.config import settings

logger = logging.getLogger(__name__)

_firebase_app: Optional[firebase_admin.App] = None
_firestore_client = None


def init_firebase() -> None:
    """Initialize Firebase Admin SDK."""
    global _firebase_app, _firestore_client

    if settings.dev_mode and not settings.firebase_project_id:
        logger.warning(
            "DEV_MODE: Firebase not configured. Using in-memory mock services."
        )
        return

    try:
        if settings.firebase_service_account_path:
            cred = credentials.Certificate(settings.firebase_service_account_path)
        else:
            cred = credentials.ApplicationDefault()

        _firebase_app = firebase_admin.initialize_app(
            cred, {"projectId": settings.firebase_project_id}
        )
        _firestore_client = firestore.client()
        logger.info("Firebase initialized successfully.")
    except Exception as e:
        logger.error(f"Firebase initialization failed: {e}")
        if not settings.dev_mode:
            raise


def get_firestore_client():
    """Get the Firestore client."""
    if _firestore_client is None and not settings.dev_mode:
        raise RuntimeError("Firestore client not initialized")
    return _firestore_client


async def verify_firebase_token(token: str) -> Optional[dict]:
    """Verify a Firebase ID token and return the decoded claims."""
    if settings.dev_mode and not _firebase_app:
        # In dev mode without Firebase, return a mock user
        return {
            "uid": "dev-user-001",
            "email": "dev@devora.local",
            "name": "Dev User",
            "picture": None,
        }

    try:
        decoded = firebase_auth.verify_id_token(token, app=_firebase_app)
        return decoded
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        return None

