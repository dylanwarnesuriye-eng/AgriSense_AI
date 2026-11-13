"""AgriSense AI - Administrator Provisioning Script.

Usage:
  # Promote a user to administrator by email
  python scripts/set_user_role.py --email admin@agrisense.dev --role admin

  # Set a user back to farmer
  python scripts/set_user_role.py --email farmer@agrisense.dev --role farmer

  # Set role by UID
  python scripts/set_user_role.py --uid <FIREBASE_UID> --role admin

  # List all users in Cloud Firestore and their current roles
  python scripts/set_user_role.py --list
"""
import argparse
import os
import sys
from datetime import datetime, timezone

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.firebase import get_firestore_client, init_firebase_admin
from firebase_admin import auth


def main():
    parser = argparse.ArgumentParser(description="AgriSense AI - Set User Role in Cloud Firestore")
    parser.add_argument("--email", help="Firebase user email address")
    parser.add_argument("--uid", help="Firebase user UID")
    parser.add_argument("--role", choices=["farmer", "admin"], help="Role to assign ('farmer' | 'admin')")
    parser.add_argument("--list", action="store_true", help="List all users and current roles in Cloud Firestore")

    args = parser.parse_args()

    success = init_firebase_admin()
    if not success:
        print("[ERROR] Firebase Admin SDK could not be initialized.")
        sys.exit(1)

    client = get_firestore_client()
    if not client:
        print("[ERROR] Cloud Firestore client unavailable.")
        sys.exit(1)

    if args.list:
        print("\n=== Registered Users in Cloud Firestore ===")
        docs = list(client.collection("users").stream())
        if not docs:
            print("No user documents found.")
        for d in docs:
            data = d.to_dict() or {}
            print(f"- UID: {d.id} | Email: {data.get('email', 'N/A')} | Role: {data.get('role', 'farmer')} | Name: {data.get('display_name', 'N/A')}")
        print("==========================================\n")
        return

    if not args.role:
        print("[ERROR] --role ('farmer' or 'admin') is required when modifying a user.")
        sys.exit(1)

    target_uid = args.uid
    target_email = args.email

    # Resolve UID from email if provided
    if target_email and not target_uid:
        try:
            fb_user = auth.get_user_by_email(target_email)
            target_uid = fb_user.uid
            print(f"[INFO] Resolved UID for {target_email}: {target_uid}")
        except Exception as e:
            print(f"[ERROR] Could not find Firebase user with email {target_email}: {e}")
            sys.exit(1)

    if not target_uid:
        print("[ERROR] Either --email or --uid must be provided.")
        sys.exit(1)

    # Update Cloud Firestore user document
    now = datetime.now(timezone.utc).isoformat()
    doc_ref = client.collection("users").document(target_uid)
    existing_doc = doc_ref.get()

    update_payload = {
        "role": args.role,
        "updated_at": now,
    }
    if target_email:
        update_payload["email"] = target_email

    if existing_doc.exists:
        doc_ref.set(update_payload, merge=True)
    else:
        update_payload["created_at"] = now
        update_payload["uid"] = target_uid
        doc_ref.set(update_payload)

    print(f"\n[SUCCESS] Successfully assigned role '{args.role}' to user UID: {target_uid}")
    if target_email:
        print(f"         User Email: {target_email}")
    print(f"         Cloud Firestore path: users/{target_uid}\n")


if __name__ == "__main__":
    main()
