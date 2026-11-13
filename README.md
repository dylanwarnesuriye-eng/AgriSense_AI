# AgriSense AI — Intelligent Agronomic Decision Support Platform

An end-to-end precision agriculture research prototype integrating four specialized Artificial Intelligence (AI) subsystems with a two-stage human-in-the-loop farmer confirmation workflow, multi-tenant Firebase Authentication, and Cloud Firestore persistence.

---

## 1. Project Overview

**AgriSense AI** is an academic software engineering and computational decision-support prototype designed to evaluate how diverse Artificial Intelligence techniques can assist in agricultural planning. 

In real-world agriculture, farmers face complex, interdependent management decisions under uncertain environmental and soil conditions. Rather than forcing a single machine learning model to solve every agricultural problem, AgriSense AI combines four specialized AI paradigms into a cohesive decision pipeline:
1. **Supervised Classification (Decision Tree)** for soil-climate crop suitability.
2. **Fuzzy Logic (Mamdani Inference)** for soil moisture deficit and weather-based irrigation scheduling.
3. **Knowledge-Based Expert System (Forward Chaining)** for stoichiometric soil nutrient diagnosis and fertilizer application.
4. **Supervised Regression (Ridge Regression)** for harvest yield estimation.

> [!IMPORTANT]
> **Academic Prototype Notice:**  
> AgriSense AI is an **educational and research decision-support prototype**, not an officially certified agricultural extension platform. Model predictions and rule evaluations are simulated decision aids and must not be treated as certified real-world agronomic directives.

---

## 2. Problem Statement

Smallholder and commercial farmers must frequently make high-stakes operational decisions—such as what crop to plant, when to irrigate, how much fertilizer to apply, and what harvest volume to expect—based on fragmented, multidimensional data (soil chemistry, rainfall, ambient temperature, humidity, and plot area).

Standard agricultural decision problems exhibit distinct mathematical characteristics:
- **Crop suitability** involves clear boundary decisions across discrete botanical categories, well suited for interpretable tree-based partitioning.
- **Irrigation demand** involves continuous, vague, and conflicting environmental indicators (e.g., "high soil moisture" vs. "severe atmospheric evaporative demand"), making rigid boolean logic brittle and uncalibrated empirical regression inappropriate.
- **Fertilizer management** requires deterministic agronomic balance principles, stoichiometric chemical constraints, and safety safeguards that purely empirical models violate when observational datasets reflect historical farmer misapplication.
- **Yield prediction** is a continuous regression problem subject to severe spatial correlation and environmental interactions.

Combining distinct AI techniques—supervised classification, fuzzy inference, expert knowledge engineering, and regularized regression—provides targeted, explainable, and robust support across different phases of the crop cultivation cycle.

---

## 3. Project Objectives

The implemented AgriSense AI platform supports the following specific engineering and research objectives:

1. **Crop Recommendation**: Evaluate soil macronutrients ($N, P, K$) and environmental factors to suggest optimal candidate crops from 22 botanical classes.
2. **Irrigation Advisory Simulation**: Model soil-water depletion, atmospheric evaporative demand, and effective rainfall via fuzzy logic to compute irrigation urgency scores and recommended application intervals.
3. **Fertilizer Advisory System**: Diagnose soil macronutrient status ($N, P, K$) and derive commercial product application rates (Urea, DAP, MOP) using a forward-chaining expert rule base.
4. **Crop Yield Prediction**: Forecast continuous crop yields ($t/\text{ha}$) and total production using regularized regression with grouped spatial validation.
5. **Two-Stage Human-in-the-Loop Workflow**: Enforce an explicit farmer confirmation gate between Stage A (candidate crop proposal) and Stage B (downstream advisory and yield forecasting), preventing unverified autonomous actions.
6. **Farm & Telemetry Management**: Manage multi-tenant farm entities, field plots, and typed soil/climate sensor measurements.
7. **Assessment Audit History**: Persist immutable assessment audit records with complete input snapshots and model version tags.
8. **Role-Based Security & Internal Diagnostics**: Protect system operations using Firebase Authentication and server-authoritative role verification (`farmer` vs. `admin`), isolating internal system diagnostics from regular user accounts.

---

## 4. AI Components

