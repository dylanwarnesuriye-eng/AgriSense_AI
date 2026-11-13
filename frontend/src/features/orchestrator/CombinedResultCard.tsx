import React from 'react';
import {
  AlertTriangle,
  HelpCircle,
  XCircle,
  ShieldAlert,
  Droplets,
  Sprout,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { ComponentResult, SubsystemStatus } from '../../types';
import { AgriBadge } from '../../components/ui/AgriBadge';

interface CombinedResultCardProps {
  subsystem: 'crop_recommendation' | 'irrigation' | 'fertilizer' | 'yield';
  result: ComponentResult<any>;
  cropName: string;
  academicDemoMode?: boolean;
}

export const CombinedResultCard: React.FC<CombinedResultCardProps> = ({
  subsystem,
  result,
  cropName,
  academicDemoMode: _academicDemoMode,
}) => {
  const getSubsystemMeta = () => {
    switch (subsystem) {
      case 'crop_recommendation':
        return {
          title: 'Crop Recommendation',
          icon: <Sparkles className="w-5 h-5 text-emerald-600" />,
          accent: 'border-emerald-200 bg-emerald-50/50',
          engine: '22-Class Decision Tree v1.0',
        };
      case 'irrigation':
        return {
          title: 'Irrigation Advisory',
          icon: <Droplets className="w-5 h-5 text-sky-600" />,
          accent: 'border-sky-200 bg-sky-50/50',
          engine: 'Mamdani Fuzzy Logic (36 Rules)',
        };
      case 'fertilizer':
        return {
          title: 'Fertilizer Advisory',
          icon: <Sprout className="w-5 h-5 text-amber-600" />,
          accent: 'border-amber-200 bg-amber-50/50',
          engine: 'Forward Chaining Expert System',
        };
      case 'yield':
        return {
          title: 'Crop Yield Prediction',
          icon: <TrendingUp className="w-5 h-5 text-purple-600" />,
          accent: 'border-purple-200 bg-purple-50/50',
          engine: 'Supervised Ridge Regression',
        };
    }
  };

  const meta = getSubsystemMeta();

  const renderStatusBadge = (status: SubsystemStatus) => {
    switch (status) {
      case 'evaluated':
        return <AgriBadge variant="status-live">Evaluated</AgriBadge>;
      case 'unapproved_rule_base':
        return <AgriBadge variant="status-warning">Draft Rules (Safeguarded)</AgriBadge>;
      case 'insufficient_data':
        return <AgriBadge variant="status-warning">Missing Inputs</AgriBadge>;
      case 'unsupported_crop':
        return <AgriBadge variant="status-neutral">Unsupported Crop</AgriBadge>;
      case 'error':
        return <AgriBadge variant="status-critical">Component Error</AgriBadge>;
      default:
        return <AgriBadge variant="status-neutral">Skipped</AgriBadge>;
    }
  };

  return (
    <div
      className={`rounded-lg border bg-surface p-5 shadow-stitch-card flex flex-col justify-between transition-all ${meta.accent}`}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-surface border border-border shadow-2xs">
              {meta.icon}
            </div>
            <div>
              <h4 className="text-sm font-bold text-content-primary">{meta.title}</h4>
              <span className="text-[11px] text-content-muted">{meta.engine}</span>
            </div>
          </div>
          {renderStatusBadge(result.status)}
        </div>

        {/* Content Body Based on Subsystem Status */}
        <div className="py-4">
          {/* CASE 1: Evaluated */}
          {result.status === 'evaluated' && result.data && (
            <div>
              {subsystem === 'crop_recommendation' && (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between p-3 bg-surface border border-border rounded">
                    <div>
                      <span className="text-xs text-content-muted block">Recommended Candidate</span>
                      <span className="text-xl font-black text-emerald-800 capitalize">
                        {result.data.candidate_crop || cropName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-content-muted block">Farmer Confirmation</span>
                      <span className="text-xs font-bold text-brand-primary">
                        {result.data.is_from_recommendation ? 'Accepted' : 'Custom Override'}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-content-muted p-2 bg-surface border border-border rounded space-y-1">
                    <div className="flex justify-between">
                      <span>Pathway Type:</span>
                      <strong className="text-content-primary capitalize">
                        {result.data.pathway_type || 'Standard'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Model Version:</span>
                      <strong className="text-content-primary">
                        {result.model_or_rule_version}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {subsystem === 'irrigation' && (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between p-3 bg-surface border border-border rounded">
                    <div>
                      <span className="text-xs text-content-muted block">Urgency Score</span>
                      <span className="text-2xl font-bold text-content-primary tabular-nums">
                        {result.data.urgency_score?.toFixed(1) ?? '—'}
                      </span>
                      <span className="text-xs text-content-muted"> / 100</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-content-muted block">Category</span>
                      <span className="text-sm font-bold text-brand-primary">
                        {result.data.urgency_category || 'Evaluated'}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-content-primary bg-sky-50 border border-sky-200 rounded p-2.5 leading-relaxed">
                    {result.data.advice_summary ||
                      `Irrigation recommended every ${result.data.recommended_interval_days || 3} day(s).`}
                  </div>
                </div>
              )}

              {subsystem === 'fertilizer' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-surface border border-border rounded">
                      <span className="text-[10px] text-content-muted block uppercase">Nitrogen</span>
                      <span className="font-bold text-content-primary">
                        {result.data.nutrient_status?.nitrogen || 'Evaluated'}
                      </span>
                    </div>
                    <div className="p-2 bg-surface border border-border rounded">
                      <span className="text-[10px] text-content-muted block uppercase">Phosphorus</span>
                      <span className="font-bold text-content-primary">
                        {result.data.nutrient_status?.phosphorus || 'Evaluated'}
                      </span>
                    </div>
                    <div className="p-2 bg-surface border border-border rounded">
                      <span className="text-[10px] text-content-muted block uppercase">Potassium</span>
                      <span className="font-bold text-content-primary">
                        {result.data.nutrient_status?.potassium || 'Evaluated'}
                      </span>
                    </div>
                  </div>

                  {result.data.product_recommendations && result.data.product_recommendations.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-content-primary block">
                          Prescribed Formulations:
                        </span>
                        {!result.is_production_approved && (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            Draft (Simulation Only)
                          </span>
                        )}
                      </div>
                      {result.data.product_recommendations.map((p: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-2 bg-surface border border-border rounded"
                        >
                          <div>
                            <span className="font-semibold text-content-primary block">{p.fertilizer_name}</span>
                            {!result.is_production_approved && (
                              <span className="text-[9px] text-content-muted">Unapproved Field Instruction</span>
                            )}
                          </div>
                          <span className="font-mono text-brand-primary font-bold tabular-nums">
                            {p.application_rate_kg_ha} kg/ha ({p.total_amount_kg} kg total)
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-content-muted italic">
                      No chemical application required under current soil fertility.
                    </p>
                  )}
                </div>
              )}

              {subsystem === 'yield' && (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between p-3 bg-surface border border-border rounded">
                    <div>
                      <span className="text-xs text-content-muted block">Forecasted Yield</span>
                      <span className="text-2xl font-bold text-purple-700 tabular-nums">
                        {result.data.predicted_yield_tpha?.toFixed(2) ?? '—'}
                      </span>
                      <span className="text-xs text-content-muted"> t/ha</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-content-muted block">Total Harvest</span>
                      <span className="text-sm font-bold text-content-primary tabular-nums">
                        {result.data.predicted_production_tonnes?.toFixed(1) ?? '—'} tonnes
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-content-muted p-2 bg-surface border border-border rounded flex items-center justify-between">
                    <span>Mode: <strong className="text-content-primary capitalize">{result.data.prediction_mode || 'Prospective'}</strong></span>
                    <span>Crop: <strong className="text-content-primary">{result.data.crop_name}</strong></span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CASE 2: Draft Rules Safeguarded */}
          {result.status === 'unapproved_rule_base' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Production Mode Safeguard Engaged</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Rules are classified as <code>draft_unvalidated</code>. In strict production mode, chemical rates or irrigation volumes are withheld to prevent misapplication.
              </p>
            </div>
          )}

          {/* CASE 3: Insufficient Data */}
          {result.status === 'insufficient_data' && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded text-xs text-sky-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <HelpCircle className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Missing Required Parameters</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                One or more mandatory telemetry inputs were missing. Per agronomic safety rules, missing inputs are never coerced to zero.
              </p>
            </div>
          )}

          {/* CASE 4: Unsupported Crop */}
          {result.status === 'unsupported_crop' && (
            <div className="p-3 bg-slate-50 border border-border rounded text-xs text-content-muted space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-content-primary">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Yield Prediction Not Available for {cropName}</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                The yield dataset strictly supports <strong>Wheat, Barley, Corn, Rice, and Soybean</strong>. To prevent agronomic errors, no fabricated prediction is generated.
              </p>
            </div>
          )}

          {/* CASE 5: Isolated Component Error */}
          {result.status === 'error' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-semantic-error space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>Subsystem Failure Isolated</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {result.errors?.join(', ') || 'An internal error occurred in this engine. Other modules remain unaffected.'}
              </p>
            </div>
          )}
        </div>

        {/* Warnings if any */}
        {result.warnings && result.warnings.length > 0 && (
          <div className="mt-2 text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 space-y-0.5">
            <span className="font-bold block">Caveats:</span>
            {result.warnings.map((w, idx) => (
              <div key={idx}>&bull; {w}</div>
            ))}
          </div>
        )}
      </div>

      {/* Model Version Footer */}
      <div className="pt-3 border-t border-border mt-3 flex items-center justify-between text-[11px] text-content-muted">
        <span>Model Version:</span>
        <span className="font-mono text-[10px] font-semibold text-content-primary">
          {result.model_version || 'v1.0'}
        </span>
      </div>
    </div>
  );
};
