"""AgriSense AI - Real Firebase Role-Based Access Verification (Task 11).

Tests live Firebase Authentication and Cloud Firestore role verification against FastAPI:
1. Authenticates real Farmer account (farmer.alpha@agrisense.dev, role='farmer').
2. Verifies Farmer profile returns role='farmer'.
3. Verifies Farmer receives HTTP 403 Forbidden on GET /api/v1/system/diagnostics.
4. Verifies Farmer receives HTTP 200 OK on normal application endpoints (GET /api/v1/farms).
5. Authenticates real Admin account (agronomist.audit@agrisense.dev, role='admin').
6. Verifies Admin profile returns role='admin'.
7. Verifies Admin receives HTTP 200 OK on GET /api/v1/system/diagnostics with internal diagnostics.
8. Verifies Admin receives HTTP 200 OK on normal application endpoints.
9. Verifies unauthenticated access to /api/v1/system/diagnostics returns HTTP 401 Unauthorized.
"""
import os
import sys
import requests

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.firebase import get_firestore_client, init_firebase_admin
from firebase_admin import auth

API_BASE = "http://127.0.0.1:8000/api/v1"
API_KEY = os.environ.get("VITE_FIREBASE_API_KEY", "AIzaSyDCeC0KLqCuK1NCKh2kgG9dRRDb6qYSFB8")


def get_real_id_token(uid: str) -> str:
    """Generate and exchange custom token for real Firebase ID token via Identity Toolkit."""
    custom_token = auth.create_custom_token(uid).decode("utf-8")
    resp = requests.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={API_KEY}",
        json={"token": custom_token, "returnSecureToken": True},
        timeout=10,
    )
    assert resp.status_code == 200, f"Token exchange failed: {resp.text}"
    return resp.json()["idToken"]


