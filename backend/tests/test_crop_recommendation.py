"""Comprehensive tests for Decision Tree Crop Recommendation module."""
import pytest
from httpx import AsyncClient

from app.modules.crop_recommendation import (
    SUPPORTED_RECOMMENDATION_CROPS,
    CropRecommendationInput,
    crop_service,
)
from app.modules.crop_recommendation.inference import (
    FEATURE_NAMES,
    UnverifiedUnitsError,
)


@pytest.mark.asyncio
async def test_model_artifact_is_loaded():
    """Verify that the model artifact and metadata are properly loaded."""
    assert crop_service.is_model_loaded() is True
    assert crop_service.model_version == "v1.0"
    assert crop_service._metadata.get("algorithm") == "sklearn.tree.DecisionTreeClassifier"
    assert crop_service._metadata.get("feature_schema", {}).get("names") == FEATURE_NAMES
    assert len(crop_service._metadata.get("target_classes", [])) == 22


@pytest.mark.asyncio
async def test_valid_prediction_and_contract(async_client: AsyncClient):
    """Verify successful inference with typical rice feature profile."""
    payload = {
        "nitrogen": 90.0,
        "phosphorus": 42.0,
        "potassium": 43.0,
        "temperature": 20.8,
        "humidity": 82.0,
        "ph": 6.5,
        "rainfall": 202.9,
        "academic_demo_mode": True,
    }
    response = await async_client.post("/api/v1/crops/recommend", json=payload)
    assert response.status_code == 200

    body = response.json()
    assert body["success"] is True
    data = body["data"]

    assert data["recommended_crop"] in SUPPORTED_RECOMMENDATION_CROPS
    assert data["model_version"] == "v1.0"
    assert data["prediction_status"] == "success"
    assert data["units_verified"] is False
    assert isinstance(data["warnings"], list)
    assert len(data["warnings"]) > 0
    assert len(data["available_crops"]) == 22

    # Check pathway for rice
    if data["recommended_crop"] == "rice":
        assert data["pathway_available"] is True


@pytest.mark.asyncio
async def test_all_22_classes_in_model():
    """Verify that all 22 supported crop classes are represented in model target classes."""
    model_classes = [c.lower() for c in crop_service._model.classes_]
    assert set(model_classes) == set(SUPPORTED_RECOMMENDATION_CROPS)


@pytest.mark.asyncio
async def test_representative_crops_inference():
    """Verify model can infer diverse crop types given distinct environmental signatures."""
    test_cases = [
        # Chickpea: moderate N, high P, low rainfall (~65-80mm), moderate temp
        {"n": 40, "p": 67, "k": 79, "t": 18.8, "h": 16.8, "ph": 7.3, "r": 80.0, "expected": "chickpea"},
        # Cotton: high N (~120), moderate P, moderate K, high temp (~24), moderate rain (~80)
        {"n": 120, "p": 45, "k": 20, "t": 24.0, "h": 80.0, "ph": 6.8, "r": 80.0, "expected": "cotton"},
        # Apple: low N (~20), very high P (~135), very high K (~200)
        {"n": 20, "p": 135, "k": 200, "t": 22.0, "h": 92.0, "ph": 5.9, "r": 110.0, "expected": "apple"},
    ]

    for tc in test_cases:
        inp = CropRecommendationInput(
            nitrogen=tc["n"],
            phosphorus=tc["p"],
            potassium=tc["k"],
            temperature=tc["t"],
            humidity=tc["h"],
            ph=tc["ph"],
            rainfall=tc["r"],
            academic_demo_mode=True,
        )
        res = crop_service.predict(inp)
        assert res.recommended_crop == tc["expected"]


@pytest.mark.asyncio
async def test_unverified_units_guard_blocks_production():
    """Verify that when academic demo mode is False, prediction is blocked due to unverified units."""
    inp = CropRecommendationInput(
        nitrogen=90.0,
        phosphorus=42.0,
        potassium=43.0,
        temperature=20.8,
        humidity=82.0,
        ph=6.5,
        rainfall=202.9,
        academic_demo_mode=False,
    )
    with pytest.raises(UnverifiedUnitsError) as exc_info:
        crop_service.predict(inp)
    assert "Live production inference is restricted" in str(exc_info.value)


