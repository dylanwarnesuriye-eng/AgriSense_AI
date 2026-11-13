import {
  ApiResponse,
  HealthStatus,
  FarmModel,
  FarmCreate,
  FieldModel,
  FieldCreate,
  SoilClimateMeasurement,
  StageARequest,
  StageAResponse,
  StageBRequest,
  StageBResponse,
  CropRecommendationInput,
  CropRecommendationOutput,
  IrrigationAdvisoryInput,
  IrrigationAdvisoryOutput,
  FertilizerAdvisoryInput,
  FertilizerAdvisoryOutput,
  YieldPredictionInput,
  YieldPredictionOutput,
  UserProfileResponse,
  SystemDiagnosticsData,
} from '../types';

import { auth } from './firebase';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

let currentAuthToken: string | null = null;

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
}

export async function getValidAuthToken(): Promise<string | null> {
  if (auth && auth.currentUser) {
    try {
      // Firebase automatically handles expiration and refreshes if necessary
      const freshToken = await auth.currentUser.getIdToken();
      currentAuthToken = freshToken;
      return freshToken;
    } catch {
      return currentAuthToken;
    }
  }
  return currentAuthToken;
}

export function getAuthToken(): string | null {
  return currentAuthToken;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  const token = await getValidAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let detail = errorBody;
    try {
      const parsed = JSON.parse(errorBody);
      detail = parsed.detail || parsed.message || errorBody;
    } catch {
      // Keep plain text
    }
    throw new Error(detail || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export const apiService = {
  // Base URL
  getApiBase(): string {
    return API_BASE;
  },

  // System Health
  async getHealth(): Promise<HealthStatus> {
    return request<HealthStatus>('/health');
  },

  // ---------------------------------------------------------------------------
  // Farm & Field Management
  // ---------------------------------------------------------------------------
  async createFarm(data: FarmCreate): Promise<ApiResponse<FarmModel>> {
    return request<ApiResponse<FarmModel>>('/farms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getFarms(): Promise<ApiResponse<FarmModel[]>> {
    return request<ApiResponse<FarmModel[]>>('/farms');
  },

  async getFarm(farmId: string): Promise<ApiResponse<FarmModel>> {
    return request<ApiResponse<FarmModel>>(`/farms/${farmId}`);
  },

  async createField(farmId: string, data: FieldCreate): Promise<ApiResponse<FieldModel>> {
    return request<ApiResponse<FieldModel>>(`/farms/${farmId}/fields`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async addMeasurement(
    farmId: string,
    fieldId: string,
    data: Partial<SoilClimateMeasurement>
  ): Promise<ApiResponse<SoilClimateMeasurement>> {
    return request<ApiResponse<SoilClimateMeasurement>>(
      `/farms/${farmId}/fields/${fieldId}/measurements`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async getMeasurements(farmId: string, fieldId: string): Promise<ApiResponse<SoilClimateMeasurement[]>> {
    return request<ApiResponse<SoilClimateMeasurement[]>>(
      `/farms/${farmId}/fields/${fieldId}/measurements`
    );
  },

  // ---------------------------------------------------------------------------
  // Two-Stage Assessment Orchestrator
  // ---------------------------------------------------------------------------
  async recommendCropStageA(payload: StageARequest): Promise<ApiResponse<StageAResponse>> {
    return request<ApiResponse<StageAResponse>>('/orchestrator/stage-a/recommend-crop', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async evaluateCropStageB(payload: StageBRequest): Promise<ApiResponse<StageBResponse>> {
    return request<ApiResponse<StageBResponse>>('/orchestrator/stage-b/evaluate-crop', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAssessments(farmId?: string): Promise<ApiResponse<StageBResponse[]>> {
    const query = farmId ? `?farm_id=${encodeURIComponent(farmId)}` : '';
    return request<ApiResponse<StageBResponse[]>>(`/orchestrator/assessments${query}`);
  },

  async getAssessmentDetail(assessmentId: string): Promise<ApiResponse<StageBResponse>> {
    return request<ApiResponse<StageBResponse>>(`/orchestrator/assessments/${assessmentId}`);
  },

  // ---------------------------------------------------------------------------
  // Standalone AI Subsystems
  // ---------------------------------------------------------------------------
  async getSupportedRecommendationCrops(): Promise<ApiResponse<string[]>> {
    return request<ApiResponse<string[]>>('/crops/crops');
  },

  async recommendCrop(input: CropRecommendationInput): Promise<ApiResponse<CropRecommendationOutput>> {
    return request<ApiResponse<CropRecommendationOutput>>('/crops/recommend', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async evaluateIrrigation(input: IrrigationAdvisoryInput): Promise<ApiResponse<IrrigationAdvisoryOutput>> {
    return request<ApiResponse<IrrigationAdvisoryOutput>>('/irrigation/evaluate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async diagnoseFertilizer(input: FertilizerAdvisoryInput): Promise<ApiResponse<FertilizerAdvisoryOutput>> {
    return request<ApiResponse<FertilizerAdvisoryOutput>>('/fertilizer/diagnose', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async getSupportedYieldCrops(): Promise<ApiResponse<{ supported_crops: string[]; integrated_pathway_crops: string[]; total_supported: number }>> {
    return request<ApiResponse<{ supported_crops: string[]; integrated_pathway_crops: string[]; total_supported: number }>>('/yield/supported-crops');
  },

  async predictYield(input: YieldPredictionInput): Promise<ApiResponse<YieldPredictionOutput>> {
    return request<ApiResponse<YieldPredictionOutput>>('/yield/predict', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async getUserProfile(): Promise<UserProfileResponse> {
    return request<UserProfileResponse>('/users/me');
  },

  async syncUserProfile(data: { displayName?: string }): Promise<UserProfileResponse> {
    return request<UserProfileResponse>('/users/sync', {
      method: 'POST',
      body: JSON.stringify({ display_name: data.displayName }),
    });
  },

  async getSystemDiagnostics(): Promise<SystemDiagnosticsData> {
    return request<SystemDiagnosticsData>('/system/diagnostics');
  },
};
