import React, { useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sprout,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { FarmModel, StageAResponse, StageBResponse } from '../../types';
import { CombinedResultCard } from './CombinedResultCard';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriButton } from '../../components/ui/AgriButton';
import { AgriBadge } from '../../components/ui/AgriBadge';
import { AgriInput } from '../../components/ui/AgriInput';
import { AgriSelect } from '../../components/ui/AgriSelect';

interface OrchestratorWorkflowProps {
  farms: FarmModel[];
  selectedFarmId?: string;
  onAssessmentCompleted?: (assessment: StageBResponse) => void;
  initialInputs?: {
    nitrogen?: number;
    phosphorus?: number;
    potassium?: number;
    temperature?: number;
    humidity?: number;
    ph?: number;
    rainfall?: number;
  };
}

export const OrchestratorWorkflow: React.FC<OrchestratorWorkflowProps> = ({
  farms,
  selectedFarmId: initialFarmId,
  onAssessmentCompleted,
  initialInputs,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected farm / field
  const [selectedFarmId, setSelectedFarmId] = useState<string>(
    initialFarmId || farms[0]?.farm_id || ''
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');

  // Simulation mode
  const [academicDemoMode, setAcademicDemoMode] = useState(true);

  // Stage A inputs (7 features)
  const [stageAInputs, setStageAInputs] = useState({
    nitrogen: initialInputs?.nitrogen ?? 80,
    phosphorus: initialInputs?.phosphorus ?? 40,
    potassium: initialInputs?.potassium ?? 40,
    temperature: initialInputs?.temperature ?? 26.5,
    humidity: initialInputs?.humidity ?? 78.0,
    ph: initialInputs?.ph ?? 6.5,
    rainfall: initialInputs?.rainfall ?? 210.0,
  });

  // Stage A Result
  const [stageAResult, setStageAResult] = useState<StageAResponse | null>(null);

  // Stage B Confirmed Crop & Inputs
  const [confirmedCrop, setConfirmedCrop] = useState<string>('');
  const [stageBInputs, setStageBInputs] = useState({
    soilWaterDepletion: 65,
    atmosphericDemand: 45,
    effectiveRainfall: 15,
    nitrogenStatus: 'Deficient',
    growthStage: 'basal',
    fieldAreaHa: 5.0,
    isProspectivePlanning: true,
  });

  // Stage B Final Result
  const [stageBResult, setStageBResult] = useState<StageBResponse | null>(null);

  const selectedFarm = farms.find((f) => f.farm_id === selectedFarmId) || farms[0];

  const handleRunStageA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await apiService.recommendCropStageA({
        farm_id: selectedFarmId || undefined,
        field_id: selectedFieldId || undefined,
        nitrogen: Number(stageAInputs.nitrogen),
        phosphorus: Number(stageAInputs.phosphorus),
        potassium: Number(stageAInputs.potassium),
        temperature: Number(stageAInputs.temperature),
        humidity: Number(stageAInputs.humidity),
        ph: Number(stageAInputs.ph),
        rainfall: Number(stageAInputs.rainfall),
        academic_demo_mode: academicDemoMode,
      });

      setStageAResult(resp.data);
      setConfirmedCrop(resp.data.recommended_crop);
      setStep(2); // Advance to farmer confirmation
    } catch (err: any) {
      setError(err.message || 'Stage A evaluation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunStageB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedCrop) {
      setError('Farmer crop confirmation is mandatory before executing Stage B.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const resp = await apiService.evaluateCropStageB({
        stage_a_id: stageAResult?.stage_a_id,
        farm_id: selectedFarmId || undefined,
        field_id: selectedFieldId || undefined,
        confirmed_crop: confirmedCrop,
        academic_demo_mode: academicDemoMode,
        irrigation_input: {
          soil_water_depletion: Number(stageBInputs.soilWaterDepletion),
          atmospheric_demand: Number(stageBInputs.atmosphericDemand),
          effective_rainfall: Number(stageBInputs.effectiveRainfall),
        },
        fertilizer_input: {
          nitrogen_status: stageBInputs.nitrogenStatus,
          growth_stage: stageBInputs.growthStage,
          field_area_hectares: Number(stageBInputs.fieldAreaHa),
        },
        yield_input: {
          field_area_ha: Number(stageBInputs.fieldAreaHa),
          is_prospective_planning: stageBInputs.isProspectivePlanning,
        },
      });

      setStageBResult(resp.data);
      setStep(3); // Advance to combined results
      if (onAssessmentCompleted) {
        onAssessmentCompleted(resp.data);
      }
    } catch (err: any) {
      setError(err.message || 'Stage B assessment failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setStageAResult(null);
    setStageBResult(null);
    setError(null);
  };

  const supportedCropsList = [
    'rice', 'maize', 'chickpea', 'kidneybeans', 'pigeonpeas', 'mothbeans',
    'mungbean', 'blackgram', 'lentil', 'pomegranate', 'banana', 'mango',
    'grapes', 'watermelon', 'muskmelon', 'apple', 'orange', 'papaya',
    'coconut', 'cotton', 'jute', 'coffee',
  ];

  return (
    <div className="space-y-6">
      {/* Workflow Stepper Header */}
      <div className="bg-surface border border-border rounded-lg p-5 sm:p-6 shadow-stitch-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <AgriBadge variant="status-live" pulse>
                Two-Stage Orchestrator
              </AgriBadge>
              <AgriBadge variant="academic-demo">
                Farmer-in-the-Loop Architecture
              </AgriBadge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
              Integrated Multi-Subsystem Assessment
            </h1>
            <p className="text-xs text-content-muted mt-0.5">
              Stage A: Decision Tree Recommendation &rarr; Mandatory Farmer Confirmation &rarr; Stage B: Irrigation, Fertilizer & Yield Dispatch.
            </p>
          </div>

          <label className="flex items-center space-x-2 text-xs font-semibold text-content-primary p-2 bg-slate-50 border border-border rounded cursor-pointer self-start sm:self-center">
            <input
              type="checkbox"
              checked={academicDemoMode}
              onChange={(e) => setAcademicDemoMode(e.target.checked)}
              className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4"
            />
            <span>Simulation Mode</span>
          </label>
        </div>

        {/* 3 Steps Progress Bar */}
        <div className="grid grid-cols-3 gap-2 pt-4 text-xs font-semibold">
          <div
            className={`p-2.5 rounded border flex items-center space-x-2 ${
              step === 1
                ? 'bg-brand-tint border-brand-tint-border text-brand-primary font-bold'
                : step > 1
                ? 'bg-slate-50 border-border text-content-muted'
                : 'bg-white border-border text-slate-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              1
            </span>
            <span className="truncate">Stage A: Crop Advisory</span>
          </div>

          <div
            className={`p-2.5 rounded border flex items-center space-x-2 ${
              step === 2
                ? 'bg-brand-tint border-brand-tint-border text-brand-primary font-bold'
                : step > 2
                ? 'bg-slate-50 border-border text-content-muted'
                : 'bg-white border-border text-slate-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              2
            </span>
            <span className="truncate">Farmer Confirmation Gate</span>
          </div>

          <div
            className={`p-2.5 rounded border flex items-center space-x-2 ${
              step === 3
                ? 'bg-brand-tint border-brand-tint-border text-brand-primary font-bold'
                : 'bg-white border-border text-slate-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              3
            </span>
            <span className="truncate">Stage B: Combined Results</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded text-xs text-semantic-error flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 1: STAGE A CROP RECOMMENDATION                                 */}
      {/* =================================================================== */}
      {step === 1 && (
        <AgriCard
          title={
            <div className="flex items-center gap-2">
              <Sprout className="w-4 h-4 text-brand-primary" />
              <span>Stage A: Crop Recommendation (Decision Tree v1.0)</span>
            </div>
          }
          subtitle="Evaluates 7 soil and microclimate metrics to propose an initial candidate crop"
        >
          <form onSubmit={handleRunStageA} className="space-y-5">
            {/* Optional Farm Context */}
            {selectedFarm && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-border rounded text-xs">
                <AgriSelect
                  label="Target Farm Context"
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  options={farms.map((f) => ({ value: f.farm_id, label: f.name }))}
                />
                <AgriSelect
                  label="Target Field Plot"
                  value={selectedFieldId}
                  onChange={(e) => setSelectedFieldId(e.target.value)}
                >
                  <option value="">(All Plots / General Soil Test)</option>
                  {selectedFarm.fields.map((fld) => (
                    <option key={fld.field_id} value={fld.field_id}>
                      {fld.name} ({fld.soil_type})
                    </option>
                  ))}
                </AgriSelect>
              </div>
            )}

            {/* 7 Soil Chemistry & Weather Features */}
            <div>
              <span className="text-xs font-bold text-content-primary block mb-2.5">
                Soil Chemistry Inputs
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <AgriInput
                  label="Nitrogen (N)"
                  type="number"
                  unit="mg/kg"
                  value={stageAInputs.nitrogen}
                  onChange={(e) =>
                    setStageAInputs({ ...stageAInputs, nitrogen: Number(e.target.value) })
                  }
                  required
                />
                <AgriInput
                  label="Phosphorus (P)"
                  type="number"
                  unit="mg/kg"
                  value={stageAInputs.phosphorus}
                  onChange={(e) =>
                    setStageAInputs({ ...stageAInputs, phosphorus: Number(e.target.value) })
                  }
                  required
                />
                <AgriInput
                  label="Potassium (K)"
                  type="number"
                  unit="mg/kg"
                  value={stageAInputs.potassium}
                  onChange={(e) =>
                    setStageAInputs({ ...stageAInputs, potassium: Number(e.target.value) })
                  }
                  required
                />
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-content-primary block mb-2.5">
                Environmental Metrics
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <AgriInput
                  label="Soil pH"
                  type="number"
                  step="0.1"
                  unit="pH"
                  value={stageAInputs.ph}
                  onChange={(e) =>
                    setStageAInputs({ ...stageAInputs, ph: Number(e.target.value) })
                  }
                  required
                />
                <AgriInput
                  label="Temperature"
                  type="number"
                  step="0.1"
                  unit="°C"
                  value={stageAInputs.temperature}
                  onChange={(e) =>
                    setStageAInputs({ ...stageAInputs, temperature: Number(e.target.value) })
                  }
                  required
                />
                <AgriInput
                  label="Rel. Humidity"
                  type="number"
                  step="0.1"
                  unit="%"
                  value={stageAInputs.humidity}
                  onChange={(e) =>
                    setStageAInputs({ ...stageAInputs, humidity: Number(e.target.value) })
                  }
                  required
                />
                <AgriInput
                  label="Seasonal Rain"
                  type="number"
                  step="0.1"
                  unit="mm"
                  value={stageAInputs.rainfall}
                  onChange={(e) =>
                    setStageAInputs({ ...stageAInputs, rainfall: Number(e.target.value) })
                  }
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <AgriButton
                type="submit"
                variant="primary"
                loading={loading}
                icon={<Sparkles className="w-4 h-4 text-brand-secondary" />}
              >
                Evaluate Stage A Recommendation
              </AgriButton>
            </div>
          </form>
        </AgriCard>
      )}

      {/* =================================================================== */}
      {/* STEP 2: STAGE B FARMER CONFIRMATION GATE                            */}
      {/* =================================================================== */}
      {step === 2 && stageAResult && (
        <AgriCard
          title={
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Step 2: Explicit Farmer Crop Confirmation Gate</span>
            </div>
          }
          subtitle="The AI recommendation must be reviewed and confirmed before executing downstream engines"
        >
          <form onSubmit={handleRunStageB} className="space-y-5">
            {/* Candidate Summary Card */}
            <div className="p-4 bg-brand-tint/40 border border-brand-tint-border rounded space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-primary uppercase tracking-wider">
                  Stage A Recommendation Proposal
                </span>
                <AgriBadge variant="status-live">Evaluated</AgriBadge>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-3xl font-extrabold text-brand-primary capitalize">
                  {stageAResult.recommended_crop}
                </div>
                <AgriBadge variant="academic-demo">{stageAResult.model_version}</AgriBadge>
              </div>

              <p className="text-xs text-content-primary leading-relaxed">
                Confirming this crop will dispatch Mamdani irrigation fuzzy logic, rule-based fertilizer nutrient calculations, and (if supported) supervised yield prediction.
              </p>
            </div>

            {/* Decision: Accept or Override */}
            <div>
              <AgriSelect
                label="Confirmed Crop for Stage B Evaluation (Accept or Override)"
                value={confirmedCrop}
                onChange={(e) => setConfirmedCrop(e.target.value)}
                options={supportedCropsList.map((c) => ({
                  value: c,
                  label: `${c.charAt(0).toUpperCase() + c.slice(1)} ${
                    c === stageAResult.recommended_crop ? '(AI Recommended)' : '(Manual Override)'
                  }`,
                }))}
              />
            </div>

            {/* Operational Parameters */}
            <div className="pt-2 border-t border-border space-y-4">
              <span className="text-xs font-bold text-content-primary block">
                Operational Dispatch Metrics
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <AgriInput
                  label="Field Area"
                  type="number"
                  step="0.1"
                  unit="ha"
                  value={stageBInputs.fieldAreaHa}
                  onChange={(e) =>
                    setStageBInputs({ ...stageBInputs, fieldAreaHa: Number(e.target.value) })
                  }
                  required
                />
                <AgriSelect
                  label="Soil Nitrogen Status"
                  value={stageBInputs.nitrogenStatus}
                  onChange={(e) =>
                    setStageBInputs({ ...stageBInputs, nitrogenStatus: e.target.value })
                  }
                  options={[
                    { value: 'Deficient', label: 'Deficient' },
                    { value: 'Sufficient', label: 'Sufficient' },
                    { value: 'Surplus', label: 'Surplus' },
                  ]}
                />
                <AgriSelect
                  label="Target Growth Stage"
                  value={stageBInputs.growthStage}
                  onChange={(e) =>
                    setStageBInputs({ ...stageBInputs, growthStage: e.target.value })
                  }
                  options={[
                    { value: 'basal', label: 'Basal / Emergence' },
                    { value: 'vegetative', label: 'Vegetative' },
                    { value: 'panicle_initiation', label: 'Panicle Initiation' },
                    { value: 'flowering', label: 'Flowering' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <AgriInput
                  label="Soil Water Depletion"
                  type="number"
                  unit="%"
                  value={stageBInputs.soilWaterDepletion}
                  onChange={(e) =>
                    setStageBInputs({
                      ...stageBInputs,
                      soilWaterDepletion: Number(e.target.value),
                    })
                  }
                  required
                />
                <AgriInput
                  label="Atmospheric ET Demand"
                  type="number"
                  unit="%"
                  value={stageBInputs.atmosphericDemand}
                  onChange={(e) =>
                    setStageBInputs({
                      ...stageBInputs,
                      atmosphericDemand: Number(e.target.value),
                    })
                  }
                  required
                />
                <AgriInput
                  label="Effective Rain"
                  type="number"
                  unit="mm"
                  value={stageBInputs.effectiveRainfall}
                  onChange={(e) =>
                    setStageBInputs({
                      ...stageBInputs,
                      effectiveRainfall: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <AgriButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
              >
                Back to Stage A Inputs
              </AgriButton>

              <AgriButton
                type="submit"
                variant="primary"
                loading={loading}
                icon={<Sparkles className="w-4 h-4 text-brand-secondary" />}
              >
                Confirm & Run Multi-Engine Evaluation
              </AgriButton>
            </div>
          </form>
        </AgriCard>
      )}

      {/* =================================================================== */}
      {/* STEP 3: STAGE B COMBINED RESULTS                                    */}
      {/* =================================================================== */}
      {step === 3 && stageBResult && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-surface border border-border rounded-lg p-4 shadow-stitch-card">
            <div>
              <span className="text-xs text-content-muted block">Assessment Audit Record</span>
              <span className="font-mono text-xs font-bold text-content-primary">
                {stageBResult.assessment_id}
              </span>
            </div>

            <AgriButton
              variant="outline"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleReset}
            >
              Start New Evaluation
            </AgriButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <CombinedResultCard
              subsystem="irrigation"
              result={stageBResult.irrigation_result || stageBResult.irrigation!}
              cropName={stageBResult.farmer_confirmed_crop}
              academicDemoMode={stageBResult.academic_demo_mode}
            />
            <CombinedResultCard
              subsystem="fertilizer"
              result={stageBResult.fertilizer_result || stageBResult.fertilizer!}
              cropName={stageBResult.farmer_confirmed_crop}
              academicDemoMode={stageBResult.academic_demo_mode}
            />
            <CombinedResultCard
              subsystem="yield"
              result={stageBResult.yield_result || stageBResult.yield_prediction!}
              cropName={stageBResult.farmer_confirmed_crop}
              academicDemoMode={stageBResult.academic_demo_mode}
            />
          </div>
        </div>
      )}
    </div>
  );
};
