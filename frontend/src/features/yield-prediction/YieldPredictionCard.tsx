import React, { useState } from 'react';
import { TrendingUp, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { apiService } from '../../services/api';
import { SUPPORTED_YIELD_CROPS, YieldPredictionOutput } from '../../types';

export const YieldPredictionCard: React.FC = () => {
  const [selectedCrop, setSelectedCrop] = useState<string>('wheat');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<YieldPredictionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestInference = async (cropToTest: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await apiService.predictYield({
        crop_name: cropToTest,
        area_hectares: 10.0,
        annual_rainfall_mm: 750.0,
        fertilizer_usage_kg_per_ha: 120.0,
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-800/80 border border-slate-700/60 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between transition-all hover:border-emerald-500/40">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Module 4</span>
              <h3 className="text-lg font-bold text-white">Crop Yield Prediction</h3>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            Regression
          </span>
        </div>

        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          Supervised regression modeling crop yield based on cultivated hectares, rainfall, and agro-inputs.
        </p>

        <div className="p-3 rounded-lg bg-red-950/20 border border-red-800/30 text-xs text-red-200 space-y-1.5 mb-4">
          <div className="flex items-center font-semibold text-red-300">
            <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
            <span>Strict Yield Crop Whitelist:</span>
          </div>
          <p>
            Supports <strong>Wheat, Barley, Corn, Rice, and Soybean</strong> only. Any other crop prediction is strictly forbidden and rejected.
          </p>
        </div>

        {/* Crop Selection Selector */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Select Supported Crop:</label>
          <div className="grid grid-cols-5 gap-1.5">
            {SUPPORTED_YIELD_CROPS.map((crop) => (
              <button
                key={crop}
                type="button"
                onClick={() => setSelectedCrop(crop)}
                className={`py-1.5 text-xs font-medium rounded-lg capitalize transition-all border ${
                  selectedCrop === crop
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:border-slate-600'
                }`}
              >
                {crop}
              </button>
            ))}
          </div>
        </div>

        {result && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 mb-4">
            <div className="flex items-center text-xs text-emerald-300 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Contract Output Verified:
            </div>
            <div className="text-base font-bold text-white mt-1 capitalize">
              Crop: {result.crop_name} (Area: {result.area_hectares} ha)
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Status: {result.status}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs mb-4">
            {error}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <button
          onClick={() => handleTestInference(selectedCrop)}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-sm transition-all shadow-md hover:shadow-emerald-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <span>{loading ? 'Verifying...' : `Verify ${selectedCrop.toUpperCase()} Contract`}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Boundary test button demonstrating rejection of unsupported crops */}
        <button
          onClick={() => handleTestInference('apple')}
          disabled={loading}
          className="w-full py-2 px-3 rounded-lg bg-slate-900/60 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-800/50 text-xs transition-all flex items-center justify-center space-x-1"
        >
          <span>Test Boundary Rejection (e.g. "Apple")</span>
        </button>
      </div>
    </div>
  );
};