| Component | AI Technique | Purpose | Main Inputs | Output | Status & Boundaries |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Crop Recommendation** | Multi-Class Decision Tree (`max_depth=12`, Gini criterion) | Predicting a recommended crop class based on environmental & soil inputs | $N, P, K$, ambient temperature ($^\circ\text{C}$), relative humidity ($\%$), soil $\text{pH}$, rainfall ($\text{mm}$) | Recommended crop label | Software Verified; supports **22 botanical classes**. Discrete leaf classification; raw probabilities uncalibrated. |
| **2. Irrigation Advisory** | Mamdani Fuzzy Logic Inference (36 rules, Centroid defuzzification) | Determine irrigation urgency and scheduling intervals without arbitrary empirical fitting | Soil-water depletion ($\%$), atmospheric water demand index ($0\text{--}100$), effective rainfall ($\text{mm}$), paddy water depth ($\text{cm}$) | Urgency score ($0\text{--}100$), urgency category, interval (days), explanation trace | Academic Simulation; `draft_unvalidated` rule status. Dedicated standing-water pathway for flooded paddy rice. |
| **3. Fertilizer Advisory** | Knowledge-Based Expert System (Deterministic Forward Chaining) | Diagnose soil nutrient deficits and calculate stoichiometric fertilizer requirements | Soil test $N, P, K$, soil $\text{pH}$, crop type, growth stage, field area ($\text{ha}$), prior applications | Qualitative nutrient status, elemental deficits ($\text{kg/ha}$), commercial product rates ($\text{kg/ha}$ & total $\text{kg}$) | Academic Simulation; `draft_unvalidated` rule status. Resolves rule conflicts by precedence; loops capped at 20 iterations. |
| **4. Yield Prediction** | Supervised Ridge Regression Pipeline ($\alpha=1.0$, L2 regularization) | Predict harvest yield per hectare and total field harvest weight | Crop type, region, season, soil $\text{pH}$, moisture, rainfall, temperature, fertilizer & pesticide index | Predicted yield ($t/\text{ha}$), total production (tonnes) | Software Verified; strictly constrained to **5 whitelisted crops** (`Wheat`, `Barley`, `Corn`, `Rice`, `Soybean`). |

---

## 5. System Architecture

```
                                  [ Farmer / Administrator ]
                                               │
                                               ▼
                ┌─────────────────────────────────────────────────────────────┐
                │          React 18 + TypeScript + Vite SPA (Tailwind CSS)     │
                │              Google Stitch Daylight Precision Design        │
                └──────────────┬───────────────────────────────┬──────────────┘
                               │                               │
                 Firebase Auth │ (ID Token)         API Client │ (Bearer Token)
                               ▼                               ▼
                ┌──────────────────────────────┐ ┌─────────────────────────────┐
                │ Firebase Authentication      │ │ FastAPI Backend (Python)    │
                │ (Email/Password Identity)    │ │ /api/v1 REST Endpoints      │
                └──────────────────────────────┘ └──────────────┬──────────────┘
                                                                │
                                   ┌────────────────────────────┼────────────────────────────┐
                                   ▼                            ▼                            ▼
                      ┌────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
                      │ Core Security          │  │ Two-Stage Orchestrator    │  │ System Diagnostics        │
                      │ - verify_token         │  │ - Stage A: Recommendation │  │ - Subsystem Registry      │
                      │ - require_admin        │  │ - Farmer Confirmation     │  │ - Artifact Versions       │
                      │ - resource_ownership   │  │ - Stage B: Multi-Engine   │  │ - Health & Status         │
                      └────────────────────────┘  └─────────────┬─────────────┘  └───────────────────────────┘
                                                                │
                         ┌──────────────────────────────────────┼──────────────────────────────────────┐
                         ▼                                      ▼                                      ▼
            ┌─────────────────────────┐            ┌─────────────────────────┐            ┌─────────────────────────┐
            │ Decision Tree Engine    │            │ Mamdani Fuzzy Engine    │            │ Forward Chaining KB     │
            │ (22 Crop Classifier)    │            │ (Irrigation Advisory)   │            │ (Fertilizer Engine)     │
            └─────────────────────────┘            └─────────────────────────┘            └─────────────────────────┘
                         │                                      │                                      │
                         └──────────────────────────────────────┼──────────────────────────────────────┘
                                                                ▼
                                                   ┌─────────────────────────┐
                                                   │ Ridge Regression Engine │
                                                   │ (5-Crop Yield Regressor)│
                                                   └────────────┬────────────┘
                                                                │
                                                                ▼
                                                ┌─────────────────────────────┐
                                                │ Google Cloud Firestore      │
                                                │ - users (roles)             │
                                                │ - farms & field plots       │
                                                │ - soil/climate measurements │
                                                │ - assessment audit trail    │
                                                └─────────────────────────────┘
```

