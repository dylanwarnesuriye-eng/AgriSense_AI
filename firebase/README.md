# Firebase Development Configuration

This directory contains templates for local Firebase development and Cloud Firestore security rules.

## Local Emulators

To run local emulators for Auth and Firestore without connecting to cloud projects:

1. Ensure the Firebase CLI is installed (`npm install -g firebase-tools`).
2. Run from this directory:
   ```bash
   firebase emulators:start
   ```
   - Firestore Emulator: `localhost:8080`
   - Auth Emulator: `localhost:9099`
   - Emulator UI: `http://localhost:4000`

## Linking a Cloud Project

Before deploying rules or connecting to a live Firebase project:
1. Confirm the selected development project ID.
2. Copy `.firebaserc.example` to `.firebaserc` and update `projects.default` with your authorized development project ID.
3. Keep production credentials isolated from development environments.
