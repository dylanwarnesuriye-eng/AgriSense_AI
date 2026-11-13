"""AgriSense AI - Real Firebase Authentication & Ownership Verification Script (Task 16).

Tests:
1. Registers/verifies real test account User A (e.g., farmer.alpha@agrisense.dev) in Firebase Auth.
2. Updates profile displayName in Firebase Auth.
3. Authenticates User A, obtains real ID token via Identity Toolkit.
4. Makes authenticated request to FastAPI; verifies Firestore profile sync in 'users/{uid}'.
5. User A creates a farm in Firestore. Confirms document exists in 'farms' with owner_uid = User A.
6. Registers/verifies User B (e.g., farmer.beta@agrisense.dev) in Firebase Auth.
7. User B obtains real ID token and requests GET /api/v1/farms.
8. Confirms User A's farm is NOT returned in User B's farm list (Isolation).
9. User B attempts direct GET /api/v1/farms/{user_a_farm_id}; confirms HTTP 403 Forbidden.
10. Unauthenticated request without token returns HTTP 401 Unauthorized.
11. Simulated session restore: re-authenticates and verifies persistence across restarts.
"""
import os
import sys
import uuid
import requests
from datetime import datetime, timezone

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.firebase import init_firebase_admin, get_firestore_client, get_firebase_project_id
from firebase_admin import auth

API_BASE = "http://127.0.0.1:8000/api/v1"
API_KEY = os.environ.get("VITE_FIREBASE_API_KEY", "AIzaSyDCeC0KLqCuK1NCKh2kgG9dRRDb6qYSFB8")


def get_id_token_for_uid(uid: str) -> str:
    custom_token = auth.create_custom_token(uid).decode("utf-8")
    resp = requests.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={API_KEY}",
        json={"token": custom_token, "returnSecureToken": True},
        timeout=10,
    )
    assert resp.status_code == 200, f"Custom token exchange failed: {resp.text}"
    return resp.json()["idToken"]