### The Two-Stage Assessment Workflow

To prevent artificial intelligence models from acting as autonomous black boxes, AgriSense AI implements an architectural human-in-the-loop invariant:

1. **Stage A (Crop Recommendation Proposal)**:
   - Farmer enters initial soil and climate telemetry ($N, P, K, \text{temp}, \text{humidity}, \text{pH}, \text{rainfall}$).
   - The Decision Tree predicts the most suitable candidate crop along with potential agronomic alternatives.
2. **Farmer Confirmation Gate**:
   - The platform pauses execution.
   - The farmer reviews the recommendation and explicitly **confirms** or **overrides** the crop choice.
   - Downstream models cannot run without this explicit confirmation.
3. **Stage B (Multi-Engine Advisory & Forecasting)**:
   - The confirmed crop is dispatched to the Mamdani Irrigation Engine and Fertilizer Knowledge Base.
   - If the confirmed crop belongs to the 5-crop yield whitelist, the Ridge Regression pipeline computes expected yield ($t/\text{ha}$). If unsupported, yield execution is cleanly bypassed with an explicit `unsupported_crop` status and zero fabricated numbers.
   - An immutable assessment audit record is generated and persisted in Cloud Firestore.

---

## 6. Datasets

The machine learning components were trained and evaluated on two agricultural datasets stored in `backend/data/`:

### 6.1 Crop Recommendation Dataset (`Crop_recommendation.csv`)
- **Total Records**: 2,200 samples (balanced: exactly 100 samples per crop class).
- **Features**: 7 numerical input features + 1 target class:
  - `N`: Nitrogen content (observed range: $0\text{--}140$, mean: $50.55 \pm 36.92$).
  - `P`: Phosphorus content (observed range: $5\text{--}145$, mean: $53.36 \pm 32.99$).
  - `K`: Potassium content (observed range: $5\text{--}205$, mean: $48.15 \pm 50.65$).
  - `temperature`: Ambient temperature in $^\circ\text{C}$ (range: $8.83\text{--}43.68^\circ\text{C}$, mean: $25.62 \pm 5.06^\circ\text{C}$).
  - `humidity`: Relative humidity in $\%$ (range: $14.26\text{--}99.98\%$, mean: $71.48 \pm 22.26\%$).
  - `ph`: Soil reaction pH units (range: $3.50\text{--}9.94$, mean: $6.47 \pm 0.77$).
  - `rainfall`: Rainfall in $\text{mm}$ (range: $20.21\text{--}298.56\text{ mm}$, mean: $103.46 \pm 54.96\text{ mm}$).
- **Target**: `label` covering **22 crops**: `apple`, `banana`, `blackgram`, `chickpea`, `coconut`, `coffee`, `cotton`, `grapes`, `jute`, `kidneybeans`, `lentil`, `maize`, `mango`, `mothbeans`, `mungbean`, `muskmelon`, `orange`, `papaya`, `pigeonpeas`, `pomegranate`, `rice`, `watermelon`.
- **Quality**: 0 missing values, 0 duplicate rows.

### 6.2 Crop Yield Dataset (`crop_yield_train.csv` & `crop_yield_test.csv`)
- **Total Records**: 4,800 training rows, 1,200 test rows across 498 unique field plots (`field_id`).
- **Target Variable**: `yield_tpha` (continuous crop yield in metric tonnes per hectare, observed range: $2.34\text{--}9.54\text{ t/ha}$, mean: $6.27 \pm 1.15\text{ t/ha}$).
- **Features**: 17 input attributes spanning soil properties (`soil_ph`, `soil_moisture`), seasonal climate (`avg_temperature`, `total_rainfall`, `sunlight_hours`), macronutrient concentrations (`nitrogen_content`, `phosphorus_content`, `potassium_content`), crop management (`fertilizer_amount`, `pesticide_usage`, `irrigation_frequency`), and categorical contextual tags:
  - `crop_type` (5 crops: `Barley`, `Corn`, `Rice`, `Soybean`, `Wheat`).
  - `region` (5 zones: `Central`, `East`, `North`, `South`, `West`).
  - `season` (3 seasons: `Autumn`, `Spring`, `Summer`).
  - `field_id` (498 distinct plots; 99.8% field overlap between train and test).

