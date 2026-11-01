"""Devora Backend — Firestore project service alias (`firestore_service`).

Re-exports `project_service` functions (`create_project`, `get_project`,
`list_projects`, `update_project`, `delete_project`) for modules importing
`firestore_service`.
"""

from app.services.project_service import (
    create_project,
    delete_project,
    get_project,
    list_projects,
    update_project,
)

__all__ = [
    "create_project",
    "get_project",
    "list_projects",
    "update_project",
    "delete_project",
]
