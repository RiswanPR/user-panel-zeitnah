import { useState } from 'react';
import { useModerationReports, useResolveReport, useHidePostAsMod } from '../../hooks/useCommunity';
import { Shield, Check, Trash2, AlertTriangle } from 'lucide-react';

export default function ModeratorDashboard() {
  const { data: reports, isLoading } = useModerationReports();
  const resolveMutation = useResolveReport();
  const hideMutation = useHidePostAsMod();
  const [selectedReport, setSelectedReport] = useState(null);
  const [notes, setNotes] = useState('');

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">Loading reports...</div>;
  }

  const handleResolve = (action) => {
    if (!selectedReport) return;
    if (action === 'hide') {
      hideMutation.mutate({ id: selectedReport.entityId, reason: notes });
    }
    resolveMutation.mutate(
      { id: selectedReport._id, data: { action, notes } },
      {
        onSuccess: () => {
          setSelectedReport(null);
          setNotes('');
        }
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/[0.05]">
        <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-danger" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Moderator Dashboard</h1>
          <p className="text-sm text-text-muted">Review and resolve community reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Reports List */}
        <div className="md:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Pending Reports ({reports?.length || 0})
          </h2>
          
          {reports?.length === 0 && (
            <div className="p-4 rounded-xl bg-bg-surface border border-white/[0.05] text-center text-sm text-text-faint">
              All caught up!
            </div>
          )}

          {reports?.map(report => (
            <button
              key={report._id}
              onClick={() => setSelectedReport(report)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                selectedReport?._id === report._id 
                  ? 'bg-white/[0.05] border-brand-mint/50' 
                  : 'bg-bg-surface border-white/[0.05] hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium text-white capitalize">{report.entityType}</span>
              </div>
              <p className="text-xs text-text-muted truncate">{report.reason}</p>
            </button>
          ))}
        </div>

        {/* Action Panel */}
        <div className="md:col-span-2">
          {selectedReport ? (
            <div className="bg-bg-surface rounded-2xl border border-white/[0.05] p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-2">Report Details</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-text-faint uppercase">Entity Type</label>
                  <p className="text-sm text-white capitalize">{selectedReport.entityType}</p>
                </div>
                <div>
                  <label className="text-xs text-text-faint uppercase">Entity ID</label>
                  <p className="text-sm font-mono text-text-muted">{selectedReport.entityId}</p>
                </div>
                <div>
                  <label className="text-xs text-text-faint uppercase">Reason</label>
                  <p className="text-sm text-danger font-medium">{selectedReport.reason}</p>
                </div>
                {selectedReport.description && (
                  <div>
                    <label className="text-xs text-text-faint uppercase">Additional Details</label>
                    <p className="text-sm text-text-secondary">{selectedReport.description}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-white/[0.05] pt-6">
                <label className="block text-sm font-semibold text-white mb-2">Moderator Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes for audit logs..."
                  className="w-full bg-bg-base border border-white/[0.1] rounded-xl p-3 text-sm text-white placeholder-text-faint focus:outline-none focus:border-brand-mint mb-4 h-24"
                />
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleResolve('dismiss')}
                    disabled={resolveMutation.isPending}
                    className="flex-1 btn-secondary py-2 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Dismiss Report
                  </button>
                  <button 
                    onClick={() => handleResolve('hide')}
                    disabled={resolveMutation.isPending || hideMutation.isPending}
                    className="flex-1 bg-danger/10 text-danger hover:bg-danger/20 font-semibold rounded-xl py-2 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hide {selectedReport.entityType}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex items-center justify-center rounded-2xl border border-white/[0.02] border-dashed">
              <p className="text-text-faint">Select a report to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