### 6.3 Crucial Cross-Dataset Incompatibilities & Boundary Handling
1. **Scope Mismatch (22 Crops vs. 5 Crops)**:
   - Crop Recommendation supports 22 crops, whereas Crop Yield Prediction supports **only 5 crops**.
   - Cross-domain integration is limited to **Rice** and **Corn/Maize** (`maize` $\leftrightarrow$ `Corn`, `rice` $\leftrightarrow$ `Rice`).
   - The platform never fabricates yield forecasts for the remaining 20 recommendation crops.
2. **Macronutrient Scale Disparity**:
   - Recommendation dataset features $N, P, K$ range between $0$ and $205$ (soil test index / available $\text{kg/ha}$).
   - Yield dataset features `nitrogen_content`, `phosphorus_content`, `potassium_content` range between $0.2\%$ and $3.0\%$ (percentage dry weight).
   - Direct numerical substitution across datasets is strictly forbidden.
3. **Unresolved Units**:
   - The rainfall observation window (monthly vs. cumulative seasonal) in the recommendation dataset is unspecified.
   - Commercial fertilizer formulation and active pesticide ingredient types in the yield dataset are unstated.

---

## 7. Model Development and Results

### 7.1 Decision Tree Crop Recommendation (`crop_decision_tree_v1.0.joblib`)
- **Training Strategy**: Stratified train/test split (80% development = 1,760 samples; 20% holdout = 440 samples). 5-fold Stratified Cross-Validation optimizing for macro F1.
- **Hyperparameters**: `criterion="gini"`, `max_depth=12`, `min_samples_split=5`, `min_samples_leaf=1`, `ccp_alpha=0.0`. Resulting tree: 31 leaf nodes.
- **Top Feature Importances**: `rainfall` (32.1%), `P` (22.6%), `humidity` (20.0%), `N` (14.5%), `K` (9.9%), `ph` (0.6%), `temperature` (0.3%).
- **Evaluation Metrics**:
  - **CV Macro F1**: `0.9864`
  - **Holdout Test Accuracy**: `97.95%` (431 / 440 correct)
  - **Holdout Test Macro F1**: `0.9794`
  - **Holdout Test Macro Precision**: `0.9810`
  - **Holdout Test Macro Recall**: `0.9795`

### 7.2 Ridge Regression Crop Yield Prediction (`yield_regressor_v1.0.joblib`)
- **Validation Strategy**: 5-Fold Grouped Cross-Validation grouped by `field_id` (498 plots) to eliminate spatial data leakage across plots.
- **Model Selection**: Ridge Regression Pipeline ($\alpha=1.0$, standard scaling for numerical features, one-hot encoding for categorical variables) with Extended Features.
- **Top Coefficients**: `fertilizer_amount` (+0.8793), `pesticide_usage` (-0.2675), `total_rainfall` (+0.2055), `soil_moisture` (+0.0765), `nitrogen_content` (+0.0667).
- **Evaluation Metrics**:
  - **Grouped CV MAE**: `0.5110 t/ha`
  - **Grouped CV RMSE**: `0.6433 t/ha`
  - **Grouped CV R²**: `0.6893`
  - **Untouched Grouped Holdout (935 records)**:
    - **Holdout MAE**: `0.5180 t/ha`
    - **Holdout RMSE**: `0.6424 t/ha`
    - **Holdout R²**: `0.6846`
    - **Prediction Bias (Mean Residual)**: `-0.0271 t/ha`
  - **Per-Crop Holdout Performance**:
    - **Wheat**: MAE $0.5189\text{ t/ha}$, RMSE $0.6351\text{ t/ha}$, $R^2 = 0.7101$
    - **Barley**: MAE $0.5623\text{ t/ha}$, RMSE $0.6915\text{ t/ha}$, $R^2 = 0.6248$
    - **Corn**: MAE $0.4874\text{ t/ha}$, RMSE $0.6037\text{ t/ha}$, $R^2 = 0.7342$
    - **Rice**: MAE $0.4795\text{ t/ha}$, RMSE $0.6010\text{ t/ha}$, $R^2 = 0.6946$
    - **Soybean**: MAE $0.5450\text{ t/ha}$, RMSE $0.6797\text{ t/ha}$, $R^2 = 0.6457$

