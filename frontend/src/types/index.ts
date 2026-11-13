/**
 * Comprehensive API and Data Contracts for AgriSense AI Platform.
 */

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface HealthStatus {
  status: string;
  environment: string;
  version: string;
  timestamp: string;
  modules: {
    crop_recommendation: string;
    irrigation_advisory: string;
    fertilizer_advisory: string;
    yield_prediction: string;
  };
}

// -----------------------------------------------------------------------------
// Authentication Types
// -----------------------------------------------------------------------------
export type UserRole = 'farmer' | 'admin';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  isMock?: boolean;
}

export interface UserProfileResponse {
  uid: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
  created_at?: string | null;
}

export interface SystemDiagnosticsData {
  status: string;
  authorized_admin: string;
  role: string;
  api_environment: string;
  api_version: string;
  database: {
    persistence_layer: string;
    allow_in_memory_fallback: boolean;
    allow_mock_tokens: boolean;
    environment: string;
  };
  subsystems: Array<{
    name: string;
    type: string;
    version: string;
    status: string;
    notes: string;
  }>;
}

// -----------------------------------------------------------------------------
// Farm & Field Management Types
// -----------------------------------------------------------------------------
export type MeasurementSource = 'sensor' | 'lab_test' | 'satellite' | 'manual_entry';

export interface SoilClimateMeasurement {
  measurement_id: string;
  timestamp: string;
  source: MeasurementSource;
  units: Record<string, string>;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  ph: number | null;
  temperature?: number | null;
  temperature_c?: number | null;
  humidity?: number | null;
  relative_humidity_pct?: number | null;
  rainfall?: number | null;
  rainfall_mm?: number | null;
  soil_moisture?: number | null;
  soil_moisture_pct?: number | null;
  verified_units?: boolean;
  notes?: string | null;
}

export interface FieldModel {
  field_id: string;
  farm_id: string;
  name: string;
  area_hectares: number;
  soil_type: string;
  crop_currently_planted?: string | null;
  measurements: SoilClimateMeasurement[];
  created_at: string;
}

export interface FarmModel {
  farm_id: string;
  owner_uid: string;
  name: string;
  location: string;
  total_area_hectares: number;
  notes?: string | null;
  fields: FieldModel[];
  created_at: string;
  updated_at: string;
}

export interface FarmCreate {
  name: string;
  location: string;
  total_area_hectares: number;
  notes?: string;
}

export interface FieldCreate {
  name: string;
  area_hectares: number;
  soil_type: string;
  crop_currently_planted?: string;
}

// -----------------------------------------------------------------------------
// Subsystem Schemas
// -----------------------------------------------------------------------------

// 1. Crop Recommendation Types (Decision Tree - 22 crops)
export interface CropRecommendationInput {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  temperature: number;
  humidity: number;
  ph: number;
  rainfall: number;
  academic_demo_mode?: boolean;
}

export interface CropRecommendationOutput {
  recommended_crop: string;
  model_version: string;
  prediction_status: string;
  confidence: number | null;
  available_crops: string[];
  pathway_available: boolean;
  units_verified: boolean;
  warnings: string[];
}

// 2. Irrigation Advisory Types (Mamdani Fuzzy Logic)
export interface IrrigationAdvisoryInput {
  crop_type?: string;
  crop_growth_stage?: string;
  soil_water_depletion?: number | null;
  soil_water_depletion_pct?: number | null;
  atmospheric_demand?: number | null;
  atmospheric_demand_pct?: number | null;
  effective_rainfall?: number | null;
  effective_rainfall_mm?: number | null;
  paddy_standing_water_cm?: number | null;
  soil_moisture?: number | null;
  ambient_temperature?: number | null;
  relative_humidity?: number | null;
  rainfall_forecast_24h?: number | null;
  field_capacity?: number | null;
  wilting_point?: number | null;
  academic_demo_mode?: boolean;
}

