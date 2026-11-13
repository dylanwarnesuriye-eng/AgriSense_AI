import React, { useState } from 'react';
import {
  Sprout,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { CropRecommendationOutput } from '../../types';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriButton } from '../../components/ui/AgriButton';
import { AgriBadge } from '../../components/ui/AgriBadge';
import { AgriInput } from '../../components/ui/AgriInput';
import { AgriCallout } from '../../components/ui/AgriCallout';
import { ScreenId } from '../../components/layout/AppShell';

interface CropRecommendationViewProps {
  onNavigate: (screen: ScreenId) => void;
  onProceedToConfirmation?: (recommendedCrop: string) => void;
}

export const CropRecommendationView: React.FC<CropRecommendationViewProps> = ({
  onNavigate,
  onProceedToConfirmation,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CropRecommendationOutput | null>(null);

  // 7 Input Features
  const [nitrogen, setNitrogen] = useState<number>(90);
  const [phosphorus, setPhosphorus] = useState<number>(42);
  const [potassium, setPotassium] = useState<number>(43);
  const [temperature, setTemperature] = useState<number>(20.8);
  const [humidity, setHumidity] = useState<number>(82.0);
  const [ph, setPh] = useState<number>(6.5);
  const [rainfall, setRainfall] = useState<number>(202.9);

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await apiService.recommendCrop({
        nitrogen: Number(nitrogen),
        phosphorus: Number(phosphorus),
        potassium: Number(potassium),
        temperature: Number(temperature),
        humidity: Number(humidity),
        ph: Number(ph),
        rainfall: Number(rainfall),
      });
      setResult(resp.data);
    } catch (err: any) {
      setError(err.message || 'Crop recommendation inference failed.');
    } finally {
      setLoading(false);
    }
  };

  const supportedCropsList = [
    'rice', 'maize', 'chickpea', 'kidneybeans', 'pigeonpeas', 'mothbeans',
    'mungbean', 'blackgram', 'lentil', 'pomegranate', 'banana', 'mango',
    'grapes', 'watermelon', 'muskmelon', 'apple', 'orange', 'papaya',
    'coconut', 'cotton', 'jute', 'coffee',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <AgriBadge variant="status-live">Subsystem 1</AgriBadge>
            <AgriBadge variant="academic-demo">Decision Tree v1.0</AgriBadge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
            Decision Tree Crop Recommendation
          </h1>
          <p className="text-xs text-content-muted mt-0.5">
            Classifies optimal botanical suitability across 22 crop classes using soil chemistry and microclimate conditions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Evaluator */}
        <div className="lg:col-span-7">
          <AgriCard
            title={
              <div className="flex items-center gap-2">
                <Sprout className="w-4 h-4 text-emerald-600" />
                <span>Soil & Microclimate Input Features</span>
              </div>
            }
            subtitle="All 7 agronomic parameters must be finite and within valid biological ranges"
          >
            <form onSubmit={handleRecommend} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-semantic-error flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Soil Macronutrients */}
              <div>
                <span className="text-xs font-bold text-content-primary block mb-2.5">
                  Soil Chemistry (Macronutrients & pH)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                </div>
              </div>

              {/* Microclimate */}
              <div>
                <span className="text-xs font-bold text-content-primary block mb-2.5">
                  Environmental Conditions
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <AgriInput
                    label="Soil pH"
                    type="number"
                    step="0.1"
                    unit="pH"
                    value={ph}
                    onChange={(e) => setPh(Number(e.target.value))}
                    required
                  />
                  <AgriInput
                    label="Temperature"
                    type="number"
                    step="0.1"
                    unit="°C"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    required
                  />
                  <AgriInput
                    label="Rel. Humidity"
                    type="number"
                    step="0.1"
                    unit="%"
                    value={humidity}
                    onChange={(e) => setHumidity(Number(e.target.value))}
                    required
                  />
                  <AgriInput
                    label="Rainfall"
                    type="number"
                    step="0.1"
                    unit="mm"
                    value={rainfall}
                    onChange={(e) => setRainfall(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <AgriButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Sample Preset for Rice
                    setNitrogen(80);
                    setPhosphorus(40);
                    setPotassium(40);
                    setTemperature(26.5);
                    setHumidity(78);
                    setPh(6.5);
                    setRainfall(210);
                  }}
                >
                  Load Paddy Preset
                </AgriButton>

                <AgriButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={loading}
                  icon={<Sparkles className="w-4 h-4 text-brand-secondary" />}
                >
                  Evaluate Crop Suitability
                </AgriButton>
              </div>
            </form>
          </AgriCard>
        </div>

        {/* Right Column: Recommendation Output & Guardrails */}
        <div className="lg:col-span-5 space-y-4">
          {result ? (
            <AgriCard
              title={
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                  <span>Recommendation Result</span>
                </div>
              }
              action={<AgriBadge variant="status-live">Evaluated</AgriBadge>}
            >
              <div className="space-y-4 text-center py-4">
                <div className="text-xs uppercase font-extrabold tracking-wider text-content-muted">
                  Top Recommended Crop Candidate
                </div>
                <div
                  data-testid="recommended-crop-name"
                  className="text-3xl font-black text-brand-primary capitalize"
                >
                  {result.recommended_crop}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <AgriBadge variant="academic-demo">{result.model_version}</AgriBadge>
                  <AgriBadge variant="status-ready">22-Class Decision Tree</AgriBadge>
                  {result.confidence !== null && result.confidence !== undefined ? (
                    <AgriBadge variant="status-live">
                      Confidence: {(result.confidence * 100).toFixed(1)}%
                    </AgriBadge>
                  ) : (
                    <span
                      data-testid="confidence-withheld-badge"
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-content-muted border border-border"
                    >
                      Confidence: Withheld (Uncalibrated)
                    </span>
                  )}
                </div>

                {/* Applicable Agronomic Warnings & Constraints */}
                {result.warnings && result.warnings.length > 0 && (
                  <div
                    data-testid="crop-warnings-list"
                    className="text-left text-xs bg-amber-50/80 border border-amber-200/80 rounded p-3 space-y-1.5 mt-3"
                  >
                    <span className="font-bold text-amber-900 block">
                      Agronomic Caveats & Warnings:
                    </span>
                    <ul className="space-y-1 text-amber-800 list-disc list-inside">
                      {result.warnings.map((w, idx) => (
                        <li key={idx} className="text-[11px] leading-relaxed">
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-left text-xs bg-slate-50 border border-border rounded p-3 space-y-1 mt-3">
                  <span className="font-bold text-content-primary">Agronomic Invariant Notice:</span>
                  <p className="text-content-muted leading-relaxed">
                    This result is a candidate recommendation. Crop selection is only finalized when the farmer explicitly verifies and confirms the planting plan in Stage B.
                  </p>
                </div>

                <div className="pt-2">
                  <AgriButton
                    variant="primary"
                    className="w-full"
                    icon={<ArrowRight className="w-4 h-4" />}
                    onClick={() => {
                      if (onProceedToConfirmation) {
                        onProceedToConfirmation(result.recommended_crop);
                      }
                      onNavigate('crop-confirm');
                    }}
                  >
                    Proceed to Crop Confirmation
                  </AgriButton>
                </div>
              </div>
            </AgriCard>
          ) : (
            <AgriCard className="text-center py-10">
              <Sprout className="w-10 h-10 text-content-muted mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-bold text-content-primary">Awaiting Evaluation</h3>
              <p className="text-xs text-content-muted max-w-xs mx-auto mt-1">
                Enter soil chemistry and weather measurements on the left to classify crop suitability.
              </p>
            </AgriCard>
          )}

          {/* Supported Crops Inventory */}
          <AgriCard
            title={<span className="text-xs font-bold uppercase tracking-wider">Supported 22 Crop Classes</span>}
          >
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {supportedCropsList.map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-content-primary border border-border"
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-content-muted mt-2">
              Note: Only <strong>rice</strong> and <strong>maize</strong> have downstream integrated regression pathways to yield prediction.
            </p>
          </AgriCard>

          <AgriCallout type="warning" title="No Fabricated Confidence Scores">
            Standard Decision Trees classify discrete terminal leaves. Antigravity AgriSense AI refuses to invent synthetic probability values or misleading confidence percentages.
          </AgriCallout>
        </div>
      </div>
    </div>
  );
};
