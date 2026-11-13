"""Tests for the health check endpoint."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check_returns_200(async_client: AsyncClient):
    """Verify that /api/v1/health responds with 200 OK and healthy status."""
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "environment" in data
    assert "timestamp" in data

    # Verify all 4 AI modules are reported
    modules = data["modules"]
    assert "crop_recommendation" in modules
    assert "irrigation_advisory" in modules
    assert "fertilizer_advisory" in modules
    assert "yield_prediction" in modules
