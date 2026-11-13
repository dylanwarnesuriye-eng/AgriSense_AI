import React, { useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { apiService } from '../../services/api';
import { FarmModel, StageBResponse } from '../../types';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriButton } from '../../components/ui/AgriButton';
import { AgriBadge } from '../../components/ui/AgriBadge';
import { AgriInput } from '../../components/ui/AgriInput';
import { AgriSelect } from '../../components/ui/AgriSelect';
import { AgriCallout } from '../../components/ui/AgriCallout';
import { ScreenId } from '../../components/layout/AppShell';

interface CropConfirmationViewProps {
  farms: FarmModel[];
  candidateCrop?: string;
  onNavigate: (screen: ScreenId) => void;
  onAssessmentCompleted?: (assessment: StageBResponse) => void;
}

export const CropConfirmationView: React.FC<CropConfirmationViewProps> = ({
  farms,
  candidateCrop = 'rice',
  onNavigate,
  onAssessmentCompleted,
}) => {
  const [selectedFarmId, setSelectedFarmId] = useState<string>(farms[0]?.farm_id || '');
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');

  const selectedFarm = farms.find((f) => f.farm_id === selectedFarmId) || farms[0];

  // Confirmed Crop Choice
  const [confirmedCrop, setConfirmedCrop] = useState<string>(candidateCrop);
  const [overrideActive, setOverrideActive] = useState<boolean>(false);

  // Stage B Operational Inputs
  const [fieldAreaHa, setFieldAreaHa] = useState<number>(5.0);
  const [isProspective, setIsProspective] = useState<boolean>(true);
  const [soilWaterDepletion, setSoilWaterDepletion] = useState<number>(60);
  const [atmosphericDemand, setAtmosphericDemand] = useState<number>(45);
  const [effectiveRainfall, setEffectiveRainfall] = useState<number>(15);
  const [growthStage, setGrowthStage] = useState<string>('basal');
  const [nitrogenStatus, setNitrogenStatus] = useState<string>('Deficient');
  const [academicDemoMode, setAcademicDemoMode] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const supportedCropsList = [
    'rice', 'maize', 'chickpea', 'kidneybeans', 'pigeonpeas', 'mothbeans',
    'mungbean', 'blackgram', 'lentil', 'pomegranate', 'banana', 'mango',
    'grapes', 'watermelon', 'muskmelon', 'apple', 'orange', 'papaya',
    'coconut', 'cotton', 'jute', 'coffee',
  ];

  const handleExecuteStageB = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await apiService.evaluateCropStageB({
        farm_id: selectedFarmId || undefined,
        field_id: selectedFieldId || undefined,
        confirmed_crop: confirmedCrop,
        farmer_confirmed_crop: confirmedCrop,
        academic_demo_mode: academicDemoMode,
        // Irrigation (Supports both upland depletion and general parameter mapping)
        irrigation_input: {
          soil_water_depletion: Number(soilWaterDepletion),
          atmospheric_demand: Number(atmosphericDemand),
          effective_rainfall: Number(effectiveRainfall),
          paddy_water_depth_cm: confirmedCrop.toLowerCase() === 'rice' ? 5.0 : undefined,
        },
        irrigation_inputs: {
          soil_water_depletion_pct: Number(soilWaterDepletion),
          atmospheric_demand_pct: Number(atmosphericDemand),
          effective_rainfall_mm: Number(effectiveRainfall),
        },
        // Fertilizer
        fertilizer_input: {
          nitrogen_status: nitrogenStatus,
          growth_stage: growthStage,
          field_area_hectares: Number(fieldAreaHa),
        },
        fertilizer_inputs: {
          nitrogen_status: nitrogenStatus,
          growth_stage: growthStage,
          field_area_ha: Number(fieldAreaHa),
        },
        // Yield
        yield_input: {
          field_area_ha: Number(fieldAreaHa),
          is_prospective_planning: isProspective,
          rainfall_mm: 200.0,
          temperature_celsius: 25.0,
        },
        yield_inputs: {
          field_area_ha: Number(fieldAreaHa),
          is_prospective_planning: isProspective,
        },
      });

      if (onAssessmentCompleted) {
        onAssessmentCompleted(resp.data);
      }
      onNavigate('results');
    } catch (err: any) {
      setError(err.message || 'Stage B multi-component evaluation failed.');
    } finally {
      setLoading(false);
    }
  };

  const isYieldSupported = ['rice', 'maize'].includes(confirmedCrop.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <AgriBadge variant="status-live">Stage B Transition</AgriBadge>
          <AgriBadge variant="academic-demo">Mandatory Agronomic Gate</AgriBadge>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
          Crop Confirmation & Operational Dispatch
        </h1>
        <p className="text-xs text-content-muted mt-0.5">
          Explicit farmer sign-off on crop choice before multi-module evaluation of irrigation, fertilizer, and yield prediction.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Confirmation Form */}
        <div className="lg:col-span-8 space-y-5">
          <AgriCard
            title={
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                <span>Farmer Confirmation Decision</span>
              </div>
            }
            subtitle="Stage A candidate cannot proceed automatically without your explicit action"
          >
            <form onSubmit={handleExecuteStageB} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-semantic-error">
                  {error}
                </div>
              )}

              {/* Crop Candidate Confirmation Box */}
              <div className="p-4 bg-slate-50 border border-border rounded space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">
                    Stage A AI Recommendation Candidate
                  </span>
                  <AgriBadge variant="academic-demo">Decision Tree v1.0</AgriBadge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-2xl font-black text-brand-primary capitalize">
                    {candidateCrop}
                  </div>
                  <AgriButton
                    type="button"
                    variant={overrideActive ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setOverrideActive(!overrideActive)}
                  >
                    {overrideActive ? 'Using Custom Override' : 'Override Recommendation'}
                  </AgriButton>
                </div>

                {overrideActive && (
                  <div className="pt-2 border-t border-border">
                    <AgriSelect
                      label="Select Alternative Confirmed Crop"
                      value={confirmedCrop}
                      onChange={(e) => setConfirmedCrop(e.target.value)}
                      options={supportedCropsList.map((c) => ({
                        value: c,
                        label: `${c.charAt(0).toUpperCase() + c.slice(1)} ${
                          ['rice', 'maize'].includes(c) ? '(Yield Supported)' : '(Yield Unavailable)'
                        }`,
                      }))}
                    />
                  </div>
                )}
              </div>

              {/* Farm Context Selector */}
              {selectedFarm && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                  <AgriSelect
                    label="Associated Farm Estate"
                    value={selectedFarmId}
                    onChange={(e) => setSelectedFarmId(e.target.value)}
                    options={farms.map((f) => ({ value: f.farm_id, label: f.name }))}
                  />
                  <AgriSelect
                    label="Field Management Plot"
                    value={selectedFieldId}
                    onChange={(e) => setSelectedFieldId(e.target.value)}
                  >
                    <option value="">(All Plots / Generalized Field)</option>
                    {selectedFarm.fields.map((fld) => (
                      <option key={fld.field_id} value={fld.field_id}>
                        {fld.name} ({fld.area_hectares} ha - {fld.soil_type})
                      </option>
                    ))}
                  </AgriSelect>
                </div>
              )}

              {/* Operational Dispatch Parameters */}
              <div className="pt-3 border-t border-border space-y-4">
                <span className="text-xs font-bold text-content-primary block">
                  Field Operational Parameters for Remaining Subsystems
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <AgriInput
                    label="Total Planting Area"
                    type="number"
                    step="0.1"
                    min="0.1"
                    unit="ha"
                    value={fieldAreaHa}
                    onChange={(e) => setFieldAreaHa(Number(e.target.value))}
                    required
                  />

                  <AgriSelect
                    label="Soil Nitrogen Level"
                    value={nitrogenStatus}
                    onChange={(e) => setNitrogenStatus(e.target.value)}
                    options={[
                      { value: 'Deficient', label: 'Deficient (Requires Basal N)' },
                      { value: 'Sufficient', label: 'Sufficient (Maintenance Only)' },
                      { value: 'Surplus', label: 'Surplus (No Additional N)' },
                    ]}
                  />

                  <AgriSelect
                    label="Target Growth Stage"
                    value={growthStage}
                    onChange={(e) => setGrowthStage(e.target.value)}
                    options={[
                      { value: 'basal', label: 'Basal / Seedling Emergence' },
                      { value: 'vegetative', label: 'Vegetative Tillering' },
                      { value: 'panicle_initiation', label: 'Panicle Initiation' },
                      { value: 'flowering', label: 'Flowering / Anthesis' },
                      { value: 'grain_filling', label: 'Grain Filling' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <AgriInput
                    label="Soil Water Depletion"
                    type="number"
                    unit="%"
                    min="0"
                    max="100"
                    value={soilWaterDepletion}
                    onChange={(e) => setSoilWaterDepletion(Number(e.target.value))}
                    required
                  />

                  <AgriInput
                    label="Atmospheric ET Demand"
                    type="number"
                    unit="%"
                    min="0"
                    max="100"
                    value={atmosphericDemand}
                    onChange={(e) => setAtmosphericDemand(Number(e.target.value))}
                    required
                  />

                  <AgriInput
                    label="Effective Rainfall"
                    type="number"
                    unit="mm"
                    min="0"
                    value={effectiveRainfall}
                    onChange={(e) => setEffectiveRainfall(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-content-primary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isProspective}
                      onChange={(e) => setIsProspective(e.target.checked)}
                      className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4"
                    />
                    <span>Prospective Pre-Season Planning Mode (Yield Forecast)</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs font-semibold text-content-primary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={academicDemoMode}
                      onChange={(e) => setAcademicDemoMode(e.target.checked)}
                      className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4"
                    />
                    <span>Academic Simulation Mode (Relax Guardrail Blocks)</span>
                  </label>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <AgriButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('crop-rec')}
                >
                  Back to Recommendation
                </AgriButton>

                <AgriButton
                  type="submit"
                  variant="primary"
                  loading={loading}
                  icon={<Sparkles className="w-4 h-4 text-brand-secondary" />}
                >
                  Confirm & Execute Stage B Evaluation
                </AgriButton>
              </div>
            </form>
          </AgriCard>
        </div>

        {/* Right Column: Invariant Checks & Yield Pathway Warning */}
        <div className="lg:col-span-4 space-y-4">
          <AgriCard title="Cross-Module Compatibility">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-border rounded">
                <span className="font-semibold text-content-primary">Irrigation Advisory:</span>
                <AgriBadge variant="status-live">All 22 Crops</AgriBadge>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-border rounded">
                <span className="font-semibold text-content-primary">Fertilizer Advisory:</span>
                <AgriBadge variant="status-live">All 22 Crops</AgriBadge>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-border rounded">
                <span className="font-semibold text-content-primary">Yield Prediction:</span>
                {isYieldSupported ? (
                  <AgriBadge variant="status-live">Integrated Pathway</AgriBadge>
                ) : (
                  <AgriBadge variant="status-warning">Unavailable for {confirmedCrop}</AgriBadge>
                )}
              </div>
            </div>
          </AgriCard>

          {!isYieldSupported && (
            <AgriCallout type="warning" title="Yield Prediction Unavailable">
              The confirmed crop <strong>{confirmedCrop}</strong> is not among the 5 crops in the yield dataset. The yield module will safely return an <code>unsupported_crop</code> status with zero fabricated predictions.
            </AgriCallout>
          )}

          <AgriCallout type="simulation" title="Subsystem Isolation Invariant">
            Each remaining AI subsystem (Irrigation, Fertilizer, Yield) executes independently in Stage B. A failure or unsupported state in one module will never suppress valid outputs from other subsystems.
          </AgriCallout>
        </div>
      </div>
    </div>
  );
};
