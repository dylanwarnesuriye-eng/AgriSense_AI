import React, { useState } from 'react';
import {
  Tractor,
  Plus,
  MapPin,
  Maximize2,
  Activity,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { FarmModel, MeasurementSource } from '../../types';

interface FarmManagementViewProps {
  farms: FarmModel[];
  onRefreshFarms: () => Promise<void>;
}

export const FarmManagementView: React.FC<FarmManagementViewProps> = ({
  farms,
  onRefreshFarms,
}) => {
  const [selectedFarmId, setSelectedFarmId] = useState<string>(farms[0]?.farm_id || '');
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');

  // Modals / forms state
  const [showCreateFarmModal, setShowCreateFarmModal] = useState(false);
  const [showCreateFieldModal, setShowCreateFieldModal] = useState(false);
  const [showAddMeasurementModal, setShowAddMeasurementModal] = useState(false);

  // Loading / feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New Farm form
  const [newFarmName, setNewFarmName] = useState('');
  const [newFarmLocation, setNewFarmLocation] = useState('');
  const [newFarmArea, setNewFarmArea] = useState(25);
  const [newFarmNotes, setNewFarmNotes] = useState('');

  // New Field form
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldArea, setNewFieldArea] = useState(5);
  const [newFieldSoilType, setNewFieldSoilType] = useState('Clay Loam');

  // New Measurement form (Strictly Typed Units, Source tracking)
  const [measSource, setMeasSource] = useState<MeasurementSource>('sensor');
  const [measNitrogen, setMeasNitrogen] = useState<string>('');
  const [measPhosphorus, setMeasPhosphorus] = useState<string>('');
  const [measPotassium, setMeasPotassium] = useState<string>('');
  const [measPh, setMeasPh] = useState<string>('6.5');
  const [measTemp, setMeasTemp] = useState<string>('25.0');
  const [measHumidity, setMeasHumidity] = useState<string>('70.0');
  const [measRainfall, setMeasRainfall] = useState<string>('');
  const [measSoilMoisture, setMeasSoilMoisture] = useState<string>('');

  const selectedFarm = farms.find((f) => f.farm_id === selectedFarmId) || farms[0];
  const selectedField = selectedFarm?.fields.find((fld) => fld.field_id === selectedFieldId) || selectedFarm?.fields[0];

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await apiService.createFarm({
        name: newFarmName,
        location: newFarmLocation,
        total_area_hectares: Number(newFarmArea),
        notes: newFarmNotes || undefined,
      });
      await onRefreshFarms();
      setSelectedFarmId(resp.data.farm_id);
      setShowCreateFarmModal(false);
      setNewFarmName('');
      setNewFarmLocation('');
      setSuccess('Farm registered successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to create farm.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await apiService.createField(selectedFarm.farm_id, {
        name: newFieldName,
        area_hectares: Number(newFieldArea),
        soil_type: newFieldSoilType,
      });
      await onRefreshFarms();
      setSelectedFieldId(resp.data.field_id);
      setShowCreateFieldModal(false);
      setNewFieldName('');
      setSuccess('Field plot added successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to create field plot.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm || !selectedField) return;
    setLoading(true);
    setError(null);
    try {
      await apiService.addMeasurement(selectedFarm.farm_id, selectedField.field_id, {
        source: measSource,
        nitrogen: measNitrogen !== '' ? parseFloat(measNitrogen) : null,
        phosphorus: measPhosphorus !== '' ? parseFloat(measPhosphorus) : null,
        potassium: measPotassium !== '' ? parseFloat(measPotassium) : null,
        ph: measPh !== '' ? parseFloat(measPh) : null,
        temperature: measTemp !== '' ? parseFloat(measTemp) : null,
        humidity: measHumidity !== '' ? parseFloat(measHumidity) : null,
        rainfall: measRainfall !== '' ? parseFloat(measRainfall) : null,
        soil_moisture: measSoilMoisture !== '' ? parseFloat(measSoilMoisture) : null,
        units: {
          nitrogen: 'mg/kg',
          phosphorus: 'mg/kg',
          potassium: 'mg/kg',
          ph: 'pH_scale',
          temperature: 'celsius',
          humidity: 'percent',
          rainfall: 'mm',
          soil_moisture: 'percent_volumetric',
        },
      });
      await onRefreshFarms();
      setShowAddMeasurementModal(false);
      setSuccess('Typed soil and climate measurement logged (missing fields preserved as null).');
    } catch (err: any) {
      setError(err.message || 'Failed to record measurement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-agri-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Tractor className="w-4 h-4" />
            <span>Farm & Plot Registry</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Farm Management & Field Telemetry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Maintain typed soil and environmental measurements with explicit units without zero coercion.
          </p>
        </div>

        <button
          onClick={() => setShowCreateFarmModal(true)}
          className="px-4 py-2 rounded-xl bg-agri-600 hover:bg-agri-500 text-white font-bold text-xs shadow-lg shadow-agri-600/20 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Farm
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Farm Selector Tabs */}
      {farms.length > 0 ? (
        <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {farms.map((f) => (
              <button
                key={f.farm_id}
                onClick={() => {
                  setSelectedFarmId(f.farm_id);
                  setSelectedFieldId(f.fields[0]?.field_id || '');
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all shrink-0 flex items-center gap-2 ${
                  selectedFarm?.farm_id === f.farm_id
                    ? 'bg-agri-500/10 border-agri-500/40 text-agri-300 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Tractor className="w-3.5 h-3.5" />
                <span>{f.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">({f.total_area_hectares} ha)</span>
              </button>
            ))}
          </div>

          {/* Active Farm Detail Panel */}
          {selectedFarm && (
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6">
              {/* Farm Overview Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedFarm.name}
                    <span className="text-xs font-mono font-normal text-slate-500">ID: {selectedFarm.farm_id}</span>
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {selectedFarm.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                      {selectedFarm.total_area_hectares} Hectares Total
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowCreateFieldModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Field Plot
                </button>
              </div>

              {/* Fields List */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Agricultural Plots / Fields ({selectedFarm.fields.length})
                </h4>

                {selectedFarm.fields.length === 0 ? (
                  <div className="p-8 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-500">
                    No field plots registered yet. Click &quot;Add Field Plot&quot; to define plots and start logging telemetry.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedFarm.fields.map((fld) => (
                      <div
                        key={fld.field_id}
                        onClick={() => setSelectedFieldId(fld.field_id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedField?.field_id === fld.field_id
                            ? 'bg-sky-500/10 border-sky-500/50 text-white shadow-lg'
                            : 'bg-slate-950/50 border-slate-800/80 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-white">{fld.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">{fld.soil_type}</span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center justify-between">
                          <span>Area: {fld.area_hectares} ha</span>
                          <span className="text-sky-400 font-semibold">{fld.measurements.length} logs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Field Measurement History */}
              {selectedField && (
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        Plot Telemetry: {selectedField.name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Historical laboratory and IoT sensor telemetry. Missing measurements are preserved as null.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAddMeasurementModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Log Measurement
                    </button>
                  </div>

                  {selectedField.measurements.length === 0 ? (
                    <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-500">
                      No measurements logged for {selectedField.name}. Record soil NPK or weather observations.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Source</th>
                            <th className="py-2.5 px-3">Soil pH</th>
                            <th className="py-2.5 px-3">N (mg/kg)</th>
                            <th className="py-2.5 px-3">P (mg/kg)</th>
                            <th className="py-2.5 px-3">K (mg/kg)</th>
                            <th className="py-2.5 px-3">Temp (°C)</th>
                            <th className="py-2.5 px-3">Rain (mm)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {selectedField.measurements.map((m) => (
                            <tr key={m.measurement_id} className="hover:bg-slate-800/30">
                              <td className="py-2.5 px-3 text-slate-400">{new Date(m.timestamp).toLocaleDateString()}</td>
                              <td className="py-2.5 px-3 text-sky-400 uppercase text-[10px]">{m.source}</td>
                              <td className="py-2.5 px-3 text-white">{m.ph !== null ? m.ph.toFixed(1) : '—'}</td>
                              <td className="py-2.5 px-3 text-white">{m.nitrogen !== null ? m.nitrogen : '—'}</td>
                              <td className="py-2.5 px-3 text-white">{m.phosphorus !== null ? m.phosphorus : '—'}</td>
                              <td className="py-2.5 px-3 text-white">{m.potassium !== null ? m.potassium : '—'}</td>
                              <td className="py-2.5 px-3 text-white">{m.temperature !== null ? `${m.temperature}°C` : '—'}</td>
                              <td className="py-2.5 px-3 text-white">{m.rainfall !== null ? `${m.rainfall} mm` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
          <Tractor className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Farms Registered</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create your first farm to track plots, soil measurements, and run integrated two-stage AI assessments.
          </p>
          <button
            onClick={() => setShowCreateFarmModal(true)}
            className="px-4 py-2 rounded-xl bg-agri-600 hover:bg-agri-500 text-white font-bold text-xs shadow-lg shadow-agri-600/20 transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create First Farm
          </button>
        </div>
      )}

      {/* Modal: Create Farm */}
      {showCreateFarmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={handleCreateFarm}
            className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4 text-xs"
          >
            <h3 className="text-base font-bold text-white">Register New Farm</h3>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Farm Name</label>
              <input
                type="text"
                value={newFarmName}
                onChange={(e) => setNewFarmName(e.target.value)}
                placeholder="e.g. Mahaweli Plot 4"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Location / District</label>
              <input
                type="text"
                value={newFarmLocation}
                onChange={(e) => setNewFarmLocation(e.target.value)}
                placeholder="e.g. Anuradhapura, North Central"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Total Area (Hectares)</label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                value={newFarmArea}
                onChange={(e) => setNewFarmArea(parseFloat(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Notes (Optional)</label>
              <textarea
                value={newFarmNotes}
                onChange={(e) => setNewFarmNotes(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateFarmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-agri-600 hover:bg-agri-500 text-white font-bold"
              >
                {loading ? 'Creating...' : 'Save Farm'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create Field */}
      {showCreateFieldModal && selectedFarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={handleCreateField}
            className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4 text-xs"
          >
            <h3 className="text-base font-bold text-white">Add Field Plot to {selectedFarm.name}</h3>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Plot Name</label>
              <input
                type="text"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="e.g. North Paddy Block A"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Area (Hectares)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={newFieldArea}
                onChange={(e) => setNewFieldArea(parseFloat(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Soil Texture Class</label>
              <select
                value={newFieldSoilType}
                onChange={(e) => setNewFieldSoilType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="Clay Loam">Clay Loam</option>
                <option value="Sandy Loam">Sandy Loam</option>
                <option value="Silt Loam">Silt Loam</option>
                <option value="Clay">Clay</option>
                <option value="Peat">Peat</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateFieldModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
              >
                {loading ? 'Adding...' : 'Add Plot'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Typed Measurement */}
      {showAddMeasurementModal && selectedField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={handleAddMeasurement}
            className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4 text-xs"
          >
            <div>
              <h3 className="text-base font-bold text-white">Log Soil & Climate Measurement</h3>
              <p className="text-[11px] text-slate-400">
                Plot: {selectedField.name}. Missing inputs will be preserved as null without zero coercion.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Telemetry Source</label>
                <select
                  value={measSource}
                  onChange={(e) => setMeasSource(e.target.value as MeasurementSource)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="sensor">IoT Sensor</option>
                  <option value="lab_test">Soil Chemistry Lab</option>
                  <option value="satellite">Satellite / Drone</option>
                  <option value="manual_entry">Manual Entry</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Soil pH (0-14)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="14"
                  value={measPh}
                  onChange={(e) => setMeasPh(e.target.value)}
                  placeholder="Leave empty if unmeasured"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Nitrogen (mg/kg)</label>
                <input
                  type="number"
                  step="1"
                  value={measNitrogen}
                  onChange={(e) => setMeasNitrogen(e.target.value)}
                  placeholder="Optional (null if empty)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Phosphorus (mg/kg)</label>
                <input
                  type="number"
                  step="1"
                  value={measPhosphorus}
                  onChange={(e) => setMeasPhosphorus(e.target.value)}
                  placeholder="Optional (null if empty)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Potassium (mg/kg)</label>
                <input
                  type="number"
                  step="1"
                  value={measPotassium}
                  onChange={(e) => setMeasPotassium(e.target.value)}
                  placeholder="Optional (null if empty)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.5"
                  value={measTemp}
                  onChange={(e) => setMeasTemp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Relative Humidity (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={measHumidity}
                  onChange={(e) => setMeasHumidity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Rainfall (mm)</label>
                <input
                  type="number"
                  step="1"
                  value={measRainfall}
                  onChange={(e) => setMeasRainfall(e.target.value)}
                  placeholder="Optional (null if empty)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Soil Moisture (% Volumetric)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={measSoilMoisture}
                  onChange={(e) => setMeasSoilMoisture(e.target.value)}
                  placeholder="Optional (null if empty)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddMeasurementModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {loading ? 'Saving...' : 'Save Telemetry'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
