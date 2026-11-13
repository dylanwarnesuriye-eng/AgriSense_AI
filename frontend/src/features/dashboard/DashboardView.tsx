import React from 'react';
import {
  Tractor,
  Layers,
  Sparkles,
  Droplets,
  Sprout,
  TrendingUp,
  Activity,
  ShieldCheck,
  ArrowRight,
  GitBranch,
  History,
} from 'lucide-react';
import { FarmModel, HealthStatus } from '../../types';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriButton } from '../../components/ui/AgriButton';
import { AgriBadge } from '../../components/ui/AgriBadge';
import { AgriCallout } from '../../components/ui/AgriCallout';
import { ScreenId } from '../../components/layout/AppShell';
import { useLanguage } from '../../context/LanguageContext';

interface DashboardViewProps {
  farms: FarmModel[];
  selectedFarmId: string;
  onNavigate: (screen: ScreenId) => void;
  health: HealthStatus | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  farms,
  selectedFarmId,
  onNavigate,
  health,
}) => {
  const { t } = useLanguage();
  const selectedFarm = farms.find((f) => f.farm_id === selectedFarmId) || farms[0];
  const totalHectares = farms.reduce((acc, f) => acc + (f.total_area_hectares || 0), 0);
  const totalFields = farms.reduce((acc, f) => acc + (f.fields?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner: Daylight Modern Agricultural Command Center */}
      <div className="bg-surface border border-border rounded-lg p-6 sm:p-7 shadow-stitch-card relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <AgriBadge variant="status-live" pulse>
                {t('heroBadge1')}
              </AgriBadge>
              <AgriBadge variant="academic-demo">
                {t('heroBadge2')}
              </AgriBadge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-content-primary tracking-tight">
              {t('heroTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-content-muted leading-relaxed">
              {t('heroDescription')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <AgriButton
              variant="outline"
              icon={<History className="w-4 h-4 text-content-muted" />}
              onClick={() => onNavigate('history')}
            >
              {t('auditTrailBtn')}
            </AgriButton>
            <AgriButton
              variant="primary"
              icon={<Sparkles className="w-4 h-4 text-brand-secondary" />}
              onClick={() => onNavigate('orchestrator')}
            >
              {t('startAssessmentBtn')}
            </AgriButton>
          </div>
        </div>
      </div>

      {/* Operational KPI Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AgriCard className="p-4" hoverable onClick={() => onNavigate('farms')}>
          <div className="flex items-center justify-between text-content-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('kpiRegisteredFarms')}</span>
            <Tractor className="w-4 h-4 text-brand-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-content-primary tabular-nums">
            {farms.length}
          </div>
          <div className="text-[11px] text-content-muted mt-1">
            {t('kpiAcrossHectares', { hectares: totalHectares.toFixed(1) })}
          </div>
        </AgriCard>

        <AgriCard className="p-4" hoverable onClick={() => onNavigate('farm-details')}>
          <div className="flex items-center justify-between text-content-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('kpiActivePlots')}</span>
            <Activity className="w-4 h-4 text-brand-secondary" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-content-primary tabular-nums">
            {totalFields}
          </div>
          <div className="text-[11px] text-content-muted mt-1">
            {t('kpiPlotZones')}
          </div>
        </AgriCard>

        <AgriCard className="p-4" hoverable onClick={() => onNavigate('orchestrator')}>
          <div className="flex items-center justify-between text-content-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('kpiTwoStageWorkflow')}</span>
            <GitBranch className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-content-primary">
            Stage A &rarr; B
          </div>
          <div className="text-[11px] text-content-muted mt-1">
            {t('kpiFarmerConfirmationRequired')}
          </div>
        </AgriCard>

        <AgriCard className="p-4" hoverable onClick={() => onNavigate('orchestrator')}>
          <div className="flex items-center justify-between text-content-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('kpiAiSubsystems')}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-content-primary">
            4 / 4
          </div>
          <div className="text-[11px] text-content-muted mt-1">
            {health?.status === 'healthy' ? t('kpiSubsystemsOperational') : t('kpiDecisionSupportOperational')}
          </div>
        </AgriCard>
      </div>

      {/* Selected Farm Quick View */}
      {selectedFarm && (
        <AgriCard
          title={
            <div className="flex items-center gap-2">
              <Tractor className="w-4 h-4 text-brand-primary" />
              <span>Current Farm Context: {selectedFarm.name}</span>
            </div>
          }
          subtitle={`Location: ${selectedFarm.location} • Total Area: ${selectedFarm.total_area_hectares} ha`}
          action={
            <AgriButton variant="outline" size="sm" onClick={() => onNavigate('farm-details')}>
              Manage Plots
            </AgriButton>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 border border-border rounded text-xs space-y-1">
                <span className="text-content-muted font-medium">Fields Registered</span>
                <div className="text-base font-bold text-content-primary">
                  {selectedFarm.fields.length} Field Plots
                </div>
                <div className="text-[11px] text-content-muted">
                  {selectedFarm.fields.map((f) => f.name).join(', ') || 'No fields added yet'}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-border rounded text-xs space-y-1">
                <span className="text-content-muted font-medium">Soil Types Monitored</span>
                <div className="text-base font-bold text-content-primary">
                  {Array.from(new Set(selectedFarm.fields.map((f) => f.soil_type).filter(Boolean))).join(', ') || 'Unspecified'}
                </div>
                <div className="text-[11px] text-content-muted">Calibrated agronomic textures</div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-border rounded text-xs space-y-1">
                <span className="text-content-muted font-medium">Recent Telemetry Entries</span>
                <div className="text-base font-bold text-content-primary">
                  {selectedFarm.fields.reduce((acc, fld) => acc + (fld.measurements?.length || 0), 0)} Logged
                </div>
                <div className="text-[11px] text-brand-primary font-semibold">
                  Sensor, lab & manual audits
                </div>
              </div>
            </div>
          </div>
        </AgriCard>
      )}

      {/* Four AI Subsystems Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-content-primary tracking-tight">
              {t('specializedSubsystemsTitle')}
            </h2>
            <p className="text-xs text-content-muted">
              {t('specializedSubsystemsDesc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Subsystem 1: Crop Recommendation */}
          <AgriCard
            title={
              <div className="flex items-center gap-2">
                <Sprout className="w-4 h-4 text-emerald-600" />
                <span>{t('cropRecTitle')}</span>
              </div>
            }
            subtitle={t('cropRecSubtitle')}
            action={<AgriBadge variant="status-ready">Model v1.0</AgriBadge>}
          >
            <div className="space-y-4 text-xs">
              <p className="text-content-muted leading-relaxed">
                {t('cropRecDesc')}
              </p>
              <div className="p-2.5 bg-slate-50 border border-border rounded text-[11px] text-content-muted">
                <strong>Agronomic Invariant:</strong> Output is an advisory candidate only. Explicit farmer confirmation required for field planning.
              </div>
              <AgriButton
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onNavigate('crop-rec')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                {t('cropRecBtn')}
              </AgriButton>
            </div>
          </AgriCard>

          {/* Subsystem 2: Irrigation Advisory */}
          <AgriCard
            title={
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-sky-600" />
                <span>{t('irrigationTitle')}</span>
              </div>
            }
            subtitle={t('irrigationSubtitle')}
            action={<AgriBadge variant="status-warning">Draft Rules Safeguarded</AgriBadge>}
          >
            <div className="space-y-4 text-xs">
              <p className="text-content-muted leading-relaxed">
                {t('irrigationDesc')}
              </p>
              <div className="p-2.5 bg-slate-50 border border-border rounded text-[11px] text-content-muted">
                <strong>Safety Rule:</strong> Urgency score (0-100) represents scheduling priority, not application volume.
              </div>
              <AgriButton
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onNavigate('irrigation')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                {t('irrigationBtn')}
              </AgriButton>
            </div>
          </AgriCard>

          {/* Subsystem 3: Fertilizer Advisory */}
          <AgriCard
            title={
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>{t('fertilizerTitle')}</span>
              </div>
            }
            subtitle={t('fertilizerSubtitle')}
            action={<AgriBadge variant="status-warning">Production Safeguards</AgriBadge>}
          >
            <div className="space-y-4 text-xs">
              <p className="text-content-muted leading-relaxed">
                {t('fertilizerDesc')}
              </p>
              <div className="p-2.5 bg-slate-50 border border-border rounded text-[11px] text-content-muted">
                <strong>Policy Block:</strong> Unapproved draft rules are blocked from issuing operational quantities in production mode.
              </div>
              <AgriButton
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onNavigate('fertilizer')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                {t('fertilizerBtn')}
              </AgriButton>
            </div>
          </AgriCard>

          {/* Subsystem 4: Yield Prediction */}
          <AgriCard
            title={
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span>{t('yieldTitle')}</span>
              </div>
            }
            subtitle={t('yieldSubtitle')}
            action={<AgriBadge variant="status-ready">Model v1.0</AgriBadge>}
          >
            <div className="space-y-4 text-xs">
              <p className="text-content-muted leading-relaxed">
                Forecasts prospective or full-season crop yield in tons/hectare strictly for Wheat, Barley, Corn, Rice, and Soybean with grouped validation.
              </p>
              <div className="p-2.5 bg-slate-50 border border-border rounded text-[11px] text-content-muted">
                <strong>Whitelist Boundary:</strong> Yield predictions for the other 20 recommendation crops are strictly refused without fabrication.
              </div>
              <AgriButton
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onNavigate('yield')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                {t('yieldBtn')}
              </AgriButton>
            </div>
          </AgriCard>
        </div>
      </div>

      {/* Agronomic Disclaimer */}
      <AgriCallout type="advisory" title="Scientific Validation & Guardrail Safeguards">
        Only <strong>Rice</strong> and <strong>Maize/Corn</strong> have verified cross-module pathways from crop recommendation into yield regression. Unvalidated rules operate in simulation mode and are never presented as field-certified directives without agronomic sign-off.
      </AgriCallout>
    </div>
  );
};
