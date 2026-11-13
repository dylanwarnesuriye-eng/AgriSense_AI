"""Real Cloud Firestore & Firebase Auth Persistence Verification Script.

Executes Task 5 & Task 6:
1. Authenticates/manages user in Firebase Auth.
2. Exchanges custom token for real Firebase ID token via Identity Toolkit.
3. Verifies Firebase ID token with FastAPI security dependencies.
4. Makes authenticated HTTP request to FastAPI using the real ID token.
5. Syncs user profile to Cloud Firestore 'users' collection.
6. Creates a Farm in Cloud Firestore 'farms' collection.
7. Creates a Field (with soil_type) and adds typed SoilClimateMeasurement.
8. Creates an Assessment in Cloud Firestore 'assessments' collection.
9. Reads each document directly from Cloud Firestore to verify live write.
10. Simulates a complete server restart (clears all local RAM/in-memory caches).
11. Re-fetches the farm, field, and assessment from the re-initialized repository.
12. Reports real Firestore document IDs and verification status.
"""
import sys
import os
import uuid
import requests
from datetime import datetime, timezone

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.services.firebase import init_firebase_admin, get_firestore_client, get_firebase_project_id
from app.services.firestore_repo import firestore_repo, FirestoreRepository
from app.core.auth import verify_firebase_token
from app.main import app
from fastapi.testclient import TestClient
from firebase_admin import auth


