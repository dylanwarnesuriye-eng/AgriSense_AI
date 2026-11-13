import React, { useState } from 'react';
import { Droplets, ArrowRight, AlertTriangle } from 'lucide-react';
import { apiService } from '../../services/api';
import { IrrigationAdvisoryOutput } from '../../types';

export const IrrigationAdvisoryCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IrrigationAdvisoryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestInference = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.evaluateIrrigation({
        soil_moisture: 35.0,
        ambient_temperature: 29.5,
        relative_humidity: 62.0,
        rainfall_forecast_24h: 0.0,
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to execute inference test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-800/80 border border-slate-700/60 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between transition-all hover:border-sky-500/40">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-sky-400">Module 2</span>
              <h3 className="text-lg font-bold text-white">Irrigation Advisory</h3>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
            Mamdani Fuzzy
          </span>
        </div>

        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          Infers soil moisture depletion and atmospheric evaporative demand using linguistic fuzzy logic rules.
        </p>

        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1.5 mb-4">
          <div className="flex items-center text-amber-400 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
            <span>Agronomic Boundary:</span>
          </div>
          <p>No arbitrary thresholds or irrigation volumes assumed. Membership curves require verified agronomic source data.</p>
        </div>

        {result && (
          <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-800/50 mb-4">
            <div className="text-xs text-sky-300 font-medium">Test Contract Output:</div>
            <div className="text-base font-bold text-white mt-1">
              Urgency Level: <span className="text-sky-300">{result.urgency_level}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Fuzzy Index: {result.fuzzy_water_index ?? 'Pending Calibration'}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-400 text-xs mb-4">
            {error}
          </div>
        )}
      </div>

      <button
        onClick={handleTestInference}
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-medium text-sm transition-all shadow-md hover:shadow-sky-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
      >
        <span>{loading ? 'Verifying...' : 'Verify Endpoint Contract'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