@pytest.mark.asyncio
async def test_endpoint_blocks_production_without_demo_mode(async_client: AsyncClient):
    """Verify API endpoint returns 400 Bad Request when academic_demo_mode is False."""
    payload = {
        "nitrogen": 90.0,
        "phosphorus": 42.0,
        "potassium": 43.0,
        "temperature": 20.8,
        "humidity": 82.0,
        "ph": 6.5,
        "rainfall": 202.9,
        "academic_demo_mode": False,
    }
    response = await async_client.post("/api/v1/crops/recommend", json=payload)
    assert response.status_code == 400
    assert "Live production inference is restricted" in response.json()["detail"]


@pytest.mark.asyncio
async def test_missing_features_rejected(async_client: AsyncClient):
    """Verify that omitting required features produces HTTP 422."""
    payload = {
        "nitrogen": 90.0,
        # missing phosphorus
        "potassium": 43.0,
        "temperature": 20.8,
        "humidity": 82.0,
        "ph": 6.5,
        "rainfall": 202.9,
    }
    response = await async_client.post("/api/v1/crops/recommend", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_invalid_data_types_rejected(async_client: AsyncClient):
    """Verify that invalid data types (e.g. non-numeric strings) produce HTTP 422."""
    payload = {
        "nitrogen": "extremely_high",
        "phosphorus": 42.0,
        "potassium": 43.0,
        "temperature": 20.8,
        "humidity": 82.0,
        "ph": 6.5,
        "rainfall": 202.9,
    }
    response = await async_client.post("/api/v1/crops/recommend", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_non_finite_values_rejected(async_client: AsyncClient):
    """Verify that NaN or infinite numerical values are rejected by schema validation."""
    # 1. Direct Python schema instantiation check
    base_kwargs = {
        "nitrogen": 90.0,
        "phosphorus": 42.0,
        "potassium": 43.0,
        "temperature": 20.8,
        "humidity": 82.0,
        "ph": 6.5,
        "rainfall": 202.9,
    }

    with pytest.raises(ValueError, match="finite"):
        CropRecommendationInput(**{**base_kwargs, "nitrogen": float("nan")})

    with pytest.raises(ValueError, match="finite"):
        CropRecommendationInput(**{**base_kwargs, "temperature": float("inf")})

    with pytest.raises(ValueError, match="finite"):
        CropRecommendationInput(**{**base_kwargs, "rainfall": float("-inf")})

    # 2. HTTP endpoint rejection with non-finite string payload
    payload = {
        "nitrogen": "NaN",
        "phosphorus": 42.0,
        "potassium": 43.0,
        "temperature": 20.8,
        "humidity": 82.0,
        "ph": 6.5,
        "rainfall": 202.9,
    }
    response = await async_client.post("/api/v1/crops/recommend", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_bounds_validation_rejected(async_client: AsyncClient):
    """Verify that values outside physical/biological bounds produce HTTP 422."""
    invalid_cases = [
        {"ph": -1.0},  # Negative pH
        {"ph": 15.0},  # pH > 14
        {"humidity": 120.0},  # Humidity > 100%
        {"humidity": -5.0},  # Negative humidity
        {"rainfall": -10.0},  # Negative rainfall
        {"nitrogen": -20.0},  # Negative N
    ]

    base_payload = {
        "nitrogen": 50.0,
        "phosphorus": 50.0,
        "potassium": 50.0,
        "temperature": 25.0,
        "humidity": 70.0,
        "ph": 6.5,
        "rainfall": 100.0,
    }

    for case in invalid_cases:
        bad_payload = {**base_payload, **case}
        response = await async_client.post("/api/v1/crops/recommend", json=bad_payload)
        assert response.status_code == 422, f"Failed for case: {case}"


@pytest.mark.asyncio
async def test_feature_names_and_order_consistency():
    """Verify canonical feature ordering matches training and model expectations."""
    expected_order = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    assert FEATURE_NAMES == expected_order
    assert crop_service._metadata.get("feature_schema", {}).get("order") == expected_order