### 7.3 Mamdani Fuzzy Irrigation Advisory (`fuzzy_irrigation_v1.0`)
- **Inference Cycle**: Fuzzification via triangular ($\text{trimf}$) and trapezoidal ($\text{trapmf}$) membership functions $\rightarrow$ minimum antecedent conjunction ($\text{AND}$) $\rightarrow$ minimum implication clipping $\rightarrow$ maximum union aggregation $\rightarrow$ numerical Centroid defuzzification over 101 points ($u \in [0, 100]$).
- **Rule Base**: 36 comprehensive antecedent rules covering Soil-Water Depletion (Low, Moderate, High, Critical), Atmospheric Demand (Low, Moderate, High, Extreme), and Effective Rainfall (None, Light, Moderate, Heavy).
- **Specialized Pathway**: Dedicated standing-water depth logic for flooded paddy rice ($0\text{--}15\text{ cm}$).
- **Status**: Research prototype; operating under `draft_unvalidated` status.

### 7.4 Knowledge-Based Fertilizer Advisory (`kb_fertilizer_v0.1_draft`)
- **Inference Cycle**: Deterministic forward-chaining production system with conflict resolution based on rule precedence and source provenance. Loop detection halts inference at a maximum of 20 iterations.
- **Stoichiometry**: Converts elemental nutrient deficits ($N, \text{P}_2\text{O}_5, \text{K}_2\text{O}$) to commercial fertilizer formulations (Urea 46-0-0, DAP 18-46-0, MOP 0-0-60).
- **Analytical Standards**: Calibrated against standard analytical thresholds (Kjeldahl Nitrogen $\%$, Olsen Phosphorus $\text{mg/kg}$, Ammonium Acetate Potassium $\text{mg/kg}$).
- **Status**: Research prototype; operating under `draft_unvalidated` status.

---

## 8. Authentication and Security

AgriSense AI implements a zero-trust, server-authoritative security model:

- **Firebase Authentication**: User identities are authenticated via Firebase Email/Password Authentication. The frontend transmits a cryptographically signed Firebase ID token with each API request.
- **FastAPI Token Verification**: The backend verifies token signatures, project claims, and expiration using the Firebase Admin SDK (`verify_id_token`).
- **Server-Authoritative Role Authorization (`require_admin`)**:
  - User roles (`farmer` or `admin`) are stored strictly in Cloud Firestore (`users/{uid}.role`).
  - Public registration strictly assigns the `farmer` role. The API refuses or ignores any client-supplied role parameter.
  - The `require_admin` dependency checks the user document in Firestore on every privileged request. Unauthorized requests receive **`HTTP 403 Forbidden`**, and unauthenticated requests receive **`HTTP 401 Unauthorized`**.
  - Administrator accounts are provisioned exclusively through secure out-of-band channels (Firebase Console or trusted CLI script).
- **Multi-Tenant Ownership Isolation**: All farm and assessment data models enforce `owner_uid == current_user.uid`. Attempted cross-tenant data access is denied with `HTTP 403`.
- **Production Safeguards**: Silent in-memory database fallback (`ALLOW_IN_MEMORY_FALLBACK=False`) and mock authentication tokens (`ALLOW_MOCK_TOKENS=False`) are disabled in production configurations. Private service account keys are excluded from source control.

---

## 9. Firebase & Cloud Firestore Persistence

AgriSense AI integrates directly with **Google Cloud Firestore** across four core collections:

1. **`users`**:
   - Schema: `uid`, `email`, `display_name`, `role` (`"farmer"` | `"admin"`), `created_at`, `updated_at`.
   - Authoritative source for role-based authorization.
2. **`farms`**:
   - Schema: `farm_id`, `owner_uid`, `name`, `location`, `total_area_hectares`, `fields`, `created_at`, `updated_at`.
   - Contains nested field plots (`field_id`, `name`, `soil_type`, `crop_currently_planted`, `measurements`).
3. **`assessments`**:
   - Schema: `assessment_id`, `owner_uid`, `timestamp`, `farm_id`, `field_id`, `stage_a_id`, `farmer_confirmed_crop`, `irrigation_result`, `fertilizer_result`, `yield_result`, `overall_status`, `model_versions`.
   - Serves as the immutable historical audit trail of all farmer-confirmed evaluations.

---

## 10. User Workflows

