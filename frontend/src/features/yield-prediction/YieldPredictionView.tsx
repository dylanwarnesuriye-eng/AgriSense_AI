import React, { useState } from 'react';
import {
  TrendingUp,
  Sparkles,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { YieldPredictionOutput } from '../../types';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriButton } from '../../components/ui/AgriButton';
import { AgriBadge } from '../../components/ui/AgriBadge';
import { AgriInput } from '../../components/ui/AgriInput';
import { AgriSelect } from '../../components/ui/AgriSelect';
import { AgriCallout } from '../../components/ui/AgriCallout';
import { ScreenId } from '../../components/layout/AppShell';

interface YieldPredictionViewProps {
  onNavigate?: (screen: ScreenId) => void;
}

export const YieldPredictionView: React.FC<YieldPredictionViewProps> = ({ onNavigate: _onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<YieldPredictionOutput | null>(null);

  // Form Inputs
  const [cropName, setCropName] = useState<string>('Rice');
  const [areaHectares, setAreaHectares] = useState<number>(5.0);
  const [isProspective, setIsProspective] = useState<boolean>(true);
  const [fertilizerKgHa, setFertilizerKgHa] = useState<number>(180);
  const [pesticidesKgHa, setPesticidesKgHa] = useState<number>(2.5);
  const [rainfallMm, setRainfallMm] = useState<number>(850);
  const [temperatureC, setTemperatureC] = useState<number>(26.5);
  const [irrigationMm, setIrrigationMm] = useState<number>(400);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await apiService.predictYield({
        crop_name: cropName,
        area_hectares: Number(areaHectares),
        prediction_mode: isProspective ? 'prospective' : 'full_season',
        fertilizer_kg_per_ha: Number(fertilizerKgHa),
        pesticide_kg_per_ha: Number(pesticidesKgHa),
        rainfall_mm: Number(rainfallMm),
        temperature_c: Number(temperatureC),
        irrigation_mm: Number(irrigationMm),
      });
      setResult(resp.data);
    } catch (err: any) {
      setError(err.message || 'Crop yield prediction failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <AgriBadge variant="status-live">Subsystem 4</AgriBadge>
          <AgriBadge variant="academic-demo">Supervised Ridge Regression v1.0</AgriBadge>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
          Supervised Crop Yield Prediction
        </h1>
        <p className="text-xs text-content-muted mt-0.5">
          Grouped ridge regression forecasting yield (t/ha) and aggregate harvest production exclusively for 5 supported crops.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-7">
          <AgriCard
            title={
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span>Yield Regression Input Parameters</span>
              </div>
            }
            subtitle="Trained strictly on historical USDA / agricultural yield trials"
          >
            <form onSubmit={handlePredict} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-semantic-error flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AgriSelect
                  label="Target Supported Crop"
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  options={[
                    { value: 'Rice', label: 'Rice (Integrated with Recommendation)' },
                    { value: 'Corn', label: 'Corn / Maize (Integrated with Recommendation)' },
                    { value: 'Wheat', label: 'Wheat (Standalone Yield)' },
                    { value: 'Barley', label: 'Barley (Standalone Yield)' },
                    { value: 'Soybean', label: 'Soybean (Standalone Yield)' },
                  ]}
                />

                <AgriInput
                  label="Field Boundary Area"
                  type="number"
                  step="0.1"
                  min="0.1"
                  unit="ha"
                  value={areaHectares}
                  onChange={(e) => setAreaHectares(Number(e.target.value))}
                  required
                />
              </div>

              {/* Mode switch */}
              <div className="p-3 bg-slate-50 border border-border rounded">
                <label className="flex items-center space-x-2 text-xs font-semibold text-content-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isProspective}
                    onChange={(e) => setIsProspective(e.target.checked)}
                    className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4"
                  />
                  <span>
                    Prospective Pre-Season Planning Mode (Uses historical seasonal averages if actuals unknown)
                  </span>
                </label>
              </div>

              {/* Agronomic Management Inputs */}
              <div>
                <span className="text-xs font-bold text-content-primary block mb-2.5">
                  Agronomic Inputs & In-Season Conditions
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <AgriInput
                    label="Fertilizer Application"
                    type="number"
                    unit="kg/ha"
                    value={fertilizerKgHa}
                    onChange={(e) => setFertilizerKgHa(Number(e.target.value))}
                    required
                  />
                  <AgriInput
                    label="Pesticide Application"
                    type="number"
                    step="0.1"
                    unit="kg/ha"
                    value={pesticidesKgHa}
                    onChange={(e) => setPesticidesKgHa(Number(e.target.value))}
                    required
                  />
                  <AgriInput
                    label="Irrigation Applied"
                    type="number"
                    unit="mm"
                    value={irrigationMm}
                    onChange={(e) => setIrrigationMm(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              {/* Climate Inputs */}
              <div className="pt-2 border-t border-border">
                <span className="text-xs font-bold text-content-primary block mb-2.5">
                  Growing Season Climate
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <AgriInput
                    label="Average Growing Temp"
                    type="number"
                    step="0.1"
                    unit="°C"
                    value={temperatureC}
                    onChange={(e) => setTemperatureC(Number(e.target.value))}
                    required
                  />
                  <AgriInput
                    label="Seasonal Rainfall"
                    type="number"
                    step="1"
                    unit="mm"
                    value={rainfallMm}
                    onChange={(e) => setRainfallMm(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <AgriButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={loading}
                  icon={<Sparkles className="w-4 h-4 text-brand-secondary" />}
                >
                  Predict Crop Yield
                </AgriButton>
              </div>
            </form>
          </AgriCard>
        </div>

        {/* Right Column: Results & Guardrails */}
        <div className="lg:col-span-5 space-y-4">
          {result ? (
            <AgriCard
              title="Predicted Yield Forecast"
              action={<AgriBadge variant="status-live">Evaluated</AgriBadge>}
            >
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-border rounded text-center space-y-2">
                  <span className="text-xs text-content-muted uppercase tracking-wider font-semibold">
                    Expected Productivity
                  </span>
                  <div className="text-4xl font-extrabold text-brand-primary tabular-nums">
                    {result.predicted_yield_tpha !== null ? result.predicted_yield_tpha.toFixed(2) : '—'}
                    <span className="text-base font-normal text-content-muted"> t/ha</span>
                  </div>

                  <div className="text-xs text-content-muted">
                    Total Estimated Plot Production:
                  </div>
                  <div className="text-2xl font-bold text-content-primary tabular-nums">
                    {(result.predicted_production_tonnes ?? result.predicted_yield_total ?? 0).toFixed(1)} Metric Tonnes
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-border rounded">
                    <span className="text-[10px] text-content-muted block">Evaluation Mode</span>
                    <span className="font-bold text-content-primary capitalize">
                      {result.prediction_mode?.replace('_', ' ') || 'Standard'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-border rounded">
                    <span className="text-[10px] text-content-muted block">Model Version</span>
                    <span className="font-bold text-content-primary font-mono text-[10px]">
                      {result.model_version || 'yield_regressor_v1.0'}
                    </span>
                  </div>
                </div>

                {result.warnings && result.warnings.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 space-y-0.5">
                    <div className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Agronomic Caveat:
                    </div>
                    {result.warnings.map((w, idx) => (
                      <div key={idx}>{w}</div>
                    ))}
                  </div>
                )}
              </div>
            </AgriCard>
          ) : (
            <AgriCard className="text-center py-10">
              <TrendingUp className="w-10 h-10 text-content-muted mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-bold text-content-primary">Awaiting Prediction</h3>
              <p className="text-xs text-content-muted max-w-xs mx-auto mt-1">
                Select one of the 5 whitelisted crops and input seasonal metrics to run regression.
              </p>
            </AgriCard>
          )}

          <AgriCard title="Whitelist Invariant Enforcement">
            <div className="space-y-2 text-xs text-content-muted leading-relaxed">
              <p>
                The yield regression model is calibrated strictly on 5 crops: <strong>Wheat, Barley, Corn, Rice, Soybean</strong>.
              </p>
              <p>
                Integrated cross-module workflow from Crop Recommendation is available only for <strong>Rice</strong> and <strong>Corn</strong>.
              </p>
            </div>
          </AgriCard>

          <AgriCallout type="warning" title="No Synthetic Prediction Policy">
            If an unsupported crop (e.g. chickpea, mango, cotton) is evaluated, the yield engine will return <code>unsupported_crop</code> with zero fabricated yield values.
          </AgriCallout>
        </div>
      </div>
    </div>
  );
};
