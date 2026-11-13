import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { FertilizerAdvisoryOutput } from '../../types';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriButton } from '../../components/ui/AgriButton';
import { AgriBadge } from '../../components/ui/AgriBadge';
import { AgriInput } from '../../components/ui/AgriInput';
import { AgriSelect } from '../../components/ui/AgriSelect';
import { AgriCallout } from '../../components/ui/AgriCallout';

export const FertilizerAdvisoryView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FertilizerAdvisoryOutput | null>(null);

  // Inputs
  const [cropType, setCropType] = useState<string>('wheat');
  const [growthStage, setGrowthStage] = useState<string>('basal');
  const [fieldAreaHa, setFieldAreaHa] = useState<number>(5.0);
  const [nitrogen, setNitrogen] = useState<number>(80);
  const [phosphorus, setPhosphorus] = useState<number>(35);
  const [potassium, setPotassium] = useState<number>(30);
  const [soilPh, setSoilPh] = useState<number>(6.5);
  const [academicDemoMode, setAcademicDemoMode] = useState<boolean>(true);

  const handleDiagnose = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await apiService.diagnoseFertilizer({
        crop_name: cropType,
        crop_type: cropType,
        growth_stage: growthStage,
        crop_growth_stage: growthStage,
        field_area_ha: Number(fieldAreaHa),
        field_area_hectares: Number(fieldAreaHa),
        nitrogen: Number(nitrogen),
        phosphorus: Number(phosphorus),
        potassium: Number(potassium),
        ph: Number(soilPh),
        soil_ph: Number(soilPh),
        academic_demo_mode: academicDemoMode,
      });
      setResult(resp.data);
    } catch (err: any) {
      setError(err.message || 'Fertilizer diagnosis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <AgriBadge variant="status-live">Subsystem 3</AgriBadge>
          <AgriBadge variant="academic-demo">Knowledge-Based Forward Chaining</AgriBadge>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
          Rule-Based Fertilizer Expert System
        </h1>
        <p className="text-xs text-content-muted mt-0.5">
          Forward-chaining inference on soil test values, crop uptake requirements, and nutrient stoichiometry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-7">
          <AgriCard
            title={
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>Fertilizer Diagnostic Parameters</span>
              </div>
            }
            subtitle="Soil chemical facts paired with crop phenological stage"
          >
            <form onSubmit={handleDiagnose} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-semantic-error flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <AgriSelect
                  label="Crop Culture"
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  options={[
                    { value: 'wheat', label: 'Wheat (Winter/Spring)' },
                    { value: 'rice', label: 'Rice / Paddy' },
                    { value: 'corn', label: 'Corn / Maize' },
                    { value: 'barley', label: 'Barley' },
                    { value: 'soybean', label: 'Soybean (N-Fixing Legume)' },
                  ]}
                />

                <AgriSelect
                  label="Phenological Stage"
                  value={growthStage}
                  onChange={(e) => setGrowthStage(e.target.value)}
                  options={[
                    { value: 'basal', label: 'Basal / Pre-Planting' },
                    { value: 'vegetative', label: 'Vegetative Tillering' },
                    { value: 'panicle_initiation', label: 'Panicle / Booting' },
                    { value: 'flowering', label: 'Flowering / Anthesis' },
                  ]}
                />

                <AgriInput
                  label="Field Area"
                  type="number"
                  step="0.1"
                  min="0.1"
                  unit="ha"
                  value={fieldAreaHa}
                  onChange={(e) => setFieldAreaHa(Number(e.target.value))}
                  required
                />
              </div>

              <div className="pt-2 border-t border-border">
                <span className="text-xs font-bold text-content-primary block mb-2.5">
                  Soil Chemistry Facts (Lab / Sensor)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <AgriInput
                    label="Nitrogen (N)"
                    type="number"
                    unit="mg/kg"
                    value={nitrogen}
                    onChange={(e) => setNitrogen(Number(e.target.value))}
                    required
                  />
                  <AgriInput
                    label="Phosphorus (P)"
                    type="number"
                    unit="mg/kg"
                    value={phosphorus}
                    onChange={(e) => setPhosphorus(Number(e.target.value))}
                    required
                  />
                  <AgriInput
                    label="Potassium (K)"
                    type="number"
                    unit="mg/kg"
                    value={potassium}
                    onChange={(e) => setPotassium(Number(e.target.value))}
                    required
                  />
                  <AgriInput
                    label="Soil pH"
                    type="number"
                    step="0.1"
                    unit="pH"
                    value={soilPh}
                    onChange={(e) => setSoilPh(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center space-x-2 text-xs font-semibold text-content-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={academicDemoMode}
                    onChange={(e) => setAcademicDemoMode(e.target.checked)}
                    className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4"
                  />
                  <span>Academic Simulation Mode (permits draft rule outputs)</span>
                </label>

                <AgriButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={loading}
                  icon={<Sparkles className="w-4 h-4 text-brand-secondary" />}
                >
                  Diagnose Nutrients
                </AgriButton>
              </div>
            </form>
          </AgriCard>
        </div>

        {/* Right Column: Output */}
        <div className="lg:col-span-5 space-y-4">
          {result ? (
            <AgriCard
              title="Nutrient Diagnosis & Prescriptions"
              action={
                <AgriBadge
                  variant={
                    result.assessment_status === 'unapproved_rule_base'
                      ? 'status-warning'
                      : 'status-ready'
                  }
                >
                  {result.assessment_status === 'unapproved_rule_base'
                    ? 'Safeguarded (Draft Rules)'
                    : 'Evaluated'}
                </AgriBadge>
              }
            >
              <div className="space-y-4 text-xs">
                {/* Production Block Alert if applicable */}
                {result.assessment_status === 'unapproved_rule_base' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 space-y-1">
                    <span className="font-bold block">Production Quantities Blocked:</span>
                    <p className="text-[11px] leading-relaxed">
                      Agronomic rule base is classified as <code>draft_unvalidated</code>. In strict production mode, application quantities are suppressed until validated by certified agronomists.
                    </p>
                  </div>
                )}

                {/* Macronutrient Status */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 bg-slate-50 border border-border rounded">
                    <span className="text-[10px] text-content-muted block uppercase">Nitrogen</span>
                    <span className="font-bold text-content-primary">
                      {(result.nutrient_assessment && result.nutrient_assessment['nitrogen']) ||
                        (typeof result.nutrient_status === 'object' && (result.nutrient_status as Record<string, string>)?.nitrogen) ||
                        'Evaluated'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-border rounded">
                    <span className="text-[10px] text-content-muted block uppercase">Phosphorus</span>
                    <span className="font-bold text-content-primary">
                      {(result.nutrient_assessment && result.nutrient_assessment['phosphorus']) ||
                        (typeof result.nutrient_status === 'object' && (result.nutrient_status as Record<string, string>)?.phosphorus) ||
                        'Evaluated'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-border rounded">
                    <span className="text-[10px] text-content-muted block uppercase">Potassium</span>
                    <span className="font-bold text-content-primary">
                      {(result.nutrient_assessment && result.nutrient_assessment['potassium']) ||
                        (typeof result.nutrient_status === 'object' && (result.nutrient_status as Record<string, string>)?.potassium) ||
                        'Evaluated'}
                    </span>
                  </div>
                </div>

                {/* Product Recommendations */}
                {((result.product_recommendations && result.product_recommendations.length > 0) ||
                  (result.fertilizer_products && result.fertilizer_products.length > 0)) ? (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-content-primary block">
                        Stoichiometric Product Formulations:
                      </span>
                      {!result.is_production_approved && (
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          Draft (Simulation Only)
                        </span>
                      )}
                    </div>
                    {(result.product_recommendations || result.fertilizer_products || []).map((prod, idx) => {
                      const name = prod.fertilizer_name || prod.product_name;
                      const rate = prod.application_rate_kg_ha ?? prod.product_rate_kgha ?? 0;
                      const total = prod.total_amount_kg ?? prod.total_field_requirement_kg ?? 0;
                      return (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50 border border-border rounded flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-content-primary">{name}</div>
                            <div className="text-[10px] text-content-muted">
                              Target Nutrient: {prod.target_nutrient}
                            </div>
                            {!result.is_production_approved && (
                              <span className="text-[9px] font-medium text-amber-700 block mt-0.5">
                                Draft Simulation — Not an Approved Field Instruction
                              </span>
                            )}
                          </div>
                          <div className="text-right tabular-nums">
                            <div className="font-bold text-brand-primary">{rate} kg/ha</div>
                            <div className="text-[10px] text-content-muted">
                              Total: {total} kg
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-border rounded text-content-muted text-center">
                    No chemical products prescribed under current status.
                  </div>
                )}

                {/* Explanation Trace */}
                {result.explanation_traces && result.explanation_traces.length > 0 && (
                  <div className="p-3 bg-slate-50 border border-border rounded space-y-1">
                    <span className="font-bold text-content-primary flex items-center gap-1.5 text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-content-muted" />
                      Forward Chaining Rule Trace:
                    </span>
                    <ul className="list-disc list-inside text-[11px] text-content-muted space-y-0.5">
                      {result.explanation_traces.map((trace, idx) => (
                        <li key={idx}>{trace}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AgriCard>
          ) : (
            <AgriCard className="text-center py-10">
              <Layers className="w-10 h-10 text-content-muted mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-bold text-content-primary">Awaiting Diagnosis</h3>
              <p className="text-xs text-content-muted max-w-xs mx-auto mt-1">
                Enter soil test facts to run forward chaining deduction.
              </p>
            </AgriCard>
          )}

          <AgriCallout type="warning" title="Agronomic Validation Requirement">
            Under production configuration (<code>academic_demo_mode = False</code>), unapproved draft rules strictly block application rates to prevent fertilizer runoff and crop chemical burn.
          </AgriCallout>
        </div>
      </div>
    </div>
  );
};
