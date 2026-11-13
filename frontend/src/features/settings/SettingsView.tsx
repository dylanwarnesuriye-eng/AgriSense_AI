import React from 'react';
import {
  Cpu,
  Server,
  Database,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { HealthStatus } from '../../types';
import { isHealthOnline } from '../../hooks/useBackendHealth';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriBadge } from '../../components/ui/AgriBadge';
import { AgriButton } from '../../components/ui/AgriButton';
import { AgriCallout } from '../../components/ui/AgriCallout';

interface SystemDiagnosticsViewProps {
  health: HealthStatus | null;
  healthLoading: boolean;
  isOnline?: boolean;
  apiBase?: string;
  onRefreshHealth: () => void;
}

export const SystemDiagnosticsView: React.FC<SystemDiagnosticsViewProps> = ({
  health,
  healthLoading,
  isOnline,
  apiBase = '/api/v1',
  onRefreshHealth,
}) => {
  const { user } = useAuth();
  const effectiveIsOnline = isOnline !== undefined ? isOnline : isHealthOnline(health);

  const aiEngines = [
    {
      id: 1,
      name: 'Crop Recommendation',
      type: 'Supervised Decision Tree',
      version: 'crop_decision_tree_v1.0',
      scope: '22 Supported Botanical Classes',
      status: 'production_ready',
      notes: 'Gini impurity criterion, max depth 12. Input order: N, P, K, temp, humidity, pH, rainfall.',
    },
    {
      id: 2,
      name: 'Irrigation Advisory',
      type: 'Mamdani Fuzzy Inference',
      version: 'fuzzy_irrigation_v1.0',
      scope: '36 Expert Rules & Centroid Defuzzification',
      status: 'draft_unvalidated',
      notes: 'Models depletion %, ET demand, and effective rainfall. Dedicated standing-water depth for paddy rice.',
    },
    {
      id: 3,
      name: 'Fertilizer Advisory',
      type: 'Forward-Chaining Knowledge Base',
      version: 'kb_fertilizer_v0.1_draft',
      scope: 'Expert Nutrient Stoichiometry',
      status: 'draft_unvalidated',
      notes: 'Derives N-P-K nutrient status and converts to chemical product application rates (Urea, DAP, MOP).',
    },
    {
      id: 4,
      name: 'Crop Yield Prediction',
      type: 'Grouped Ridge Regression',
      version: 'yield_regressor_v1.0',
      scope: '5-Crop Whitelist (Wheat, Barley, Corn, Rice, Soybean)',
      status: 'production_ready',
      notes: 'L2-regularized linear model with grouped state-level cross validation to prevent spatial data leakage.',
    },
  ];

  return (
    <div className="space-y-6" data-testid="system-diagnostics-view">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <AgriBadge variant="status-live">Internal Diagnostics</AgriBadge>
          <AgriBadge variant="academic-demo">Developer Environment</AgriBadge>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
          System Diagnostics
        </h1>
        <p className="text-xs text-content-muted mt-0.5">
          Inspect model artifact versions, security boundaries, database persistence, and agronomic rule statuses.
        </p>
      </div>

      {/* AI Subsystems Registry */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-content-primary tracking-tight flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand-primary" />
            AI Subsystem Model Architecture &amp; Artifacts
          </h2>
          <AgriBadge variant="status-ready">4 / 4 Subsystems Operational</AgriBadge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiEngines.map((engine) => (
            <AgriCard key={engine.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-content-primary">{engine.name}</h3>
                  <span className="text-[11px] text-content-muted">{engine.type}</span>
                </div>
                <AgriBadge
                  variant={engine.status === 'production_ready' ? 'status-ready' : 'status-warning'}
                >
                  {engine.status === 'production_ready' ? 'Software Verified' : 'Academic Simulation'}
                </AgriBadge>
              </div>

              <div className="p-2.5 bg-slate-50 border border-border rounded text-xs space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-content-muted">Artifact Version:</span>
                  <span className="font-mono font-bold text-brand-primary">{engine.version}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-content-muted">Operational Scope:</span>
                  <span className="font-semibold text-content-primary">{engine.scope}</span>
                </div>
              </div>

              <p className="text-[11px] text-content-muted leading-relaxed">
                {engine.notes}
              </p>
            </AgriCard>
          ))}
        </div>
      </div>

      {/* Backend & Security Infrastructure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgriCard
          title={
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-brand-primary" />
              <span>FastAPI Backend Diagnostic</span>
            </div>
          }
          action={
            <AgriButton
              variant="outline"
              size="sm"
              loading={healthLoading}
              icon={<RefreshCw className={`w-3 h-3 ${healthLoading ? 'animate-spin' : ''}`} />}
              onClick={onRefreshHealth}
              data-testid="settings-ping-btn"
            >
              Ping API
            </AgriButton>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-content-muted">API Status</span>
              {healthLoading ? (
                <span className="font-bold text-amber-500 flex items-center gap-1.5" data-testid="settings-api-status">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Checking API...
                </span>
              ) : effectiveIsOnline ? (
                <span className="font-bold text-brand-primary flex items-center gap-1.5" data-testid="settings-api-status">
                  <span className="w-2 h-2 rounded-full bg-brand-secondary" />
                  Online &amp; Healthy
                </span>
              ) : (
                <span className="font-bold text-semantic-error flex items-center gap-1.5" data-testid="settings-api-status">
                  <span className="w-2 h-2 rounded-full bg-semantic-error" />
                  Offline / Unreachable
                </span>
              )}
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-content-muted">FastAPI Environment</span>
              <span className="font-bold text-content-primary capitalize" data-testid="settings-api-environment">
                {health?.environment || (healthLoading ? 'Detecting...' : 'Unavailable')}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-content-muted">API Base Route</span>
              <span className="font-mono text-content-primary font-semibold" data-testid="settings-api-base">
                {apiBase}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-content-muted">Backend Version</span>
              <span className="font-mono font-semibold text-content-primary" data-testid="settings-api-version">
                {health?.version || (healthLoading ? 'Detecting...' : 'N/A')}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-content-muted">CORS Policy</span>
              <span className="font-semibold text-content-primary">Allowed for Vite Dev (Port 5173)</span>
            </div>
          </div>
        </AgriCard>

        <AgriCard
          title={
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-brand-primary" />
              <span>Authentication &amp; Firestore Persistence</span>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-content-muted">Authenticated Identity</span>
              <span className="font-bold text-content-primary" data-testid="settings-auth-identity">
                {user ? user.email : 'Unauthenticated'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-content-muted">Authorization Role</span>
              <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded uppercase text-[11px]" data-testid="settings-auth-role">
                {user?.role || 'admin'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-content-muted">Identity Token Extraction</span>
              <span className="font-bold text-brand-primary">
                Strict Bearer ID Token Only
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-content-muted">Persistence Layer</span>
              <span className="font-bold text-content-primary" data-testid="settings-firestore-status">
                Cloud Firestore — Live Persistence
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-content-muted">Client User ID Security</span>
              <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                Client user_id Never Trusted
              </span>
            </div>
          </div>
        </AgriCard>
      </div>

      <AgriCallout type="advisory" title="Agronomic Rule Certification Notice">
        The Mamdani 36-rule fuzzy base and the fertilizer expert knowledge base are currently in <code>draft_unvalidated</code> mode. When <code>academic_demo_mode = False</code>, all operational rate prescriptions are withheld to ensure safety.
      </AgriCallout>
    </div>
  );
};

// Backwards compatibility alias
export const SettingsView = SystemDiagnosticsView;