### 10.1 Farmer Workflow
1. **Authentication**: Register or log in via the public sign-in portal.
2. **Farm Management**: Create farm entities and field plots; input soil test telemetry ($N, P, K, \text{pH}$, moisture) and seasonal climate readings.
3. **Stage A Recommendation**: Trigger the crop recommendation classifier to view the top suitable crop proposal.
4. **Stage B Confirmation**: Explicitly confirm the recommended crop or select an agronomic override.
5. **Multi-Engine Evaluation**: View computed irrigation urgency scores, fertilizer product dosages, and harvest yield forecasts (for supported crops).
6. **Audit Trail**: Review historical assessments in the Assessment Audit Trail.
7. **Account Settings**: Manage profile display name, change password via email reset, and set measurement unit preferences (Metric vs. Imperial).

### 10.2 Administrator Workflow
1. **Authentication**: Log in with an administrator account provisioned out-of-band.
2. **Application Access**: Access all standard farm management and assessment features.
3. **System Diagnostics Portal**: Access the dedicated **ADMIN / SYSTEM &rarr; System Diagnostics** view:
   - Inspect AI subsystem registry, model architectures, and artifact versions.
   - Monitor live FastAPI health, backend environment, and API routing.
   - Verify Cloud Firestore persistence status (`Cloud Firestore — Live Persistence`).
   - Execute live backend ping checks via `/api/v1/system/diagnostics`.

---

## 11. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 (TypeScript 5.7) | Single-page reactive user interface |
| **Frontend Tooling** | Vite 6.0 | Build tool, HMR dev server, production bundling |
| **Styling & Design** | Tailwind CSS 3.4 | Google Stitch Daylight Precision design system |
| **Icons & UI** | Lucide React | Agricultural and administrative iconography |
| **Backend Framework** | Python 3.13 / 3.11+, FastAPI 0.115+ | High-performance asynchronous REST API |
| **Server Runtime** | Uvicorn (ASGI) | Production ASGI web server |
| **Data Validation** | Pydantic v2 | Strict request/response schema serialization |
| **Machine Learning** | scikit-learn 1.6+, NumPy 2.2+ | Decision Tree and Ridge Regression pipelines |
| **Model Serialization** | Joblib | Model artifact storage and inference loading |
| **Fuzzy Inference** | Custom Python Engine | Vectorized triangular/trapezoidal Mamdani logic |
| **Expert System** | Custom Python Engine | Deterministic forward-chaining rule engine |
| **Identity & Database** | Firebase Authentication, Cloud Firestore | Cloud identity provider & NoSQL multi-tenant database |
| **Admin SDK** | Firebase Admin SDK 6.6+ (Python) | Server-side token verification and database operations |
| **Client SDK** | Firebase JS SDK 10.14+ | Client-side authentication and session state |
| **Testing (Backend)** | Pytest 8.4, pytest-asyncio, HTTPX | Automated backend unit, API, and security tests |
| **Testing (Frontend)** | Vitest 5.0, React Testing Library, JSDOM | Component unit and integration testing |
| **Testing (E2E)** | Playwright 1.63 | Cross-browser full-journey end-to-end testing |

---

## 12. Project Structure

