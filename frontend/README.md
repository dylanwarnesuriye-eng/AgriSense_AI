# Smart Agriculture AI — Frontend

A React + TypeScript + Vite web application styled with Tailwind CSS.

## Features
- **Modular Subsystem Dashboard**: Cards for each of the 4 AI subsystems.
- **Architectural Boundary Enforcement**:
  - Highlights the 22-crop limitation on Crop Recommendation.
  - Enforces the 5-crop restriction (Wheat, Barley, Corn, Rice, Soybean) on Yield Prediction.
  - Distinguishes the Rice & Corn/Maize integrated cross-module pathway.
- **Firebase Authentication & Firestore Client Scaffolding**: Local emulator support configured via environment variables.

## Running Locally
```bash
npm install
npm run dev
```

## Production Build
```bash
npm run build
```
