import React, { useState } from 'react';
import { Sprout, ArrowRight, ShieldCheck } from 'lucide-react';
import { apiService } from '../../services/api';
import { CropRecommendationOutput } from '../../types';

export const CropRecommendationCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CropRecommendationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestInference = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.recommendCrop({
        nitrogen: 90,
        phosphorus: 42,
        potassium: 43,
        temperature: 20.8,
        humidity: 82.0,
        ph: 6.5,
        rainfall: 202.9,
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to execute inference test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-800/80 border border-slate-700/60 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between transition-all hover:border-agri-500/40">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-agri-500/10 text-agri-400 border border-agri-500/20">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-agri-400">Module 1</span>
              <h3 className="text-lg font-bold text-white">Crop Recommendation</h3>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            Decision Tree
          </span>
        </div>

        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          Evaluates soil N-P-K, pH, and climate metrics to classify optimal crop suitability across <strong>22 supported crops</strong>.
        </p>

        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1.5 mb-4">
          <div className="flex items-center text-slate-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-agri-400" />
            <span>Agronomic Boundary:</span>
          </div>
          <p>Strictly bounded to 22 crops. Direct yield prediction pipeline available for <strong>Rice</strong> and <strong>Maize</strong> only.</p>
        </div>

        {result && (
          <div className="p-3.5 rounded-xl bg-agri-950/40 border border-agri-800/50 mb-4">
            <div className="text-xs text-agri-300 font-medium">Test Contract Output:</div>
            <div className="text-base font-bold text-white mt-1 capitalize">
              Recommended: {result.recommended_crop}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Integrated Yield Pathway: {result.pathway_available ? 'Available (Rice/Maize)' : 'Not applicable for this crop'}
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
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-agri-600 to-agri-500 hover:from-agri-500 hover:to-agri-400 text-white font-medium text-sm transition-all shadow-md hover:shadow-agri-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
      >
        <span>{loading ? 'Verifying...' : 'Verify Endpoint Contract'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
