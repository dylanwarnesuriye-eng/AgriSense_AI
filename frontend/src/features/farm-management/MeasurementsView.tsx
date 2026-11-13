import React, { useState } from 'react';
import {
  Activity,
  Plus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Clock,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { FarmModel, MeasurementSource, SoilClimateMeasurement } from '../../types';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriButton } from '../../components/ui/AgriButton';
import { AgriBadge } from '../../components/ui/AgriBadge';
import { AgriInput } from '../../components/ui/AgriInput';
import { AgriSelect } from '../../components/ui/AgriSelect';
import { AgriCallout } from '../../components/ui/AgriCallout';
import { ScreenId } from '../../components/layout/AppShell';

interface MeasurementsViewProps {
  farms: FarmModel[];
  selectedFarmId: string;
  selectedFieldId?: string;
  onRefreshFarms: () => Promise<void>;
  onNavigate: (screen: ScreenId) => void;
  onPopulateOrchestrator?: (inputs: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    temperature: number;
    humidity: number;
    ph: number;
    rainfall: number;
  }) => void;
}

export const MeasurementsView: React.FC<MeasurementsViewProps> = ({
  farms,
  selectedFarmId,
  selectedFieldId: initialFieldId,
  onRefreshFarms,
  onNavigate,
  onPopulateOrchestrator,
}) => {
  const selectedFarm =
    farms.find((f) => f.farm_id === selectedFarmId && f.fields && f.fields.length > 0) ||
    farms.find((f) => f.fields && f.fields.length > 0) ||
    farms.find((f) => f.farm_id === selectedFarmId) ||
    farms[0];
  const [fieldId, setFieldId] = useState<string>(
    initialFieldId || selectedFarm?.fields?.[0]?.field_id || ''
  );

  const selectedField =
    selectedFarm?.fields?.find((fld) => fld.field_id === fieldId) ||
    selectedFarm?.fields?.[0];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Strictly Typed Measurement Inputs (Strings to allow empty/null values)
  const [source, setSource] = useState<MeasurementSource>('sensor');
  const [nitrogen, setNitrogen] = useState<string>('90');
  const [phosphorus, setPhosphorus] = useState<string>('42');
  const [potassium, setPotassium] = useState<string>('43');
  const [ph, setPh] = useState<string>('6.5');
  const [temperature, setTemperature] = useState<string>('24.5');
  const [humidity, setHumidity] = useState<string>('75.0');
  const [rainfall, setRainfall] = useState<string>('200.0');
  const [soilMoisture, setSoilMoisture] = useState<string>('55.0');

  const handleLogMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm || !selectedField) {
      setError('Please select a farm and field plot first.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    // Build payload without coercing missing values to zero
    const payload: Partial<SoilClimateMeasurement> = {
      source,
      nitrogen: nitrogen.trim() !== '' ? Number(nitrogen) : undefined,
      phosphorus: phosphorus.trim() !== '' ? Number(phosphorus) : undefined,
      potassium: potassium.trim() !== '' ? Number(potassium) : undefined,
      ph: ph.trim() !== '' ? Number(ph) : undefined,
      temperature_c: temperature.trim() !== '' ? Number(temperature) : undefined,
      relative_humidity_pct: humidity.trim() !== '' ? Number(humidity) : undefined,
      rainfall_mm: rainfall.trim() !== '' ? Number(rainfall) : undefined,
      soil_moisture_pct: soilMoisture.trim() !== '' ? Number(soilMoisture) : undefined,
      verified_units: true,
    };

    try {
      await apiService.addMeasurement(selectedFarm.farm_id, selectedField.field_id, payload);
      await onRefreshFarms();
      setSuccess('Soil and climate telemetry recorded successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to log telemetry.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseInOrchestrator = () => {
    if (onPopulateOrchestrator) {
      onPopulateOrchestrator({
        nitrogen: Number(nitrogen) || 80,
        phosphorus: Number(phosphorus) || 40,
        potassium: Number(potassium) || 40,
        temperature: Number(temperature) || 25,
        humidity: Number(humidity) || 75,
        ph: Number(ph) || 6.5,
        rainfall: Number(rainfall) || 200,
      });
    }
    onNavigate('orchestrator');
  };

  if (!selectedFarm) {
    return (
      <AgriCard className="text-center py-12">
        <Activity className="w-12 h-12 text-content-muted mx-auto mb-3 opacity-60" />
        <h3 className="text-base font-bold text-content-primary">No Farm Registered</h3>
        <p className="text-xs text-content-muted max-w-sm mx-auto mt-1 mb-4">
          Please register a farm estate before recording field telemetry.
        </p>
        <AgriButton variant="primary" onClick={() => onNavigate('farms')}>
          Register Farm
        </AgriButton>
      </AgriCard>
    );
  }

  const measurementsList = selectedField?.measurements || [];

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
            Soil Chemistry & Environmental Telemetry
          </h1>
          <p className="text-xs text-content-muted mt-0.5">
            Calibrated sensor feeds, laboratory assays, and environmental telemetry with strictly typed units.
          </p>
        </div>

        {/* Field Selector Pill */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-content-muted">Target Plot:</label>
          <select
            value={selectedField?.field_id || ''}
            onChange={(e) => setFieldId(e.target.value)}
            className="h-9 px-3 bg-surface border border-border-subtle rounded text-xs font-bold text-content-primary focus:outline-none focus:border-brand-primary"
          >
            {selectedFarm.fields.map((fld) => (
              <option key={fld.field_id} value={fld.field_id}>
                {fld.name} ({fld.soil_type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Form + Telemetry Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Logging Form */}
        <div className="lg:col-span-7">
          <AgriCard
            title={
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-primary" />
                <span>Log Field Measurement</span>
              </div>
            }
            subtitle="Record validated agronomic telemetry — missing values remain uncoerced"
          >
            <form onSubmit={handleLogMeasurement} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-semantic-error flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="p-3 bg-brand-tint border border-brand-tint-border rounded text-xs text-brand-primary font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-brand-secondary" />
                  <span>{success}</span>
                </div>
              )}

              {/* Telemetry Source Selector */}
              <AgriSelect
                label="Data Collection Source"
                value={source}
                onChange={(e) => setSource(e.target.value as MeasurementSource)}
                options={[
                  { value: 'sensor', label: 'In-Situ IoT Field Sensor (Live Calibrated)' },
                  { value: 'lab_test', label: 'Certified Agronomic Soil Laboratory Assay' },
                  { value: 'satellite', label: 'Remote Sensing / Earth Observation Telemetry' },
                  { value: 'manual_entry', label: 'Manual Field Observation' },
                ]}
              />

              {/* Primary Macronutrients */}
              <div className="pt-2 border-t border-border">
                <span className="text-xs font-bold text-content-primary block mb-2">
                  Soil Chemistry (Macronutrients & pH)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <AgriInput
                    label="Nitrogen (N)"
                    placeholder="e.g. 90"
                    unit="mg/kg"
                    value={nitrogen}
                    onChange={(e) => setNitrogen(e.target.value)}
                  />
                  <AgriInput
                    label="Phosphorus (P)"
                    placeholder="e.g. 42"
                    unit="mg/kg"
                    value={phosphorus}
                    onChange={(e) => setPhosphorus(e.target.value)}
                  />
                  <AgriInput
                    label="Potassium (K)"
                    placeholder="e.g. 43"
                    unit="mg/kg"
                    value={potassium}
                    onChange={(e) => setPotassium(e.target.value)}
                  />
                  <AgriInput
                    label="Soil pH"
                    placeholder="e.g. 6.5"
                    step="0.1"
                    unit="pH"
                    value={ph}
                    onChange={(e) => setPh(e.target.value)}
                  />
                </div>
              </div>

              {/* Climate & Moisture Metrics */}
              <div className="pt-2 border-t border-border">
                <span className="text-xs font-bold text-content-primary block mb-2">
                  Microclimate & Moisture Conditions
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <AgriInput
                    label="Temperature"
                    placeholder="e.g. 24.5"
                    unit="°C"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                  />
                  <AgriInput
                    label="Rel. Humidity"
                    placeholder="e.g. 75"
                    unit="%"
                    value={humidity}
                    onChange={(e) => setHumidity(e.target.value)}
                  />
                  <AgriInput
                    label="Cumulative Rain"
                    placeholder="e.g. 200"
                    unit="mm"
                    value={rainfall}
                    onChange={(e) => setRainfall(e.target.value)}
                  />
                  <AgriInput
                    label="Soil Moisture"
                    placeholder="e.g. 55"
                    unit="%"
                    value={soilMoisture}
                    onChange={(e) => setSoilMoisture(e.target.value)}
                  />
                </div>
              </div>

              {/* Scientific Invariant Note */}
              <div className="p-2.5 bg-slate-50 border border-border rounded text-[11px] text-content-muted">
                <strong>Agronomic Standard:</strong> Blank fields remain <code>null</code>. The system never coerces missing soil measurements to zero, preventing false severe deficiency flags.
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <AgriButton
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Sparkles className="w-3.5 h-3.5 text-brand-secondary" />}
                  onClick={handleUseInOrchestrator}
                >
                  Send to Orchestrator
                </AgriButton>

                <AgriButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={loading}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Save Telemetry
                </AgriButton>
              </div>
            </form>
          </AgriCard>
        </div>

        {/* Right Column: Historical Telemetry Log */}
        <div className="lg:col-span-5 space-y-4">
          <AgriCard
            title={
              <div className="flex items-center justify-between w-full">
                <span>Telemetry Audit Trail</span>
                <AgriBadge variant="status-neutral">
                  {measurementsList.length} Entries
                </AgriBadge>
              </div>
            }
            subtitle={selectedField ? `Historical records for ${selectedField.name}` : ''}
          >
            {measurementsList.length === 0 ? (
              <div className="text-center py-8 text-xs text-content-muted">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No historical measurements for this plot.</p>
                <p className="mt-1">Fill out the form to log your first verified entry.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {measurementsList
                  .slice()
                  .reverse()
                  .map((m, idx) => (
                    <div
                      key={m.measurement_id || idx}
                      className="p-3 bg-slate-50 border border-border rounded text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-content-primary capitalize">
                          {m.source.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-content-muted">
                          {m.timestamp ? new Date(m.timestamp).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1 text-[11px] font-mono tabular-nums pt-1 border-t border-border">
                        <div>N: {m.nitrogen ?? '—'}</div>
                        <div>P: {m.phosphorus ?? '—'}</div>
                        <div>K: {m.potassium ?? '—'}</div>
                        <div>pH: {m.ph ?? '—'}</div>
                      </div>

                      <div className="grid grid-cols-4 gap-1 text-[10px] text-content-muted font-mono tabular-nums">
                        <div>{m.temperature_c ?? '—'}°C</div>
                        <div>{m.relative_humidity_pct ?? '—'}%</div>
                        <div>{m.rainfall_mm ?? '—'}mm</div>
                        <div>{m.soil_moisture_pct ?? '—'}%</div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </AgriCard>

          <AgriCallout type="simulation" title="Standardized Agronomic Units">
            All soil fertility values are recorded in <strong>mg/kg (ppm equivalent)</strong>. Rainfall and water levels are logged in <strong>mm</strong>. Temperatures adhere to Celsius.
          </AgriCallout>
        </div>
      </div>
    </div>
  );
};