```
AgriSense-AI/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── assessment_orchestrator.py # Two-Stage workflow endpoints
│   │   │   │   ├── crop_recommendation.py     # Standalone crop classification
│   │   │   │   ├── diagnostics.py             # Admin-only system diagnostics
│   │   │   │   ├── farm_management.py         # Farms, fields, and measurements
│   │   │   │   ├── fertilizer_advisory.py     # Standalone fertilizer expert system
│   │   │   │   ├── health.py                  # Public health check
│   │   │   │   ├── irrigation_advisory.py     # Standalone fuzzy irrigation
│   │   │   │   ├── users.py                   # Profile and role synchronization
│   │   │   │   └── yield_prediction.py        # Standalone yield regression
│   │   │   └── api.py                         # Root router aggregator
│   │   ├── core/
│   │   │   ├── auth.py                        # Token verification, require_admin
│   │   │   └── config.py                      # Application settings & environment
│   │   ├── modules/                           # 4 Isolated AI subsystems
│   │   │   ├── assessment_orchestrator/       # Two-stage workflow orchestration
│   │   │   ├── crop_recommendation/           # Decision tree classifier
│   │   │   ├── farm_management/               # Agronomic data contracts
│   │   │   ├── fertilizer_advisory/           # Forward-chaining expert system
│   │   │   ├── irrigation_advisory/           # Mamdani fuzzy inference engine
│   │   │   └── yield_prediction/             # Ridge regression pipeline
│   │   ├── services/
│   │   │   ├── firebase.py                    # Firebase Admin SDK initialization
│   │   │   └── firestore_repo.py              # Cloud Firestore repository layer
│   │   └── main.py                            # FastAPI application factory
│   ├── data/
│   │   ├── Crop_recommendation.csv            # 22-crop recommendation dataset
│   │   ├── crop_yield_train.csv               # 5-crop yield training dataset
│   │   ├── crop_yield_test.csv                # 5-crop yield test dataset
│   │   └── DATA_DICTIONARY.md                 # Formal dataset schema dictionary
│   ├── models/saved/
│   │   ├── crop_decision_tree_v1.0.joblib     # Serialized Decision Tree artifact
│   │   └── yield_regressor_v1.0.joblib        # Serialized Ridge Regressor artifact
│   ├── scripts/
│   │   ├── set_user_role.py                   # Admin role provisioning CLI
│   │   ├── verify_real_firebase.py            # Persistence verification script
│   │   └── verify_role_access_real.py         # Live Firebase role verification script
│   ├── tests/                                 # Pytest test suite (104 tests)
│   ├── requirements.txt                       # Production dependencies
│   ├── requirements-dev.txt                   # Testing dependencies
│   └── .env.example                           # Backend configuration template
├── frontend/
│   ├── e2e/
│   │   └── user_journey.spec.ts               # Playwright 13-screen end-to-end journey
│   ├── src/
│   │   ├── components/                        # Google Stitch UI components
│   │   ├── context/
│   │   │   └── AuthContext.tsx                # Role-aware authentication context
│   │   ├── features/                          # Screen views
│   │   │   ├── account/                       # Account Settings view
│   │   │   ├── auth/                          # Login, Register, Forgot Password
│   │   │   ├── crop-recommendation/           # Recommendation & confirmation views
│   │   │   ├── dashboard/                     # Main dashboard view
│   │   │   ├── farm-management/               # Farms, field plots, telemetry
│   │   │   ├── fertilizer-advisory/           # Fertilizer expert system view
│   │   │   ├── irrigation-advisory/           # Fuzzy irrigation advisory view
│   │   │   ├── orchestrator/                  # Workflow, history, results views
│   │   │   ├── settings/                      # System Diagnostics view
│   │   │   └── yield-prediction/              # Yield prediction view
│   │   ├── hooks/                             # useBackendHealth, custom hooks
│   │   ├── services/
│   │   │   ├── api.ts                         # Dynamic REST client with token refresh
│   │   │   └── firebase.ts                    # Firebase JS SDK client
│   │   ├── types/                             # TypeScript data contracts
│   │   ├── App.tsx                            # Root application & screen routing
│   │   └── main.tsx                           # Application entrypoint
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example                           # Frontend configuration template
├── docs/
│   └── ADMIN_PROVISIONING.md                  # Administrator provisioning guide
├── firebase/
│   ├── firebase.json                          # Emulator port bindings
│   └── firestore.rules                        # Cloud Firestore security rules
├── .gitignore
└── README.md
```

---

## 13. Testing and Verification

The platform is backed by comprehensive automated test suites spanning unit, API, integration, security, and end-to-end browser testing:

| Test Suite | Framework / Tool | Verified Result | Scope Covered |
| :--- | :--- | :--- | :--- |
| **Backend Unit & API** | Pytest (`pytest tests/`) | **104 passed** (1.40s) | AI module contracts, fuzzy rules, expert system precedence, regression leakage prevention, and CRUD operations. |
| **Role Authorization** | Pytest (`test_role_authorization.py`) | **7 passed** | 401 unauthenticated rejection, 403 farmer restriction, 200 admin access, public signup defaults, and Firestore lookup. |
| **Frontend Unit & Integration** | Vitest (`vitest run`) | **40 passed** (7 test files) | Auth loading guards, role-based sidebar visibility, Account Settings vs. Diagnostics separation, health badge sync. |
| **Frontend Production Build** | Vite (`tsc && vite build`) | **Zero errors** (2.20s) | Strict TypeScript compiler validation and optimized Rollup chunking. |
| **End-to-End User Journey** | Playwright (`user_journey.spec.ts`) | **13-screen journey** | Complete farmer lifecycle: sign-in, farm creation, Stage A recommendation, Stage B confirmation, and sign-out. |
| **Live Cloud Verification** | Python verification scripts | **Verified live** | Real Firebase ID token exchange, live Cloud Firestore persistence across server restarts, and real role enforcement. |

---

## 14. Safety and Validation Limitations

AgriSense AI operates under explicit research boundaries and agronomic limitations:

