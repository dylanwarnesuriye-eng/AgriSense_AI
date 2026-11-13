import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Layers,
  Activity,
  Sparkles,
  Tractor,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { FarmModel } from '../../types';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriButton } from '../../components/ui/AgriButton';
import { AgriBadge } from '../../components/ui/AgriBadge';
import { AgriModal } from '../../components/ui/AgriModal';
import { AgriInput } from '../../components/ui/AgriInput';
import { AgriSelect } from '../../components/ui/AgriSelect';
import { ScreenId } from '../../components/layout/AppShell';

interface FarmDetailViewProps {
  farms: FarmModel[];
  selectedFarmId: string;
  onSelectFarmId: (id: string) => void;
  onRefreshFarms: () => Promise<void>;
  onNavigate: (screen: ScreenId) => void;
  onSelectFieldForTelemetry?: (fieldId: string) => void;
}

export const FarmDetailView: React.FC<FarmDetailViewProps> = ({
  farms,
  selectedFarmId,
  onSelectFarmId,
  onRefreshFarms,
  onNavigate,
  onSelectFieldForTelemetry,
}) => {
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field Form States
  const [fieldName, setFieldName] = useState('');
  const [fieldArea, setFieldArea] = useState<number>(5);
  const [soilType, setSoilType] = useState('Clay Loam');

  const selectedFarm = farms.find((f) => f.farm_id === selectedFarmId) || farms[0];

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm) return;
    setLoading(true);
    setError(null);
    try {
      await apiService.createField(selectedFarm.farm_id, {
        name: fieldName,
        area_hectares: Number(fieldArea),
        soil_type: soilType,
      });
      await onRefreshFarms();
      setShowAddFieldModal(false);
      setFieldName('');
      setFieldArea(5);
    } catch (err: any) {
      setError(err.message || 'Failed to add field plot.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedFarm) {
    return (
      <AgriCard className="text-center py-12">
        <Tractor className="w-12 h-12 text-content-muted mx-auto mb-3 opacity-60" />
        <h3 className="text-base font-bold text-content-primary">No Farm Selected</h3>
        <p className="text-xs text-content-muted max-w-sm mx-auto mt-1 mb-6">
          Please select or register a farm first to manage individual field plots.
        </p>
        <AgriButton variant="primary" onClick={() => onNavigate('farms')}>
          Go to Farm Registry
        </AgriButton>
      </AgriCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Farm Estate Header Card */}
      <div className="bg-surface border border-border rounded-lg p-5 sm:p-6 shadow-stitch-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <AgriBadge variant="status-live" pulse>
              Estate Context
            </AgriBadge>
            <span className="text-xs text-content-muted">{selectedFarm.location}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
            {selectedFarm.name}
          </h1>
          <p className="text-xs text-content-muted mt-0.5">
            Total Boundary: <strong>{selectedFarm.total_area_hectares} ha</strong> &bull; {selectedFarm.fields.length} Sub-Plots Delineated
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="w-44">
            <AgriSelect
              value={selectedFarm.farm_id}
              onChange={(e) => onSelectFarmId(e.target.value)}
              options={farms.map((f) => ({ value: f.farm_id, label: f.name }))}
            />
          </div>
          <AgriButton
            variant="outline"
            size="sm"
            onClick={() => onNavigate('farms')}
          >
            All Farms
          </AgriButton>
          <AgriButton
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAddFieldModal(true)}
          >
            Add Field Plot
          </AgriButton>
        </div>
      </div>

      {/* Field Plots Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-content-primary tracking-tight">
              Delineated Field Plots & Soil Profiles
            </h2>
            <p className="text-xs text-content-muted">
              Individual management zones with distinct soil textures and sensor telemetry streams.
            </p>
          </div>
        </div>

        {selectedFarm.fields.length === 0 ? (
          <AgriCard className="text-center py-10">
            <Layers className="w-10 h-10 text-content-muted mx-auto mb-2 opacity-60" />
            <h3 className="text-sm font-bold text-content-primary">No field plots registered</h3>
            <p className="text-xs text-content-muted max-w-sm mx-auto mt-1 mb-4">
              Delineate a field plot to enable soil N-P-K logging and multi-module AI evaluations.
            </p>
            <AgriButton
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddFieldModal(true)}
            >
              Add First Plot
            </AgriButton>
          </AgriCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedFarm.fields.map((field) => {
              const measurementCount = field.measurements?.length || 0;
              const latestMeas = field.measurements?.[field.measurements.length - 1];

              return (
                <AgriCard key={field.field_id} className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-content-primary">{field.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-content-muted mt-0.5">
                        <MapPin className="w-3 h-3 text-brand-primary" />
                        <span>Plot Area: <strong>{field.area_hectares} ha</strong></span>
                      </div>
                    </div>
                    <AgriBadge variant="status-ready">{field.soil_type}</AgriBadge>
                  </div>

                  <div className="p-3 bg-slate-50 border border-border rounded text-xs space-y-1.5">
                    <div className="flex justify-between text-content-muted text-[11px]">
                      <span>Telemetry Entries</span>
                      <span className="font-semibold text-content-primary tabular-nums">
                        {measurementCount} logged
                      </span>
                    </div>

                    {latestMeas ? (
                      <div className="text-[11px] text-content-primary space-y-0.5 pt-1 border-t border-border">
                        <div className="text-content-muted text-[10px]">Latest Calibration:</div>
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span>N: {latestMeas.nitrogen ?? '—'}</span>
                          <span>P: {latestMeas.phosphorus ?? '—'}</span>
                          <span>K: {latestMeas.potassium ?? '—'}</span>
                          <span>pH: {latestMeas.ph ?? '—'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-content-muted italic">
                        No soil test logged yet
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <AgriButton
                      variant="outline"
                      size="sm"
                      icon={<Activity className="w-3.5 h-3.5" />}
                      onClick={() => {
                        if (onSelectFieldForTelemetry) onSelectFieldForTelemetry(field.field_id);
                        onNavigate('measurements');
                      }}
                    >
                      Log Telemetry
                    </AgriButton>

                    <AgriButton
                      variant="primary"
                      size="sm"
                      icon={<Sparkles className="w-3.5 h-3.5 text-brand-secondary" />}
                      onClick={() => onNavigate('orchestrator')}
                    >
                      Assess
                    </AgriButton>
                  </div>
                </AgriCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Field Plot Modal */}
      <AgriModal
        isOpen={showAddFieldModal}
        onClose={() => setShowAddFieldModal(false)}
        title="Add Field Management Plot"
        subtitle={`Delineate a new plot within ${selectedFarm.name}`}
        footer={
          <>
            <AgriButton variant="outline" size="sm" onClick={() => setShowAddFieldModal(false)}>
              Cancel
            </AgriButton>
            <AgriButton variant="primary" size="sm" loading={loading} onClick={handleAddField}>
              Save Field Plot
            </AgriButton>
          </>
        }
      >
        <form onSubmit={handleAddField} className="space-y-4">
          {error && <p className="text-xs text-semantic-error">{error}</p>}
          <AgriInput
            label="Field Plot Name / Identifier"
            placeholder="e.g. North Plot B-12"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            required
          />
          <AgriInput
            label="Plot Area"
            type="number"
            step="0.1"
            min="0.1"
            unit="ha"
            value={fieldArea}
            onChange={(e) => setFieldArea(Number(e.target.value))}
            required
          />
          <AgriSelect
            label="Soil Texture Classification"
            value={soilType}
            onChange={(e) => setSoilType(e.target.value)}
            required
            options={[
              { value: 'Clay Loam', label: 'Clay Loam (Optimal water retention)' },
              { value: 'Sandy Loam', label: 'Sandy Loam (Rapid drainage)' },
              { value: 'Silt Loam', label: 'Silt Loam (High fertility)' },
              { value: 'Clay', label: 'Heavy Clay (Paddy suitable)' },
              { value: 'Sandy', label: 'Sandy (High leaching risk)' },
              { value: 'Loam', label: 'Standard Agricultural Loam' },
              { value: 'Peaty', label: 'Peaty / Organic Soil' },
            ]}
          />
        </form>
      </AgriModal>
    </div>
  );
};