export interface IrrigationAdvisoryOutput {
  selected_crop: string;
  assessment_status: string;
  software_status: string;
  agronomic_approval_status: string;
  is_production_approved: boolean;
  urgency_category: string | null;
  urgency_score: number | null;
  explanation: string;
  activated_rule_ids: string[];
  rule_version: string;
  warnings: string[];
  requires_agronomic_verification: boolean;
  urgency_level?: string;
  advisory_summary?: string;
  advice_summary?: string;
  recommended_interval_days?: number | null;
  active_rule_count?: number;
  fuzzy_water_index?: number | null;
}

// 3. Fertilizer Advisory Types (Rule-Based Expert System)
export interface FertilizerProductRecommendation {
  fertilizer_name?: string;
  product_name?: string;
  target_nutrient: string;
  nutrient_rate_kgha?: number;
  application_rate_kg_ha?: number;
  product_rate_kgha?: number | null;
  total_amount_kg?: number | null;
  total_field_requirement_kg?: number | null;
  calculation_status?: string;
  warnings?: string[];
}

export interface FertilizerAdvisoryInput {
  crop_name?: string;
  crop_type?: string;
  growth_stage?: string | null;
  field_area_ha?: number | null;
  nitrogen?: number | null;
  phosphorus?: number | null;
  potassium?: number | null;
  ph?: number | null;
  soil_ph?: number | null;
  soil_test_method?: string | null;
  soil_test_unit?: string | null;
  region?: string | null;
  cultivation_method?: string | null;
  crop_growth_stage?: string | null;
  field_area_hectares?: number | null;
  previous_applications?: Array<{ nutrient: string; amount_kgha: number }>;
  academic_demo_mode?: boolean;
}

export interface FertilizerAdvisoryOutput {
  selected_crop: string;
  crop_name?: string;
  nutrient_status?: string | Record<string, string>;
  assessment_status: string;
  nutrient_assessment?: Record<string, string>;
  recommended_nutrients_kgha?: Record<string, number>;
  fertilizer_products?: FertilizerProductRecommendation[];
  product_recommendations?: FertilizerProductRecommendation[];
  activated_rule_ids: string[];
  evidence_references?: string[];
  rule_version: string;
  agronomic_validation_status?: string;
  is_production_approved: boolean;
  explanation?: string;
  explanation_trace?: string[];
  explanation_traces?: string[];
  warnings: string[];
}

// 4. Crop Yield Prediction Types (Regression - Strictly 5 crops)
export type SupportedYieldCrop = 'Wheat' | 'Barley' | 'Corn' | 'Rice' | 'Soybean';

export const SUPPORTED_YIELD_CROPS: SupportedYieldCrop[] = [
  'Wheat',
  'Barley',
  'Corn',
  'Rice',
  'Soybean',
];

export const INTEGRATED_PATHWAY_CROPS = ['Rice', 'Corn'];

export interface YieldPredictionInput {
  crop_name: string;
  region?: string;
  soil_type?: string;
  area_hectares?: number;
  soil_ph?: number;
  soil_moisture?: number;
  avg_temperature?: number;
  total_rainfall?: number;
  fertilizer_amount?: number | null;
  pesticide_usage?: number | null;
  prediction_mode?: string;
  academic_demo_mode?: boolean;
  annual_rainfall_mm?: number;
  fertilizer_usage_kg_per_ha?: number;
  fertilizer_kg_per_ha?: number;
  pesticide_usage_kg_per_ha?: number;
  pesticide_kg_per_ha?: number;
  average_temperature_c?: number;
  temperature_c?: number;
  rainfall_mm?: number;
  irrigation_mm?: number;
}

export interface YieldPredictionOutput {
  crop_name: string;
  area_hectares: number;
  predicted_yield_tpha: number | null;
  predicted_yield_per_hectare?: number | null;
  predicted_yield_total?: number | null;
  predicted_production_tonnes?: number | null;
  prediction_mode: string;
  model_version: string;
  prediction_status: string;
  status?: string;
  yield_supported: boolean;
  units_verified: boolean;
  warnings: string[];
}

