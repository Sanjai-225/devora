"""Devora Backend — Main application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import agent, auth, configuration, design, projects, users, workspace
from app.core.config import settings
from app.core.firebase import init_firebase
from app.models.schemas import HealthResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown."""
    logger.info("Starting Devora Backend...")
    logger.info(f"DEV_MODE: {settings.dev_mode}")
    init_firebase()
    await agent.get_agent_manager()
    yield
    logger.info("Shutting down Devora Backend...")
    await agent.shutdown_agent_manager()


app = FastAPI(
    title="Devora API",
    description="AI-powered website development platform backend",
    version="0.7.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(agent.router, prefix="/api/v1")
app.include_router(design.router, prefix="/api/v1")
app.include_router(configuration.router, prefix="/api/v1")
app.include_router(workspace.router, prefix="/api/v1")


@app.get("/api/v1/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    """Health check endpoint."""
    from app.core.firebase import get_firestore_client

    return HealthResponse(
        status="ok",
        version="0.7.0",
        dev_mode=settings.dev_mode,
        firebase_connected=get_firestore_client() is not None,
    )

