import React, { useEffect, useState } from 'react';
import {
  History,
  RefreshCw,
  Search,
  Calendar,
  ChevronRight,
  Layers,
  Droplets,
  TrendingUp,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { StageBResponse } from '../../types';
import { CombinedResultCard } from './CombinedResultCard';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriButton } from '../../components/ui/AgriButton';
import { AgriBadge } from '../../components/ui/AgriBadge';
import { AgriModal } from '../../components/ui/AgriModal';
import { AgriInput } from '../../components/ui/AgriInput';

interface AssessmentHistoryViewProps {
  onSelectAssessment?: (assessment: StageBResponse) => void;
}

export const AssessmentHistoryView: React.FC<AssessmentHistoryViewProps> = ({
  onSelectAssessment,
}) => {
  const [assessments, setAssessments] = useState<StageBResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState<StageBResponse | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiService.getAssessments();
      setAssessments(resp.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assessment audit history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filtered = assessments.filter((a) => {
    const term = searchTerm.toLowerCase();
    return (
      a.farmer_confirmed_crop?.toLowerCase().includes(term) ||
      a.assessment_id?.toLowerCase().includes(term) ||
      a.farm_id?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <AgriBadge variant="status-live">Audit Log</AgriBadge>
            <AgriBadge variant="academic-demo">Cloud Firestore Persisted</AgriBadge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
            Assessment History & Audit Trail
          </h1>
          <p className="text-xs text-content-muted mt-0.5">
            Immutable records of multi-engine evaluations, model versions, and farmer decisions.
          </p>
        </div>

        <AgriButton
          variant="outline"
          size="sm"
          loading={loading}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={fetchHistory}
        >
          Refresh Audit Log
        </AgriButton>
      </div>

      {/* Search & Filter Bar */}
      <AgriCard className="p-4">
        <div className="flex items-center space-x-3">
          <div className="relative flex-1">
            <AgriInput
              placeholder="Search by confirmed crop, assessment ID, or farm ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            <Search className="w-4 h-4 text-content-muted absolute left-3 top-3.5 pointer-events-none" />
          </div>
          <AgriBadge variant="status-neutral">
            {filtered.length} of {assessments.length} Records
          </AgriBadge>
        </div>
      </AgriCard>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-xs text-semantic-error">
          {error}
        </div>
      )}

      {/* History Table / Records */}
      {loading && assessments.length === 0 ? (
        <AgriCard className="text-center py-12 text-xs text-content-muted">
          Loading audit records from Firestore repository...
        </AgriCard>
      ) : filtered.length === 0 ? (
        <AgriCard className="text-center py-12 text-xs text-content-muted">
          <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-bold text-content-primary">No matching records found</h3>
          <p className="mt-1">
            {searchTerm ? 'Try adjusting your search query.' : 'Run a two-stage evaluation to generate persistent audit trails.'}
          </p>
        </AgriCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const irrigation = item.irrigation_result || item.irrigation;
            const fertilizer = item.fertilizer_result || item.fertilizer;
            const yieldPred = item.yield_result || item.yield_prediction;

            return (
              <AgriCard
                key={item.assessment_id}
                className="p-4 sm:p-5"
                hoverable
                onClick={() => {
                  if (onSelectAssessment) {
                    onSelectAssessment(item);
                  } else {
                    setSelectedSnapshot(item);
                  }
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-base text-content-primary capitalize">
                        {item.farmer_confirmed_crop}
                      </span>
                      <span className="font-mono text-[11px] text-content-muted bg-slate-100 px-2 py-0.5 rounded border border-border">
                        {item.assessment_id}
                      </span>
                      <AgriBadge
                        variant={item.overall_status === 'complete' ? 'status-live' : 'status-ready'}
                      >
                        {item.overall_status}
                      </AgriBadge>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-content-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                      {item.farm_id && (
                        <span>Farm: <strong>{item.farm_id}</strong></span>
                      )}
                      <span>Mode: <strong>{item.academic_demo_mode ? 'Simulation' : 'Production'}</strong></span>
                    </div>
                  </div>

                  {/* Subsystem Quick Status Chips */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="flex items-center space-x-1.5 text-xs text-content-muted">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 text-sky-800 text-[11px] font-semibold">
                        <Droplets className="w-3 h-3" />
                        {irrigation?.status}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[11px] font-semibold">
                        <Layers className="w-3 h-3" />
                        {fertilizer?.status}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-800 text-[11px] font-semibold">
                        <TrendingUp className="w-3 h-3" />
                        {yieldPred?.status}
                      </span>
                    </div>

                    <ChevronRight className="w-4 h-4 text-content-muted ml-2" />
                  </div>
                </div>
              </AgriCard>
            );
          })}
        </div>
      )}

      {/* Detailed Snapshot Inspection Modal */}
      {selectedSnapshot && (
        <AgriModal
          isOpen={Boolean(selectedSnapshot)}
          onClose={() => setSelectedSnapshot(null)}
          title={`Assessment Snapshot: ${selectedSnapshot.farmer_confirmed_crop}`}
          subtitle={`Audit ID: ${selectedSnapshot.assessment_id} • Recorded ${new Date(selectedSnapshot.timestamp).toLocaleString()}`}
          maxWidth="3xl"
          footer={
            <AgriButton variant="primary" size="sm" onClick={() => setSelectedSnapshot(null)}>
              Close Snapshot
            </AgriButton>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(selectedSnapshot.irrigation_result || selectedSnapshot.irrigation) && (
                <CombinedResultCard
                  subsystem="irrigation"
                  result={selectedSnapshot.irrigation_result || selectedSnapshot.irrigation!}
                  cropName={selectedSnapshot.farmer_confirmed_crop}
                  academicDemoMode={selectedSnapshot.academic_demo_mode}
                />
              )}
              {(selectedSnapshot.fertilizer_result || selectedSnapshot.fertilizer) && (
                <CombinedResultCard
                  subsystem="fertilizer"
                  result={selectedSnapshot.fertilizer_result || selectedSnapshot.fertilizer!}
                  cropName={selectedSnapshot.farmer_confirmed_crop}
                  academicDemoMode={selectedSnapshot.academic_demo_mode}
                />
              )}
              {(selectedSnapshot.yield_result || selectedSnapshot.yield_prediction) && (
                <CombinedResultCard
                  subsystem="yield"
                  result={selectedSnapshot.yield_result || selectedSnapshot.yield_prediction!}
                  cropName={selectedSnapshot.farmer_confirmed_crop}
                  academicDemoMode={selectedSnapshot.academic_demo_mode}
                />
              )}
            </div>
          </div>
        </AgriModal>
      )}
    </div>
  );
};
