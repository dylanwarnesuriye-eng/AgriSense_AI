import React, { useState } from 'react';
import {
  Tractor,
  Plus,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { FarmModel } from '../../types';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriButton } from '../../components/ui/AgriButton';
import { AgriBadge } from '../../components/ui/AgriBadge';
import { AgriModal } from '../../components/ui/AgriModal';
import { AgriInput } from '../../components/ui/AgriInput';
import { ScreenId } from '../../components/layout/AppShell';

interface FarmsListViewProps {
  farms: FarmModel[];
  selectedFarmId: string;
  onSelectFarmId: (id: string) => void;
  onRefreshFarms: () => Promise<void>;
  onNavigate: (screen: ScreenId) => void;
}

export const FarmsListView: React.FC<FarmsListViewProps> = ({
  farms,
  selectedFarmId,
  onSelectFarmId,
  onRefreshFarms,
  onNavigate,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [area, setArea] = useState<number>(20);
  const [notes, setNotes] = useState('');

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await apiService.createFarm({
        name,
        location,
        total_area_hectares: Number(area),
        notes: notes || undefined,
      });
      await onRefreshFarms();
      onSelectFarmId(resp.data.farm_id);
      setShowCreateModal(false);
      setName('');
      setLocation('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to register farm.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
            Farm Registry & Enterprise Boundaries
          </h1>
          <p className="text-xs text-content-muted mt-1">
            Registered agricultural estates, total contiguous hectares, and regional geolocations.
          </p>
        </div>

        <AgriButton
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          Register New Farm
        </AgriButton>
      </div>

      {/* Farms Grid */}
      {farms.length === 0 ? (
        <AgriCard className="text-center py-12">
          <Tractor className="w-12 h-12 text-content-muted mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-content-primary">No farms registered</h3>
          <p className="text-xs text-content-muted max-w-sm mx-auto mt-1 mb-6">
            Register your first agricultural property to begin logging telemetry and executing precision AI assessments.
          </p>
          <AgriButton
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Register Farm Now
          </AgriButton>
        </AgriCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {farms.map((farm) => {
            const isSelected = farm.farm_id === selectedFarmId;
            return (
              <AgriCard
                key={farm.farm_id}
                className={`transition-all ${
                  isSelected ? 'border-brand-primary ring-1 ring-brand-primary/20 shadow-sm' : ''
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-base text-content-primary">
                          {farm.name}
                        </span>
                        {isSelected && (
                          <AgriBadge variant="status-live" pulse>
                            Active Context
                          </AgriBadge>
                        )}
                      </div>
                      <div className="flex items-center text-xs text-content-muted">
                        <MapPin className="w-3 h-3 mr-1 text-brand-primary shrink-0" />
                        <span className="truncate">{farm.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-3 border-y border-border text-xs">
                    <div>
                      <span className="text-content-muted text-[11px] block">Total Area</span>
                      <span className="font-bold text-content-primary tabular-nums">
                        {farm.total_area_hectares} ha
                      </span>
                    </div>
                    <div>
                      <span className="text-content-muted text-[11px] block">Field Plots</span>
                      <span className="font-bold text-content-primary tabular-nums">
                        {farm.fields.length} Plots
                      </span>
                    </div>
                  </div>

                  {farm.notes && (
                    <p className="text-[11px] text-content-muted line-clamp-2 italic">
                      "{farm.notes}"
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => onSelectFarmId(farm.farm_id)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded transition-colors ${
                        isSelected
                          ? 'text-brand-primary bg-brand-tint cursor-default'
                          : 'text-content-primary hover:text-brand-primary hover:bg-slate-100 cursor-pointer'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Set as Active'}
                    </button>

                    <AgriButton
                      variant="outline"
                      size="sm"
                      icon={<ChevronRight className="w-3.5 h-3.5" />}
                      onClick={() => {
                        onSelectFarmId(farm.farm_id);
                        onNavigate('farm-details');
                      }}
                    >
                      View Fields
                    </AgriButton>
                  </div>
                </div>
              </AgriCard>
            );
          })}
        </div>
      )}

      {/* Register Farm Modal */}
      <AgriModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register Agricultural Property"
        subtitle="Establish estate metadata and boundary hectares"
        footer={
          <>
            <AgriButton variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </AgriButton>
            <AgriButton variant="primary" size="sm" loading={loading} onClick={handleCreateFarm}>
              Create Farm
            </AgriButton>
          </>
        }
      >
        <form onSubmit={handleCreateFarm} className="space-y-4">
          {error && <p className="text-xs text-semantic-error">{error}</p>}
          <AgriInput
            label="Farm Estate Name"
            placeholder="e.g. Green Valley Agricultural Research Farm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <AgriInput
            label="Geographic Location / Region"
            placeholder="e.g. Sacramento Valley, California"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
          <AgriInput
            label="Total Boundary Area"
            type="number"
            step="0.1"
            min="0.1"
            unit="ha"
            value={area}
            onChange={(e) => setArea(Number(e.target.value))}
            required
          />
          <AgriInput
            label="Operational Notes (Optional)"
            placeholder="e.g. Center pivot irrigation, certified organic research plot"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </form>
      </AgriModal>
    </div>
  );
};
