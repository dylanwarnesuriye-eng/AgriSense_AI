import React, { useState } from 'react';
import { FlaskConical, ArrowRight, BookOpen } from 'lucide-react';
import { apiService } from '../../services/api';
import { FertilizerAdvisoryOutput } from '../../types';

export const FertilizerAdvisoryCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FertilizerAdvisoryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestInference = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.diagnoseFertilizer({
        crop_name: 'rice',
        nitrogen: 80,
        phosphorus: 35,
        potassium: 40,
        ph: 6.5,
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to execute inference test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-800/80 border border-slate-700/60 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between transition-all hover:border-amber-500/40">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-400">Module 3</span>
              <h3 className="text-lg font-bold text-white">Fertilizer Advisory</h3>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
            Rule Knowledge
          </span>
        </div>

        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          Expert rule-based knowledge engine assessing soil macronutrient balances to recommend soil amendments.
        </p>

        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1.5 mb-4">
          <div className="flex items-center text-amber-300 font-medium">
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            <span>Agronomic Boundary:</span>
          </div>
          <p>Fertilizer quantities and nutrient thresholds are deferred until certified agronomic extension rules are integrated.</p>
        </div>

        {result && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 mb-4">
            <div className="text-xs text-amber-300 font-medium">Test Contract Output:</div>
            <div className="text-base font-bold text-white mt-1">
              Target Crop: <span className="capitalize">{result.crop_name}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Status: {typeof result.nutrient_status === 'object' ? JSON.stringify(result.nutrient_status) : (result.nutrient_status || result.assessment_status)}
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
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-medium text-sm transition-all shadow-md hover:shadow-amber-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
      >
        <span>{loading ? 'Verifying...' : 'Verify Endpoint Contract'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