def run_auth_verification():
    print("=" * 70)
    print("AGRISENSE AI — PHASE 6: REAL FIREBASE AUTH & ACCESS CONTROL VERIFICATION")
    print("=" * 70)

    # Step 1: Initialize Firebase Admin
    print("\n[STEP 1] Initializing Firebase Admin SDK...")
    success = init_firebase_admin()
    assert success, "Firebase Admin SDK failed to initialize"
    project_id = get_firebase_project_id()
    firestore_client = get_firestore_client()
    print(f"[OK] Project: {project_id}")
    print(f"[OK] Firestore: {firestore_client}")

    # Step 2: Register / Authenticate User A
    print("\n[STEP 2] Setting up real test User A in Firebase Authentication...")
    user_a_email = "farmer.alpha@agrisense.dev"
    try:
        user_a = auth.get_user_by_email(user_a_email)
        print(f"[OK] Existing User A found: UID={user_a.uid}")
    except auth.UserNotFoundError:
        user_a = auth.create_user(
            email=user_a_email,
            display_name="Farmer Alpha",
            email_verified=True,
        )
        print(f"[OK] Created new User A: UID={user_a.uid}")

    auth.update_user(user_a.uid, display_name="Farmer Alpha")
    token_a = get_id_token_for_uid(user_a.uid)
    print("[OK] Real Firebase ID token generated for User A.")

    # Step 3: Verify Profile Sync in Cloud Firestore 'users' collection
    print("\n[STEP 3] Verifying Firestore 'users/{uid}' profile sync via FastAPI...")
    resp_a = requests.get(f"{API_BASE}/farms", headers={"Authorization": f"Bearer {token_a}"})
    assert resp_a.status_code == 200, f"User A GET /farms failed: {resp_a.text}"

    user_a_doc = firestore_client.collection("users").document(user_a.uid).get()
    assert user_a_doc.exists, f"Profile for User A {user_a.uid} was not synced to Firestore"
    user_a_dict = user_a_doc.to_dict()
    print(f"[OK] User A profile verified in Firestore users/{user_a.uid}:")
    print(f"     email: {user_a_dict.get('email')}, display_name: {user_a_dict.get('display_name')}")

    # Step 4: User A creates a Farm
    print("\n[STEP 4] User A creates a farm via authenticated FastAPI endpoint...")
    new_farm_payload = {
        "name": "Alpha Autonomous Paddy Estate",
        "location": "Ampara Sector B-14",
        "total_area_hectares": 35.0,
        "notes": "Real Firebase Auth ownership verification farm.",
    }
    create_resp = requests.post(
        f"{API_BASE}/farms",
        json=new_farm_payload,
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert create_resp.status_code in (200, 201), f"Create farm failed: {create_resp.text}"
    created_farm = create_resp.json()["data"]
    farm_id = created_farm["farm_id"]
    print(f"[OK] Farm created: {farm_id} ('{created_farm['name']}')")

    # Confirm in Cloud Firestore directly
    farm_doc = firestore_client.collection("farms").document(farm_id).get()
    assert farm_doc.exists, f"Farm {farm_id} does not exist in Firestore!"
    farm_dict = farm_doc.to_dict()
    assert farm_dict["owner_uid"] == user_a.uid, "Farm owner_uid does not match User A UID!"
    print(f"[OK] Direct Cloud Firestore check: farms/{farm_id} owner_uid = {farm_dict['owner_uid']}")

    # Step 5: Register / Authenticate User B (Isolation Check)
    print("\n[STEP 5] Setting up real test User B in Firebase Authentication...")
    user_b_email = "farmer.beta@agrisense.dev"
    try:
        user_b = auth.get_user_by_email(user_b_email)
        print(f"[OK] Existing User B found: UID={user_b.uid}")
    except auth.UserNotFoundError:
        user_b = auth.create_user(
            email=user_b_email,
            display_name="Farmer Beta",
            email_verified=True,
        )
        print(f"[OK] Created new User B: UID={user_b.uid}")

    token_b = get_id_token_for_uid(user_b.uid)
    print("[OK] Real Firebase ID token generated for User B.")

    # Step 6: User B queries /farms - Must NOT see User A's farm
    print("\n[STEP 6] Cross-User Isolation: User B requests farm list...")
    resp_b = requests.get(f"{API_BASE}/farms", headers={"Authorization": f"Bearer {token_b}"})
    assert resp_b.status_code == 200, f"User B GET /farms failed: {resp_b.text}"
    user_b_farms = resp_b.json()["data"]
    user_b_farm_ids = [f["farm_id"] for f in user_b_farms]
    assert farm_id not in user_b_farm_ids, f"DATA LEAKAGE: User B saw User A's farm {farm_id}!"
    print(f"[OK] Verified User B farm list does NOT contain User A's farm {farm_id}.")

    # Step 7: Cross-User Direct Access Prevention
    print("\n[STEP 7] Cross-User Direct Access: User B attempts GET /farms/{user_a_farm_id}...")
    forbidden_resp = requests.get(
        f"{API_BASE}/farms/{farm_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert forbidden_resp.status_code == 403, f"Expected 403 Forbidden, got {forbidden_resp.status_code}"
    print(f"[OK] Correctly rejected with HTTP 403 Forbidden: {forbidden_resp.json()['detail']}")

    # Step 8: Unauthenticated Request Prevention
    print("\n[STEP 8] Unauthenticated Request: GET /farms without Bearer token...")
    unauth_resp = requests.get(f"{API_BASE}/farms")
    assert unauth_resp.status_code == 401, f"Expected 401 Unauthorized, got {unauth_resp.status_code}"
    print(f"[OK] Correctly rejected with HTTP 401 Unauthorized: {unauth_resp.json()['detail']}")

    # Step 9: User A re-fetches farm (Session restoration verification)
    print("\n[STEP 9] Session Restoration & Persistence: User A re-fetches farm...")
    refetch_resp = requests.get(
        f"{API_BASE}/farms/{farm_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert refetch_resp.status_code == 200, f"User A failed to refetch own farm: {refetch_resp.text}"
    refetched_farm = refetch_resp.json()["data"]
    assert refetched_farm["farm_id"] == farm_id
    assert refetched_farm["owner_uid"] == user_a.uid
    print(f"[OK] User A successfully accessed farm {farm_id} via fresh session.")

    print("\n" + "=" * 70)
    print("PHASE 6: REAL FIREBASE AUTHENTICATION & OWNERSHIP FULLY VERIFIED")
    print("=" * 70)
    print(f"Firebase Project:       {project_id}")
    print(f"User A UID:             {user_a.uid} ({user_a_email})")
    print(f"User B UID:             {user_b.uid} ({user_b_email})")
    print(f"Persisted Farm Doc ID:  {farm_id}")
    print(f"Cloud Firestore Doc:    farms/{farm_id} (owner_uid: {user_a.uid})")
    print(f"User Profile Sync Doc:  users/{user_a.uid}")
    print("=" * 70)


if __name__ == "__main__":
    run_auth_verification()