// -----------------------------------------------------------------------------
// Two-Stage Assessment Orchestrator Types
// -----------------------------------------------------------------------------
export interface StageARequest {
  farm_id?: string | null;
  field_id?: string | null;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  temperature: number;
  humidity: number;
  ph: number;
  rainfall: number;
  academic_demo_mode?: boolean;
}

export interface StageAResponse {
  stage_a_id: string;
  recommended_crop: string;
  confidence_score: number;
  alternative_crops: Array<{ crop: string }>;
  requires_confirmation: boolean;
  validation_warnings: string[];
  model_version: string;
  input_snapshot: Record<string, number>;
}

export type SubsystemStatus =
  | 'evaluated'
  | 'insufficient_data'
  | 'unsupported_crop'
  | 'unapproved_rule_base'
  | 'unverified_units'
  | 'error'
  | 'skipped';

export interface ComponentResult<T> {
  status: SubsystemStatus;
  data: T | null;
  error_message: string | null;
  errors?: string[];
  model_or_rule_version: string;
  model_version?: string;
  is_production_approved: boolean;
  warnings: string[];
}

export interface CropPathwayCompatibility {
  recommendation_supported: boolean;
  irrigation_supported: boolean;
  fertilizer_supported: boolean;
  yield_supported: boolean;
  pathway_type: 'integrated' | 'standalone_yield' | 'advisory_only';
  yield_canonical_crop: string | null;
  notes: string;
}

export interface StageBRequest {
  stage_a_id?: string | null;
  farm_id?: string | null;
  field_id?: string | null;
  confirmed_crop: string;
  farmer_confirmed_crop?: string;
  academic_demo_mode?: boolean;
  irrigation_input?: {
    soil_water_depletion?: number | null;
    atmospheric_demand?: number | null;
    effective_rainfall?: number | null;
    raw_soil_moisture_pct?: number | null;
    crop_stage?: string;
    paddy_water_depth_cm?: number | null;
  } | null;
  irrigation_inputs?: any;
  fertilizer_input?: {
    soil_test_method?: string;
    nitrogen?: number | null;
    phosphorus?: number | null;
    potassium?: number | null;
    ph?: number | null;
    nitrogen_status?: string | null;
    phosphorus_status?: string | null;
    potassium_status?: string | null;
    region?: string;
    cultivation_condition?: string;
    growth_stage?: string;
    field_area_hectares?: number | null;
  } | null;
  fertilizer_inputs?: any;
  yield_input?: {
    region?: string;
    soil_type?: string;
    field_area_ha?: number | null;
    is_prospective_planning?: boolean;
    rainfall_mm?: number | null;
    temperature_celsius?: number | null;
    fertilizer_applied_kg_ha?: number | null;
    pesticide_applied_kg_ha?: number | null;
  } | null;
  yield_inputs?: any;
}

export interface StageBResponse {
  assessment_id: string;
  owner_uid: string;
  timestamp: string;
  farm_id: string | null;
  field_id: string | null;
  stage_a_id: string | null;
  farmer_confirmed_crop: string;
  is_crop_from_recommendation: boolean;
  crop_pathway_compatibility: CropPathwayCompatibility;
  irrigation_result: ComponentResult<IrrigationAdvisoryOutput>;
  fertilizer_result: ComponentResult<FertilizerAdvisoryOutput>;
  yield_result: ComponentResult<YieldPredictionOutput>;
  irrigation?: ComponentResult<IrrigationAdvisoryOutput>;
  fertilizer?: ComponentResult<FertilizerAdvisoryOutput>;
  yield_prediction?: ComponentResult<YieldPredictionOutput>;
  overall_status: 'complete' | 'partial' | 'action_blocked';
  academic_demo_mode: boolean;
  warnings: string[];
  model_versions: Record<string, string>;
  persistence_status?: { persisted: boolean; storage_backend?: string };
  candidate_recommended_crop?: string;
}
