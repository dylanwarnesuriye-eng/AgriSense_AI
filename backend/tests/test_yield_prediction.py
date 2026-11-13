"""Comprehensive tests for Crop Yield Prediction module (Regression)."""
import pytest
from httpx import AsyncClient

from app.modules.yield_prediction import (
    SUPPORTED_CROP_NAMES_TITLE,
    YieldPredictionInput,
    yield_service,
)


@pytest.mark.asyncio
async def test_yield_model_artifact_is_loaded():
    """Verify that the yield regression pipeline artifact and metadata are properly loaded."""
    assert yield_service.is_model_loaded() is True
    assert yield_service.model_version == "v1.0"
    assert yield_service._metadata.get("algorithm") == "sklearn.linear_model.Ridge"
    assert set(yield_service._metadata.get("supported_crops", [])) == set(SUPPORTED_CROP_NAMES_TITLE)


@pytest.mark.asyncio
async def test_valid_prediction_for_all_5_supported_crops(async_client: AsyncClient):
    """Verify valid predictions for each of the 5 supported crops."""
    for crop in ["wheat", "barley", "corn", "rice", "soybean"]:
        payload = {
            "crop_name": crop,
            "soil_ph": 6.5,
            "soil_moisture": 30.0,
            "avg_temperature": 22.0,
            "total_rainfall": 650.0,
            "nitrogen_content": 1.75,
            "phosphorus_content": 0.85,
            "potassium_content": 1.25,
            "fertilizer_amount": 170.0,
            "pesticide_usage": 7.5,
            "sunlight_hours": 2000.0,
            "irrigation_frequency": 3,
            "region": "Central",
            "season": "Spring",
            "area_hectares": 5.0,
        }
        response = await async_client.post("/api/v1/yield/predict", json=payload)
        assert response.status_code == 200, f"Failed for crop: {crop}"

        body = response.json()
        assert body["success"] is True
        data = body["data"]

        assert data["yield_supported"] is True
        assert data["predicted_yield_tpha"] > 0.0
        # Expected yield in dataset is ~2 to 10 t/ha
        assert 2.0 <= data["predicted_yield_tpha"] <= 12.0
        assert data["predicted_yield_total"] == round(data["predicted_yield_tpha"] * 5.0, 2)
        assert data["model_version"] == "v1.0"
        assert len(data["warnings"]) > 0


@pytest.mark.asyncio
async def test_unsupported_crops_rejected(async_client: AsyncClient):
    """Verify that unsupported crops (e.g. apple, mango, cotton) are rejected with 422."""
    unsupported_crops = ["apple", "banana", "coffee", "cotton", "grapes", "watermelon"]
    for crop in unsupported_crops:
        payload = {
            "crop_name": crop,
            "soil_ph": 6.5,
            "total_rainfall": 600.0,
        }
        response = await async_client.post("/api/v1/yield/predict", json=payload)
        assert response.status_code == 422, f"Failed to reject crop: {crop}"
        assert "not supported for yield prediction" in str(response.json()).lower()


@pytest.mark.asyncio
async def test_service_unsupported_crop_raises_error():
    """Verify UnsupportedCropYieldError is raised by service directly on invalid crop."""
    with pytest.raises(ValueError):
        YieldPredictionInput(crop_name="orange")


@pytest.mark.asyncio
async def test_prospective_planning_mode(async_client: AsyncClient):
    """Verify prospective mode computes yield using median imputation when management inputs are absent."""
    payload = {
        "crop_name": "Wheat",
        "soil_ph": 6.8,
        "soil_moisture": 32.0,
        "avg_temperature": 21.0,
        "total_rainfall": 700.0,
        "nitrogen_content": 1.8,
        "phosphorus_content": 0.9,
        "potassium_content": 1.3,
        "prediction_mode": "prospective",
        # fertilizer_amount, pesticide_usage, etc. omitted
    }
    response = await async_client.post("/api/v1/yield/predict", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["predicted_yield_tpha"] > 0.0
    assert any("Prospective Planning Mode" in w for w in data["warnings"])


@pytest.mark.asyncio
async def test_backward_compatibility_fields(async_client: AsyncClient):
    """Verify backward compatibility with earlier frontend field names."""
    payload = {
        "crop_name": "wheat",
        "area_hectares": 10.0,
        "annual_rainfall_mm": 750.0,  # alias for total_rainfall
        "fertilizer_usage_kg_per_ha": 120.0,  # alias for fertilizer_amount
        "average_temperature_c": 23.5,  # alias for avg_temperature
    }
    response = await async_client.post("/api/v1/yield/predict", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["predicted_yield_tpha"] > 0.0
    assert data["predicted_yield_per_hectare"] == data["predicted_yield_tpha"]
    assert data["predicted_yield_total"] == round(data["predicted_yield_tpha"] * 10.0, 2)


@pytest.mark.asyncio
async def test_non_finite_values_rejected():
    """Verify that NaN or infinite values are rejected by schema validation."""
    with pytest.raises(ValueError, match="finite"):
        YieldPredictionInput(crop_name="rice", soil_ph=float("nan"))

    with pytest.raises(ValueError, match="finite"):
        YieldPredictionInput(crop_name="rice", total_rainfall=float("inf"))


@pytest.mark.asyncio
async def test_bounds_validation(async_client: AsyncClient):
    """Verify that physical boundary violations are rejected with 422."""
    invalid_cases = [
        {"soil_ph": -0.5},
        {"soil_ph": 14.5},
        {"soil_moisture": 105.0},
        {"total_rainfall": -50.0},
        {"area_hectares": 0.0},
    ]
    for case in invalid_cases:
        payload = {"crop_name": "rice", **case}
        response = await async_client.post("/api/v1/yield/predict", json=payload)
        assert response.status_code == 422, f"Failed for case: {case}"


@pytest.mark.asyncio
async def test_pathway_mapping_endpoints(async_client: AsyncClient):
    """Verify recommendation-to-yield pathway endpoint behavior."""
    # 1. Rice is supported
    resp_rice = await async_client.get("/api/v1/yield/pathway/rice")
    assert resp_rice.status_code == 200
    assert resp_rice.json()["data"]["pathway_available"] is True
    assert resp_rice.json()["data"]["target_crop"] == "Rice"

    # 2. Maize maps to Corn
    resp_maize = await async_client.get("/api/v1/yield/pathway/maize")
    assert resp_maize.status_code == 200
    assert resp_maize.json()["data"]["pathway_available"] is True
    assert resp_maize.json()["data"]["target_crop"] == "Corn"

    # 3. Apple has no yield pathway
    resp_apple = await async_client.get("/api/v1/yield/pathway/apple")
    assert resp_apple.status_code == 200
    assert resp_apple.json()["data"]["pathway_available"] is False
    assert resp_apple.json()["data"]["target_crop"] is None


@pytest.mark.asyncio
async def test_grouped_data_leakage_prevention():
    """Verify that metadata confirms zero field overlap between dev and holdout partitions."""
    meta = yield_service._metadata
    assert meta.get("dataset", {}).get("field_overlap") == 0
    assert meta.get("dataset", {}).get("dev_fields_count", 0) > 0
    assert meta.get("dataset", {}).get("holdout_fields_count", 0) > 0
