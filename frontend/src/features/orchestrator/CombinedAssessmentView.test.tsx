import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CombinedAssessmentView } from './CombinedAssessmentView';
import { StageBResponse } from '../../types';

describe('CombinedAssessmentView - Task 3 Four-Component Representation', () => {
  it('renders all four autonomous AI subsystems in the combined results grid', () => {
    const mockAssessment: StageBResponse = {
      assessment_id: 'asmt_test_123',
      owner_uid: 'farmer_001',
      timestamp: new Date().toISOString(),
      farm_id: 'farm_1',
      field_id: 'field_1',
      stage_a_id: 'stage_a_1',
      farmer_confirmed_crop: 'rice',
      candidate_recommended_crop: 'rice',
      is_crop_from_recommendation: true,
      crop_pathway_compatibility: {
        recommendation_supported: true,
        irrigation_supported: true,
        fertilizer_supported: true,
        yield_supported: true,
        pathway_type: 'integrated',
        yield_canonical_crop: 'Rice',
        notes: 'Integrated Rice Pathway',
      },
      irrigation_result: {
        status: 'evaluated',
        data: {
          selected_crop: 'Rice',
          assessment_status: 'paddy_special_handling',
          software_status: 'paddy_special_handling',
          agronomic_approval_status: 'draft_unvalidated',
          is_production_approved: false,
          urgency_category: null,
          urgency_score: null,
          explanation: 'Paddy flooded management active',
          activated_rule_ids: [],
          rule_version: 'v0.1-draft-scaffold',
          warnings: ['Paddy rice AWD schedule recommended'],
          requires_agronomic_verification: true,
          advice_summary: 'Maintain 3-5cm standing water depth',
        },
        error_message: null,
        model_or_rule_version: 'fuzzy_irrigation_v1.0',
        is_production_approved: false,
        warnings: [],
      },
      fertilizer_result: {
        status: 'evaluated',
        data: {
          selected_crop: 'Rice',
          assessment_status: 'evaluated',
          nutrient_assessment: { nitrogen: 'Deficient' },
          product_recommendations: [
            {
              fertilizer_name: 'Urea (46-0-0)',
              target_nutrient: 'Nitrogen',
              application_rate_kg_ha: 130.4,
              total_amount_kg: 652.0,
            },
          ],
          activated_rule_ids: ['RULE_FERT_01'],
          rule_version: 'kb_fertilizer_v0.1_draft',
          is_production_approved: false,
          warnings: [],
        },
        error_message: null,
        model_or_rule_version: 'kb_fertilizer_v0.1_draft',
        is_production_approved: false,
        warnings: [],
      },
      yield_result: {
        status: 'evaluated',
        data: {
          crop_name: 'Rice',
          area_hectares: 5.0,
          predicted_yield_tpha: 4.85,
          predicted_production_tonnes: 24.25,
          prediction_mode: 'prospective',
          model_version: 'yield_regressor_v1.0',
          prediction_status: 'success',
          yield_supported: true,
          units_verified: false,
          warnings: [],
        },
        error_message: null,
        model_or_rule_version: 'yield_regressor_v1.0',
        is_production_approved: true,
        warnings: [],
      },
      overall_status: 'complete',
      academic_demo_mode: true,
      warnings: [],
      model_versions: {
        crop_decision_tree: 'crop_decision_tree_v1.0',
        irrigation_advisory: 'fuzzy_irrigation_v1.0',
        fertilizer_advisory: 'kb_fertilizer_v0.1_draft',
        yield_prediction: 'yield_regressor_v1.0',
      },
    };

    render(
      <CombinedAssessmentView
        assessment={mockAssessment}
        onNavigate={vi.fn()}
        onStartNewAssessment={vi.fn()}
      />
    );

    // 1. Verify Subsystem 1: Crop Recommendation
    expect(screen.getByText('Crop Recommendation')).toBeDefined();
    expect(screen.getByText('22-Class Decision Tree v1.0')).toBeDefined();

    // 2. Verify Subsystem 2: Irrigation Advisory
    expect(screen.getByText('Irrigation Advisory')).toBeDefined();
    expect(screen.getByText('Mamdani Fuzzy Logic (36 Rules)')).toBeDefined();

    // 3. Verify Subsystem 3: Fertilizer Advisory
    expect(screen.getByText('Fertilizer Advisory')).toBeDefined();
    expect(screen.getByText('Forward Chaining Expert System')).toBeDefined();

    // 4. Verify Subsystem 4: Crop Yield Prediction
    expect(screen.getByText('Crop Yield Prediction')).toBeDefined();
    expect(screen.getByText('Supervised Ridge Regression')).toBeDefined();
  });
});
