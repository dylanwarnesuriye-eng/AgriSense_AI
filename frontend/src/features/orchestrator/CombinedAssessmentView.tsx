import React from 'react';
import {
  Sparkles,
  History,
  RotateCcw,
} from 'lucide-react';
import { StageBResponse, ComponentResult } from '../../types';
import { CombinedResultCard } from './CombinedResultCard';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriButton } from '../../components/ui/AgriButton';
import { AgriBadge } from '../../components/ui/AgriBadge';
import { AgriCallout } from '../../components/ui/AgriCallout';
import { ScreenId } from '../../components/layout/AppShell';

interface CombinedAssessmentViewProps {
  assessment: StageBResponse | null;
  onNavigate: (screen: ScreenId) => void;
  onStartNewAssessment: () => void;
}

export const CombinedAssessmentView: React.FC<CombinedAssessmentViewProps> = ({
  assessment,
  onNavigate,
  onStartNewAssessment,
}) => {
  if (!assessment) {
    return (
      <AgriCard className="text-center py-12">
        <Sparkles className="w-12 h-12 text-content-muted mx-auto mb-3 opacity-60" />
        <h3 className="text-base font-bold text-content-primary">No Active Assessment Results</h3>
        <p className="text-xs text-content-muted max-w-sm mx-auto mt-1 mb-6">
          Execute a two-stage evaluation or select a historical record to inspect combined multi-engine advisory outputs.
        </p>
        <AgriButton
          variant="primary"
          icon={<Sparkles className="w-4 h-4 text-brand-secondary" />}
          onClick={onStartNewAssessment}
        >
          Launch Two-Stage Assessment
        </AgriButton>
      </AgriCard>
    );
  }

  const cropRecResult: ComponentResult<any> = {
    status: 'evaluated',
    data: {
      candidate_crop: assessment.candidate_recommended_crop || assessment.farmer_confirmed_crop,
      confirmed_crop: assessment.farmer_confirmed_crop,
      is_from_recommendation: assessment.is_crop_from_recommendation,
      pathway_type: assessment.crop_pathway_compatibility.pathway_type,
      stage_a_id: assessment.stage_a_id,
    },
    error_message: null,
    model_or_rule_version: assessment.model_versions?.crop_decision_tree || 'crop_decision_tree_v1.0',
    is_production_approved: true,
    warnings: [],
  };

  const irrigationResult = assessment.irrigation_result || assessment.irrigation;
  const fertilizerResult = assessment.fertilizer_result || assessment.fertilizer;
  const yieldResult = assessment.yield_result || assessment.yield_prediction;

  return (
    <div className="space-y-6">
      {/* Assessment Header Snapshot Banner */}
      <div className="bg-surface border border-border rounded-lg p-5 sm:p-6 shadow-stitch-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <AgriBadge variant="status-live" pulse>
                Stage B Evaluation Finalized
              </AgriBadge>
              <AgriBadge variant="academic-demo">
                {assessment.persistence_status?.persisted !== false
                  ? 'Persisted to Firestore'
                  : 'Session Cache'}
              </AgriBadge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
              Combined Precision Advisory: <span className="text-brand-primary capitalize">{assessment.farmer_confirmed_crop}</span>
            </h1>
            <p className="text-xs text-content-muted mt-0.5">
              Assessment ID: <code className="font-mono text-content-primary font-bold">{assessment.assessment_id}</code> &bull; Evaluated {new Date(assessment.timestamp).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <AgriButton
              variant="outline"
              size="sm"
              icon={<History className="w-4 h-4" />}
              onClick={() => onNavigate('history')}
            >
              Past Assessments
            </AgriButton>
            <AgriButton
              variant="primary"
              size="sm"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={onStartNewAssessment}
            >
              New Assessment
            </AgriButton>
          </div>
        </div>

        {/* Confirmation Decision Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
          <div className="p-3 bg-slate-50 border border-border rounded space-y-1">
            <span className="text-content-muted text-[11px] block">Stage A Candidate</span>
            <div className="font-bold text-content-primary text-sm capitalize">
              {assessment.candidate_recommended_crop || assessment.farmer_confirmed_crop}
            </div>
            <div className="text-[10px] text-content-muted">From 7-Feature Decision Tree</div>
          </div>

          <div className="p-3 bg-slate-50 border border-border rounded space-y-1">
            <span className="text-content-muted text-[11px] block">Confirmed Crop</span>
            <div className="font-bold text-brand-primary text-sm capitalize">
              {assessment.farmer_confirmed_crop}
            </div>
            <div className="text-[10px] text-brand-primary font-semibold">Farmer-Approved Target</div>
          </div>

          <div className="p-3 bg-slate-50 border border-border rounded space-y-1">
            <span className="text-content-muted text-[11px] block">Execution Mode</span>
            <div className="font-bold text-content-primary text-sm">
              {assessment.academic_demo_mode ? 'Academic Simulation' : 'Strict Production'}
            </div>
            <div className="text-[10px] text-content-muted">
              {assessment.academic_demo_mode ? 'Unapproved rules display outputs' : 'Draft rules blocked'}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Autonomous Engine Result Cards with Failure Isolation */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-content-primary tracking-tight">
              Autonomous Subsystem Results (All 4 AI Components)
            </h2>
            <p className="text-xs text-content-muted">
              Each component executed independently with strict failure boundary isolation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <CombinedResultCard
            subsystem="crop_recommendation"
            result={cropRecResult}
            cropName={assessment.farmer_confirmed_crop}
            academicDemoMode={assessment.academic_demo_mode}
          />
          {irrigationResult && (
            <CombinedResultCard
              subsystem="irrigation"
              result={irrigationResult}
              cropName={assessment.farmer_confirmed_crop}
              academicDemoMode={assessment.academic_demo_mode}
            />
          )}
          {fertilizerResult && (
            <CombinedResultCard
              subsystem="fertilizer"
              result={fertilizerResult}
              cropName={assessment.farmer_confirmed_crop}
              academicDemoMode={assessment.academic_demo_mode}
            />
          )}
          {yieldResult && (
            <CombinedResultCard
              subsystem="yield"
              result={yieldResult}
              cropName={assessment.farmer_confirmed_crop}
              academicDemoMode={assessment.academic_demo_mode}
            />
          )}
        </div>
      </div>

      {/* Agricultural Caveat Banner */}
      <AgriCallout type="advisory" title="Agricultural Extension Disclaimer">
        All generated predictions, water depletion intervals, and fertilizer nutrient rates are intended as agronomic decision support. Recommendations should be validated against local soil extension laboratory tests and regional agrometeorological advisories before major capital expenditures.
      </AgriCallout>
    </div>
  );
};