def run_verification():
    print("=" * 75)
    print("AGRISENSE AI — REAL FIREBASE ROLE-BASED ACCESS VERIFICATION (TASK 11)")
    print("=" * 75)

    # 1. Initialize Firebase Admin SDK
    print("\n[STEP 1] Initializing Firebase Admin SDK...")
    success = init_firebase_admin()
    assert success, "Firebase Admin SDK failed to initialize"
    firestore_client = get_firestore_client()
    assert firestore_client is not None, "Firestore client unavailable"
    print("  [OK] Firebase Admin initialized with real Cloud Firestore connection.")

    # 2. Setup Farmer Account
    farmer_email = "farmer.alpha@agrisense.dev"
    try:
        farmer_fb = auth.get_user_by_email(farmer_email)
    except Exception:
        farmer_fb = auth.create_user(email=farmer_email, display_name="Farmer Alpha")
    farmer_uid = farmer_fb.uid

    # Ensure role is 'farmer' in Cloud Firestore
    firestore_client.collection("users").document(farmer_uid).set({
        "uid": farmer_uid,
        "email": farmer_email,
        "display_name": "Farmer Alpha",
        "role": "farmer",
    }, merge=True)
    print(f"\n[STEP 2] Farmer account verified: {farmer_email} (UID: {farmer_uid})")
    print("  [OK] Role set to 'farmer' in Cloud Firestore: users/{farmer_uid}")

    # 3. Setup Admin Account
    admin_email = "agronomist.audit@agrisense.dev"
    try:
        admin_fb = auth.get_user_by_email(admin_email)
    except Exception:
        admin_fb = auth.create_user(email=admin_email, display_name="Audited Agronomist")
    admin_uid = admin_fb.uid

    # Ensure role is 'admin' in Cloud Firestore
    firestore_client.collection("users").document(admin_uid).set({
        "uid": admin_uid,
        "email": admin_email,
        "display_name": "Audited Agronomist",
        "role": "admin",
    }, merge=True)
    print(f"\n[STEP 3] Admin account verified: {admin_email} (UID: {admin_uid})")
    print("  [OK] Role set to 'admin' in Cloud Firestore: users/{admin_uid}")

    # 4. Exchange real Firebase ID tokens
    print("\n[STEP 4] Exchanging real Firebase ID tokens...")
    farmer_token = get_real_id_token(farmer_uid)
    admin_token = get_real_id_token(admin_uid)
    print("  [OK] Real Firebase ID tokens acquired.")

    # 5. Verify Unauthenticated Request
    print("\n[STEP 5] Testing Unauthenticated access to /system/diagnostics...")
    unauth_resp = requests.get(f"{API_BASE}/system/diagnostics", timeout=5)
    print(f"  Status Code: {unauth_resp.status_code}")
    assert unauth_resp.status_code == 401, f"Expected 401, got {unauth_resp.status_code}"
    print("  [PASS] Unauthenticated request correctly rejected with 401 Unauthorized.")

    # 6. Verify Farmer Profile and Diagnostics Restriction
    print("\n[STEP 6] Testing Farmer Access Control...")
    farmer_headers = {"Authorization": f"Bearer {farmer_token}"}

    # Profile check
    profile_resp = requests.get(f"{API_BASE}/users/me", headers=farmer_headers, timeout=5)
    assert profile_resp.status_code == 200, f"Profile request failed: {profile_resp.text}"
    profile_data = profile_resp.json()
    print(f"  Farmer Profile: UID={profile_data['uid']} | Role={profile_data['role']}")
    assert profile_data["role"] == "farmer", f"Expected role 'farmer', got '{profile_data['role']}'"
    print("  [PASS] Server profile confirms role='farmer'.")

    # Farmer normal app access
    farms_resp = requests.get(f"{API_BASE}/farms", headers=farmer_headers, timeout=5)
    assert farms_resp.status_code == 200, f"Farmer normal access failed: {farms_resp.text}"
    print(f"  Farmer Normal App Endpoint (/farms): HTTP {farms_resp.status_code} OK")
    print("  [PASS] Farmer normal application features work as expected.")

    # Farmer admin diagnostics access attempt
    diag_resp = requests.get(f"{API_BASE}/system/diagnostics", headers=farmer_headers, timeout=5)
    print(f"  Farmer Diagnostic Request: HTTP {diag_resp.status_code}")
    assert diag_resp.status_code == 403, f"Expected 403 Forbidden for farmer, got {diag_resp.status_code}"
    print(f"  Error Detail: {diag_resp.json().get('detail')}")
    print("  [PASS] Farmer access to System Diagnostics strictly blocked with HTTP 403 Forbidden.")

    # 7. Verify Admin Profile and Diagnostics Access
    print("\n[STEP 7] Testing Admin Access Control...")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Profile check
    admin_profile_resp = requests.get(f"{API_BASE}/users/me", headers=admin_headers, timeout=5)
    assert admin_profile_resp.status_code == 200, f"Admin profile request failed: {admin_profile_resp.text}"
    admin_profile_data = admin_profile_resp.json()
    print(f"  Admin Profile: UID={admin_profile_data['uid']} | Role={admin_profile_data['role']}")
    assert admin_profile_data["role"] == "admin", f"Expected role 'admin', got '{admin_profile_data['role']}'"
    print("  [PASS] Server profile confirms role='admin'.")

    # Admin normal app access
    admin_farms_resp = requests.get(f"{API_BASE}/farms", headers=admin_headers, timeout=5)
    assert admin_farms_resp.status_code == 200, f"Admin normal access failed: {admin_farms_resp.text}"
    print(f"  Admin Normal App Endpoint (/farms): HTTP {admin_farms_resp.status_code} OK")
    print("  [PASS] Admin normal application features work as expected.")

    # Admin diagnostic endpoint access
    admin_diag_resp = requests.get(f"{API_BASE}/system/diagnostics", headers=admin_headers, timeout=5)
    assert admin_diag_resp.status_code == 200, f"Admin diagnostics request failed: {admin_diag_resp.text}"
    diag_data = admin_diag_resp.json()
    print(f"  Admin Diagnostic Request: HTTP {admin_diag_resp.status_code} OK")
    print(f"  Diagnostic Status: {diag_data['status']} | Authorized Admin: {diag_data['authorized_admin']}")
    print(f"  Persistence Layer: {diag_data['database']['persistence_layer']}")
    print(f"  Registered Subsystems: {len(diag_data['subsystems'])}")
    for sub in diag_data["subsystems"]:
        print(f"    - {sub['name']} ({sub['version']}) -> {sub['status']}")
    print("  [PASS] Admin access to System Diagnostics verified with full telemetry.")

    print("\n" + "=" * 75)
    print("ALL REAL FIREBASE ROLE-BASED ACCESS VERIFICATIONS COMPLETED SUCCESSFULLY!")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    run_verification()