1. **Academic Decision Support Only**:
   - The platform is an academic engineering demonstration. No legal or commercial agricultural warranties are provided, and the system lacks agronomic certification and field validation.
2. **Draft / Unvalidated Advisory Rules**:
   - The Mamdani 36-rule irrigation base and the forward-chaining fertilizer knowledge base operate under `draft_unvalidated` status.
   - Recommended irrigation depths and fertilizer application quantities have not been validated through localized agronomic field trials and must not be used as operational field directives.
3. **Uncalibrated Model Confidence**:
   - The Decision Tree classifier outputs discrete class predictions. Leaf-frequency probability estimates are uncalibrated and are not presented as probabilistic confidence scores.
4. **Strict Yield Whitelist Limitation**:
   - Supervised yield prediction is valid strictly for **5 crops** (`Wheat`, `Barley`, `Corn`, `Rice`, `Soybean`). Predictions for all other 20 recommendation crops are withheld.
5. **Cross-Dataset Incompatibilities**:
   - Macronutrient units differ between datasets (index $0\text{--}205$ vs. percentage $0.2\text{--}3.0\%$).
   - Datasets lack standardized meteorological observation periods (e.g., rainfall observation duration).
6. **No Real-World Agronomic Certification and Field Validation**:
   - The models have not undergone agronomic certification and field validation from agricultural extension services or domain agronomists.

---

## 15. Future Work

Real-world deployment of the concepts prototyped in AgriSense AI would require the following planned engineering and agronomic advancements:

- **Agronomist Rule Certification**: Formal review and calibration of the Mamdani fuzzy membership functions and fertilizer production rules by certified agronomists.
- **Localized Soil Chemistry Calibration**: Integration of regional soil test calibration curves (e.g., Bray-1 vs. Olsen extraction methods).
- **Expanded Yield Coverage**: Training regression pipelines on broader, multi-regional datasets covering fruit, vegetable, and pulse varieties.
- **Probability Calibration**: Applying isotonic regression or Platt scaling to output reliable Bayesian prediction confidence for crop recommendation.
- **IoT Sensor Ingestion**: Direct integration with MQTT/LoRaWAN field telemetry nodes for real-time soil moisture and microclimate streaming.
- **Localized Weather Forecast APIs**: Ingestion of multi-day Numerical Weather Prediction (NWP) forecasts for predictive irrigation scheduling.

---

## 16. Academic Disclaimer

> **ACADEMIC DISCLAIMER**  
> AgriSense AI was developed as an academic software engineering and computational decision-support project for educational and research evaluation. Its outputs should **not** be treated as certified agricultural recommendations or field application directives. Real-world agricultural deployment requires validation by qualified agricultural professionals, standardized laboratory soil measurements, locally calibrated agronomic rules, and multi-season field trials.

---

## 17. Getting Started

### Prerequisites
- **Python 3.11+** (Python 3.13 tested)
- **Node.js 18+** (Node 22 / 24 LTS tested)
- **npm 9+**
- Active **Google Cloud Firebase Project** with Firestore and Email/Password Authentication enabled.

### Backend Setup
1. Navigate to `backend/` and initialize a virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   # Windows:
   .\.venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt -r requirements-dev.txt
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Provide your Firebase service account key path and Firebase Project ID.
4. Run backend automated tests:
   ```bash
   pytest tests/
   ```
5. Launch the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Interactive OpenAPI documentation: `http://127.0.0.1:8000/docs`

### Frontend Setup
1. Navigate to `frontend/`:
   ```bash
   cd frontend
   npm install
   ```
2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Configure your Firebase Web App credentials (`VITE_FIREBASE_API_KEY`, etc.).
3. Run frontend unit tests:
   ```bash
   npm test -- --run
   ```
4. Build for production:
   ```bash
   npm run build
   ```
5. Start development server:
   ```bash
   npm run dev
   ```
   Application URL: `http://localhost:5173`

---

## 18. Administrator Provisioning

To create an administrator account, use either:
1. **Firebase Web Console**: In Firebase Console &rarr; *Firestore Database* &rarr; `users/{admin_uid}`, set field `role = "admin"`.
2. **Backend CLI Tool**:
   ```powershell
   python backend/scripts/set_user_role.py --email admin@example.com --role admin
   ```
   For full instructions, refer to [`docs/ADMIN_PROVISIONING.md`](file:///d:/AI%20project/docs/ADMIN_PROVISIONING.md).
