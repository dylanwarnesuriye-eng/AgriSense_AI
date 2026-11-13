"""Pytest fixtures for Smart Agriculture AI backend."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app


@pytest.fixture(autouse=True, scope="session")
def setup_test_env():
    """Ensure tests run in test environment with in-memory test fallback permitted."""
    orig_env = settings.ENVIRONMENT
    orig_fallback = settings.ALLOW_IN_MEMORY_FALLBACK
    orig_mock = settings.ALLOW_MOCK_TOKENS
    settings.ENVIRONMENT = "test"
    settings.ALLOW_IN_MEMORY_FALLBACK = True
    settings.ALLOW_MOCK_TOKENS = True
    yield
    settings.ENVIRONMENT = orig_env
    settings.ALLOW_IN_MEMORY_FALLBACK = orig_fallback
    settings.ALLOW_MOCK_TOKENS = orig_mock


@pytest.fixture(autouse=True)
def reset_stores_and_caches():
    """Reset repository stores and orchestrator caches before each test."""
    from unittest.mock import patch

    from app.modules.assessment_orchestrator.orchestrator import (
        clear_orchestrator_caches,
    )
    from app.services.firestore_repo import firestore_repo

    firestore_repo.clear_in_memory_stores()
    clear_orchestrator_caches()
    with patch("app.services.firestore_repo.get_firestore_client", return_value=None):
        yield
    firestore_repo.clear_in_memory_stores()
    clear_orchestrator_caches()


@pytest.fixture
async def async_client():
    """Asynchronous HTTP test client bound to FastAPI application."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
