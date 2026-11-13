"""FastAPI Application Entrypoint for Smart Agriculture AI Platform."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.api.v1.api import api_router
from app.core.config import settings
from app.services.firebase import init_firebase_admin
from app.services.firestore_repo import PersistenceUnavailableError

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("smart_agriculture")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown routines."""
    logger.info("Starting up Smart Agriculture AI backend...")
    # Attempt graceful Firebase Admin initialization
    init_firebase_admin()
    yield
    logger.info("Shutting down Smart Agriculture AI backend...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Precision Agriculture AI Platform with 4 Subsystems: "
        "1. Decision Tree Crop Recommendation, "
        "2. Mamdani Fuzzy Irrigation Advisory, "
        "3. Rule-Based Fertilizer Advisory, and "
        "4. Regression Crop Yield Prediction."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Set up CORS middleware
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.exception_handler(PersistenceUnavailableError)
async def persistence_unavailable_exception_handler(request: Request, exc: PersistenceUnavailableError):
    """Return structured 503 response when Firestore is unavailable and fallback is restricted."""
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "success": False,
            "error": "FIRESTORE_PERSISTENCE_UNAVAILABLE",
            "message": str(exc),
            "detail": "Cloud Firestore persistence is unavailable. Real Firebase Admin credentials are required.",
        },
    )


@app.get("/", include_in_schema=False)
async def root():
    """Redirect root access directly to the interactive OpenAPI documentation."""
    return RedirectResponse(url="/docs")
