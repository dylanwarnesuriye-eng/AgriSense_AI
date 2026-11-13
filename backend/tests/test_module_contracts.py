"""Tests for AI Module architectural constraints and API contracts."""
import pytest
from httpx import AsyncClient

from app.modules.crop_recommendation.constants import SUPPORTED_RECOMMENDATION_CROPS
from app.modules.yield_prediction.constants import (
    SUPPORTED_YIELD_CROPS,
)


@pytest.mark.asyncio
async def test_crop_recommendation_supports_22_crops(async_client: AsyncClient):
    """Verify that crop recommendation supports exactly 22 crops."""
    assert len(SUPPORTED_RECOMMENDATION_CROPS) == 22
    response = await async_client.get("/api/v1/crops/crops")
    assert response.status_code == 200
    crops = response.json()["data"]
    assert len(crops) == 22
    assert "rice" in crops
    assert "maize" in crops


@pytest.mark.asyncio
async def test_crop_recommendation_inference_contract(async_client: AsyncClient):
    """Verify crop recommendation endpoint contract."""
    payload = {
        "nitrogen": 90.0,
        "phosphorus": 42.0,
        "potassium": 43.0,
        "temperature": 20.8,
        "humidity": 82.0,
        "ph": 6.5,
        "rainfall": 202.9,
    }
    response = await async_client.post("/api/v1/crops/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "recommended_crop" in data
    assert data["recommended_crop"] in SUPPORTED_RECOMMENDATION_CROPS


@pytest.mark.asyncio
async def test_yield_prediction_supported_crops_and_pathway(async_client: AsyncClient):
    """Verify yield prediction crop whitelist and integrated pathway boundaries."""
    assert len(SUPPORTED_YIELD_CROPS) == 5
    assert set(SUPPORTED_YIELD_CROPS) == {"wheat", "barley", "corn", "rice", "soybean"}

    response = await async_client.get("/api/v1/yield/supported-crops")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total_supported"] == 5
    assert set(data["supported_crops"]) == {"wheat", "barley", "corn", "rice", "soybean"}
    # Only Rice and Maize/Corn have an integrated pathway
    assert "rice" in data["integrated_pathway_crops"]
    assert ("corn" in data["integrated_pathway_crops"] or "maize" in data["integrated_pathway_crops"])


@pytest.mark.asyncio
async def test_yield_prediction_rejects_unsupported_crop(async_client: AsyncClient):
    """Strict Constraint Test: Yield prediction MUST reject unsupported crops (e.g. apple, mango)."""
    payload = {
        "crop_name": "apple",  # Unsupported crop for yield prediction
        "area_hectares": 10.0,
        "annual_rainfall_mm": 1200.0,
    }
    response = await async_client.post("/api/v1/yield/predict", json=payload)
    # Pydantic field validator or route error should reject with 422 Unprocessable Entity
    assert response.status_code == 422
    error_msg = str(response.json())
    assert "not supported for yield prediction" in error_msg.lower()


@pytest.mark.asyncio
async def test_yield_prediction_accepts_supported_crop(async_client: AsyncClient):
    """Verify that a supported crop (e.g. wheat) passes validation."""
    payload = {
        "crop_name": "wheat",
        "area_hectares": 5.0,
        "annual_rainfall_mm": 650.0,
    }
    response = await async_client.post("/api/v1/yield/predict", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["crop_name"].lower() == "wheat"
    assert data["units_verified"] is False  # Explicitly requires verification per guidelines


@pytest.mark.asyncio
async def test_irrigation_advisory_contract(async_client: AsyncClient):
    """Verify irrigation advisory endpoint contract."""
    payload = {
        "soil_moisture": 32.5,
        "ambient_temperature": 28.0,
        "relative_humidity": 60.0,
        "rainfall_forecast_24h": 0.0,
    }
    response = await async_client.post("/api/v1/irrigation/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "urgency_level" in data
    assert data["requires_agronomic_verification"] is True


@pytest.mark.asyncio
async def test_fertilizer_advisory_contract(async_client: AsyncClient):
    """Verify fertilizer advisory endpoint contract."""
    payload = {
        "crop_name": "rice",
        "nitrogen": 80.0,
        "phosphorus": 35.0,
        "potassium": 40.0,
        "ph": 6.5,
    }
    response = await async_client.post("/api/v1/fertilizer/diagnose", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["crop_name"] == "rice"
    assert data["verified"] is False  # Must await verified agronomic rules