def run_real_persistence_test():
    print("=" * 70)
    print("AGRISENSE AI - REAL CLOUD FIRESTORE & AUTH VERIFICATION")
    print("=" * 70)

    # 1. Initialize Firebase Admin
    print("\n[STEP 1] Initializing Firebase Admin SDK...")
    success = init_firebase_admin()
    if not success:
        print("ERROR: Failed to initialize Firebase Admin SDK.")
        sys.exit(1)

    project_id = get_firebase_project_id()
    client = get_firestore_client()
    print(f"[OK] Firebase Admin SDK initialized successfully.")
    print(f"[OK] Connected to Google Cloud Project: {project_id}")
    print(f"[OK] Cloud Firestore Client: {client}")

    # 2. Authenticate / Create Real Firebase User
    print("\n[STEP 2] Verifying Firebase User in Authentication & Firestore 'users' collection...")
    test_email = "agronomist.audit@agrisense.dev"
    try:
        fb_user = auth.get_user_by_email(test_email)
        print(f"[OK] Existing Firebase user found: UID={fb_user.uid}, Email={fb_user.email}")
    except auth.UserNotFoundError:
        fb_user = auth.create_user(
            email=test_email,
            display_name="Audited Agronomist",
            email_verified=True,
        )
        print(f"[OK] Created new Firebase user: UID={fb_user.uid}, Email={fb_user.email}")

    user_uid = fb_user.uid
    user_record = {
        "uid": user_uid,
        "email": fb_user.email,
        "display_name": fb_user.display_name or "Audited Agronomist",
        "role": "lead_agronomist",
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }
    saved_user = firestore_repo.sync_user(user_record)
    print(f"[OK] User written to Cloud Firestore collection 'users' [Doc ID: {user_uid}] (backend: {saved_user.get('_storage_backend')})")

    # 3. Generate Real Firebase ID Token & Verify with FastAPI
    print("\n[STEP 3] Generating real Firebase ID Token and testing FastAPI authentication...")
    custom_token = auth.create_custom_token(user_uid).decode("utf-8")
    api_key = os.environ.get("VITE_FIREBASE_API_KEY", "AIzaSyDCeC0KLqCuK1NCKh2kgG9dRRDb6qYSFB8")
    exchange_resp = requests.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={api_key}",
        json={"token": custom_token, "returnSecureToken": True},
        timeout=10,
    )
    assert exchange_resp.status_code == 200, f"Token exchange failed: {exchange_resp.text}"
    id_token = exchange_resp.json()["idToken"]
    print(f"[OK] Successfully retrieved live Firebase ID Token from Identity Toolkit.")

    # Test FastAPI internal verification
    verified_user = verify_firebase_token(id_token)
    assert verified_user.uid == user_uid
    print(f"[OK] FastAPI verify_firebase_token verified UID={verified_user.uid}, is_mock={verified_user.is_mock}")

    # Test HTTP request with Bearer ID Token to FastAPI
    test_client = TestClient(app)
    api_resp = test_client.get("/api/v1/farms", headers={"Authorization": f"Bearer {id_token}"})
    assert api_resp.status_code == 200, f"FastAPI GET /farms failed: {api_resp.text}"
    print(f"[OK] FastAPI GET /api/v1/farms responded with HTTP 200 OK.")

    # 4. Create Farm in Cloud Firestore 'farms'
    print("\n[STEP 4] Creating Farm document in Cloud Firestore 'farms' collection...")
    farm_id = f"frm_{uuid.uuid4().hex[:10]}"
    field_id = f"fld_{uuid.uuid4().hex[:8]}"
    measurement_id = f"meas_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()

    farm_data = {
        "farm_id": farm_id,
        "owner_uid": user_uid,
        "name": "Live Cloud Precision Plot Alpha",
        "location": "Mahaweli System H Sector 4",
        "total_area_hectares": 24.5,
        "notes": "Real Cloud Firestore verification plot for AgriSense AI deployment.",
        "created_at": now,
        "updated_at": now,
        "fields": [
            {
                "field_id": field_id,
                "farm_id": farm_id,
                "name": "Paddy Block East-1",
                "area_hectares": 8.0,
                "soil_type": "Clay Loam",
                "crop_type": "rice",
                "crop_currently_planted": "rice",
                "created_at": now,
                "measurements": [
                    {
                        "measurement_id": measurement_id,
                        "timestamp": now,
                        "source": "sensor",
                        "units": {
                            "nitrogen": "kg/ha",
                            "phosphorus": "kg/ha",
                            "potassium": "kg/ha",
                            "temperature": "celsius",
                            "humidity": "percent",
                            "rainfall": "mm",
                        },
                        "nitrogen": 85.0,
                        "phosphorus": 42.0,
                        "potassium": 45.0,
                        "ph": 6.4,
                        "temperature": 27.5,
                        "humidity": 82.0,
                        "rainfall": 195.0,
                        "soil_moisture": 38.0,
                        "notes": "Calibrated Loamy Clay Telemetry",
                    }
                ],
            }
        ],
    }

    saved_farm = firestore_repo.save_farm(farm_data)
    print(f"[OK] Farm written to Cloud Firestore collection 'farms' [Doc ID: {farm_id}] (backend: {saved_farm.get('_storage_backend')})")
    print(f"  - Field Plot created: {field_id} (soil_type: Clay Loam, area: 8.0 ha)")
    print(f"  - Measurement attached: {measurement_id} (N: 85, P: 42, K: 45, pH: 6.4)")

    # 5. Create Assessment in Cloud Firestore 'assessments'
    print("\n[STEP 5] Creating Assessment in Cloud Firestore 'assessments' collection...")
    assessment_id = f"asmt_{uuid.uuid4().hex[:10]}"
    assessment_data = {
        "assessment_id": assessment_id,
        "owner_uid": user_uid,
        "timestamp": now,
        "farm_id": farm_id,
        "field_id": field_id,
        "farmer_confirmed_crop": "rice",
        "candidate_recommended_crop": "rice",
        "is_crop_from_recommendation": True,
        "crop_pathway_compatibility": {
            "recommendation_supported": True,
            "irrigation_supported": True,
            "fertilizer_supported": True,
            "yield_supported": True,
            "pathway_type": "integrated",
            "yield_canonical_crop": "Rice",
            "notes": "Full 4-Subsystem Integrated Rice Assessment",
        },
        "irrigation_result": {
            "status": "evaluated",
            "model_or_rule_version": "fuzzy_irrigation_v1.0",
            "advice_summary": "Maintain 3-5cm standing water depth (Paddy flooded AWD)",
        },
        "fertilizer_result": {
            "status": "evaluated",
            "model_or_rule_version": "kb_fertilizer_v0.1_draft",
            "product_recommendations": [
                {
                    "fertilizer_name": "Urea (46-0-0)",
                    "application_rate_kg_ha": 125.0,
                    "total_amount_kg": 1000.0,
                }
            ],
        },
        "yield_result": {
            "status": "evaluated",
            "model_or_rule_version": "yield_regressor_v1.0",
            "predicted_yield_tpha": 4.85,
            "predicted_production_tonnes": 38.8,
        },
        "overall_status": "complete",
        "academic_demo_mode": False,
    }

    saved_assessment = firestore_repo.save_assessment(assessment_data)
    print(f"[OK] Assessment written to Cloud Firestore collection 'assessments' [Doc ID: {assessment_id}] (backend: {saved_assessment.get('_storage_backend')})")

    # 6. Direct Cloud Verification (Bypassing repository caches)
    print("\n[STEP 6] Direct Cloud Firestore read verification...")
    user_doc = client.collection("users").document(user_uid).get()
    farm_doc = client.collection("farms").document(farm_id).get()
    asmt_doc = client.collection("assessments").document(assessment_id).get()

    assert user_doc.exists, f"User {user_uid} was not found in Firestore!"
    assert farm_doc.exists, f"Farm {farm_id} was not found in Firestore!"
    assert asmt_doc.exists, f"Assessment {assessment_id} was not found in Firestore!"

    print(f"[OK] DIRECT FIRESTORE CONFIRMATION:")
    print(f"  - users/{user_uid} exists = {user_doc.exists} (Email: {user_doc.to_dict().get('email')})")
    print(f"  - farms/{farm_id} exists = {farm_doc.exists} (Name: {farm_doc.to_dict().get('name')})")
    print(f"  - assessments/{assessment_id} exists = {asmt_doc.exists} (Crop: {asmt_doc.to_dict().get('farmer_confirmed_crop')})")

    # 7. Simulate Complete FastAPI Server Restart
    print("\n[STEP 7] Simulating complete FastAPI restart (purging all local memory)...")
    new_repo = FirestoreRepository()
    assert len(new_repo._farms_store) == 0, "Memory was not empty!"
    assert len(new_repo._assessments_store) == 0, "Memory was not empty!"
    print("[OK] Local RAM store is completely empty.")

    # 8. Retrieve from fresh repository (must pull from Cloud Firestore)
    print("\n[STEP 8] Retrieving documents from Cloud Firestore using clean repository...")
    fetched_user = new_repo.get_user(user_uid)
    fetched_farm = new_repo.get_farm(farm_id, owner_uid=user_uid)
    fetched_asmt = new_repo.get_assessment(assessment_id, owner_uid=user_uid)

    assert fetched_user is not None, "Failed to retrieve user after simulated restart!"
    assert fetched_farm is not None, "Failed to retrieve farm after simulated restart!"
    assert fetched_asmt is not None, "Failed to retrieve assessment after simulated restart!"

    print(f"[OK] Retrieved Farm after restart: '{fetched_farm['name']}' ({fetched_farm['location']})")
    print(f"[OK] Retrieved Field Plot: '{fetched_farm['fields'][0]['name']}' ({fetched_farm['fields'][0]['area_hectares']} ha)")
    print(f"[OK] Retrieved Telemetry: N={fetched_farm['fields'][0]['measurements'][0]['nitrogen']} kg/ha, pH={fetched_farm['fields'][0]['measurements'][0]['ph']}")
    print(f"[OK] Retrieved Assessment after restart: ID={fetched_asmt['assessment_id']}, Crop={fetched_asmt['farmer_confirmed_crop']}, Status={fetched_asmt['overall_status']}")

    # 9. Verify via FastAPI HTTP client with Bearer ID token after restart
    print("\n[STEP 9] Fetching persisted farm list via authenticated FastAPI HTTP GET...")
    list_resp = test_client.get("/api/v1/farms", headers={"Authorization": f"Bearer {id_token}"})
    assert list_resp.status_code == 200, f"GET /farms failed: {list_resp.text}"
    farms_list = list_resp.json()["data"]
    matched_farm = next((f for f in farms_list if f["farm_id"] == farm_id), None)
    assert matched_farm is not None, f"Farm {farm_id} not found in FastAPI response!"
    print(f"[OK] Verified Farm {farm_id} returned by FastAPI with {len(matched_farm['fields'])} field(s)!")

    print("\n" + "=" * 70)
    print("SUCCESS: REAL FIREBASE PERSISTENCE & AUTH FULLY VERIFIED")
    print("=" * 70)
    print(f"Firebase Project ID:     {project_id}")
    print(f"Users Document ID:        {user_uid}")
    print(f"Farms Document ID:        {farm_id}")
    print(f"Assessments Document ID:  {assessment_id}")
    print("=" * 70)


if __name__ == "__main__":
    run_real_persistence_test()
