import React, { useState } from 'react';
import {
  Droplets,
  Sparkles,
  AlertCircle,
  Waves,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { IrrigationAdvisoryOutput } from '../../types';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriButton } from '../../components/ui/AgriButton';
import { AgriBadge } from '../../components/ui/AgriBadge';
import { AgriInput } from '../../components/ui/AgriInput';
import { AgriSelect } from '../../components/ui/AgriSelect';
import { AgriCallout } from '../../components/ui/AgriCallout';

export const IrrigationAdvisoryView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IrrigationAdvisoryOutput | null>(null);

  // Inputs
  const [cropType, setCropType] = useState<string>('wheat');
  const [soilWaterDepletion, setSoilWaterDepletion] = useState<number>(65);
  const [atmosphericDemand, setAtmosphericDemand] = useState<number>(50);
  const [effectiveRainfall, setEffectiveRainfall] = useState<number>(10);
  const [paddyStandingWater, setPaddyStandingWater] = useState<number>(3.5);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await apiService.evaluateIrrigation({
        crop_type: cropType,
        soil_water_depletion_pct: Number(soilWaterDepletion),
        atmospheric_demand_pct: Number(atmosphericDemand),
        effective_rainfall_mm: Number(effectiveRainfall),
        paddy_standing_water_cm: cropType.toLowerCase() === 'rice' ? Number(paddyStandingWater) : undefined,
      });
      setResult(resp.data);
    } catch (err: any) {
      setError(err.message || 'Irrigation advisory inference failed.');
    } finally {
      setLoading(false);
    }
  };

  const isRice = cropType.toLowerCase() === 'rice';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <AgriBadge variant="status-live">Subsystem 2</AgriBadge>
          <AgriBadge variant="academic-demo">Mamdani Fuzzy Logic v1.0</AgriBadge>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
          Mamdani Fuzzy Logic Irrigation Advisory
        </h1>
        <p className="text-xs text-content-muted mt-0.5">
          Non-linear inference across 36 expert rules determining water replenishment urgency and interval scheduling.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-7">
          <AgriCard
            title={
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-sky-600" />
                <span>Irrigation Evaluation Parameters</span>
              </div>
            }
            subtitle="Fuzzy antecedent membership over depletion, ET demand, and effective precipitation"
          >
            <form onSubmit={handleEvaluate} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-semantic-error flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <AgriSelect
                label="Crop Type / Agronomic Context"
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                options={[
                  { value: 'wheat', label: 'Wheat (Field Crop)' },
                  { value: 'rice', label: 'Rice / Paddy (Dedicated Standing Water Pathway)' },
                  { value: 'corn', label: 'Corn / Maize (High Evaporative Demand)' },
                  { value: 'barley', label: 'Barley (Drought Tolerant)' },
                  { value: 'soybean', label: 'Soybean (Sensitive Reproductive Stage)' },
                  { value: 'cotton', label: 'Cotton' },
                ]}
              />

              {isRice && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-sky-900">
                    <Waves className="w-4 h-4 text-sky-600" />
                    <span>Paddy Standing Water Routing</span>
                  </div>
                  <AgriInput
                    label="Current Standing Water Depth"
                    type="number"
                    step="0.1"
                    min="0"
                    unit="cm"
                    value={paddyStandingWater}
                    onChange={(e) => setPaddyStandingWater(Number(e.target.value))}
                    helperText="Target recommended range: 3.0 to 5.0 cm during vegetative phase"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <AgriInput
                  label="Soil Water Depletion"
                  type="number"
                  min="0"
                  max="100"
                  unit="%"
                  value={soilWaterDepletion}
                  onChange={(e) => setSoilWaterDepletion(Number(e.target.value))}
                  helperText="0% = Field Capacity, 100% = PWP"
                  required
                />
                <AgriInput
                  label="Atmospheric ET Demand"
                  type="number"
                  min="0"
                  max="100"
                  unit="%"
                  value={atmosphericDemand}
                  onChange={(e) => setAtmosphericDemand(Number(e.target.value))}
                  helperText="Temperature & Solar Radiation index"
                  required
                />
                <AgriInput
                  label="Effective Rainfall"
                  type="number"
                  min="0"
                  unit="mm"
                  value={effectiveRainfall}
                  onChange={(e) => setEffectiveRainfall(Number(e.target.value))}
                  helperText="Precipitation contributing to root zone"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <AgriButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSoilWaterDepletion(80);
                    setAtmosphericDemand(85);
                    setEffectiveRainfall(2);
                  }}
                >
                  Load Drought Stress Scenario
                </AgriButton>

                <AgriButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={loading}
                  icon={<Sparkles className="w-4 h-4 text-brand-secondary" />}
                >
                  Execute Fuzzy Inference
                </AgriButton>
              </div>
            </form>
          </AgriCard>
        </div>

        {/* Right Column: Output */}
        <div className="lg:col-span-5 space-y-4">
          {result ? (
            <AgriCard
              title="Irrigation Advisory Output"
              action={
                <AgriBadge
                  variant={
                    result.urgency_category === 'Critical'
                      ? 'status-critical'
                      : result.urgency_category === 'High'
                      ? 'status-warning'
                      : 'status-ready'
                  }
                >
                  {result.urgency_category} Urgency
                </AgriBadge>
              }
            >
              <div className="space-y-4">
                {/* Meter Gauge */}
                <div className="p-4 bg-slate-50 border border-border rounded text-center space-y-2">
                  <span className="text-xs text-content-muted uppercase tracking-wider font-semibold">
                    Calculated Urgency Index
                  </span>
                  <div className="text-4xl font-extrabold text-content-primary tabular-nums">
                    {result.urgency_score?.toFixed(1) ?? '—'}
                    <span className="text-sm font-normal text-content-muted"> / 100</span>
                  </div>

                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        (result.urgency_score || 0) > 75
                          ? 'bg-red-500'
                          : (result.urgency_score || 0) > 50
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, result.urgency_score || 0))}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-border rounded">
                    <span className="text-content-muted block text-[11px]">Recommended Window</span>
                    <span className="font-bold text-content-primary text-sm">
                      {result.recommended_interval_days
                        ? `Every ${result.recommended_interval_days} day(s)`
                        : 'Immediate replenishment'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-border rounded">
                    <span className="text-content-muted block text-[11px]">Rule Activations</span>
                    <span className="font-bold text-content-primary text-sm tabular-nums">
                      {result.active_rule_count ?? 3} rules fired
                    </span>
                  </div>
                </div>

                {result.advice_summary && (
                  <p className="text-xs text-content-primary bg-sky-50 border border-sky-200 rounded p-3 leading-relaxed">
                    {result.advice_summary}
                  </p>
                )}
              </div>
            </AgriCard>
          ) : (
            <AgriCard className="text-center py-10">
              <Droplets className="w-10 h-10 text-content-muted mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-bold text-content-primary">Awaiting Evaluation</h3>
              <p className="text-xs text-content-muted max-w-xs mx-auto mt-1">
                Configure soil depletion and atmospheric demand to evaluate centroid defuzzification.
              </p>
            </AgriCard>
          )}

          <AgriCallout type="warning" title="Agronomic Guardrail — Not Irrigation Volume">
            The Mamdani urgency score indicates <em>when</em> to irrigate, not <em>how much</em> water to deliver. Volumetric irrigation must account for soil infiltration rate, emitter efficiency, and rooting depth.
          </AgriCallout>

          <AgriCallout type="simulation" title="Draft Rules Status">
            The 36 fuzzy rules are currently classified under <code>draft_unvalidated</code> research status. Operational deployment in production requires agricultural extension approval.
          </AgriCallout>
        </div>
      </div>
    </div>
  );
};
