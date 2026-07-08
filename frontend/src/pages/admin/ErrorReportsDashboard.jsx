import React, { useState, useEffect } from "react";
import api from "../../services/api";
import dayjs from "dayjs";

export default function ErrorReportsDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get("/error-reports", { params: { status: statusFilter } });
      setReports(res.data.data);
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/error-reports/${id}`, { status });
      setReports((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status } : r))
      );
      if (selectedReport?._id === id) {
        setSelectedReport({ ...selectedReport, status });
      }
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold font-heading">Error Reports (Admin)</h1>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0A1A2F] border border-[#9fd5b2]/30 rounded-lg px-4 py-2 outline-none focus:border-[#9fd5b2]"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-[#9fd5b2]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          </div>
        ) : (
          <div className="bg-[#0A1A2F] rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-white/50">
                    <th className="px-6 py-4 font-semibold">Time</th>
                    <th className="px-6 py-4 font-semibold">Source</th>
                    <th className="px-6 py-4 font-semibold">Error</th>
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-white/50">No reports found.</td>
                    </tr>
                  ) : (
                    reports.map((report) => (
                      <tr key={report._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 text-sm text-white/70 whitespace-nowrap">
                          {dayjs(report.createdAt).format("MMM D, HH:mm")}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="bg-white/10 px-2 py-1 rounded text-xs font-medium text-white/80">
                            {report.source}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/90 max-w-xs truncate">
                          {report.error?.message || report.error?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-white/70 truncate max-w-[150px]">
                          {report.userId?.email || report.authentication?.email || "Unknown"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                            report.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' : 
                            report.status === 'open' ? 'bg-red-500/20 text-red-400' : 
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setSelectedReport(report)}
                            className="text-[#9fd5b2] hover:text-[#86c49a] text-sm font-semibold transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300">
          <div className="bg-[#0A1A2F] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  Report Detail
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    selectedReport.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {selectedReport.status}
                  </span>
                </h2>
                <p className="text-xs text-white/50 mt-1">ID: {selectedReport._id} | CorID: {selectedReport.correlationId}</p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="text-white/50 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {selectedReport.feedback && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 className="text-[#9fd5b2] font-bold text-sm uppercase tracking-wider mb-3">User Feedback</h3>
                    <div className="space-y-3">
                      <div><span className="text-white/50 text-xs block mb-1">What happened?</span><p className="text-sm">{selectedReport.feedback.whatHappened}</p></div>
                      <div><span className="text-white/50 text-xs block mb-1">Trying to do?</span><p className="text-sm">{selectedReport.feedback.whatTryingToDo}</p></div>
                      <div><span className="text-white/50 text-xs block mb-1">Reproducible?</span><p className="text-sm capitalize">{selectedReport.feedback.reproducible}</p></div>
                    </div>
                  </div>
                )}

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-[#9fd5b2] font-bold text-sm uppercase tracking-wider mb-3">Error Details</h3>
                  {selectedReport.error ? (
                    <div className="space-y-3">
                      <div><span className="text-white/50 text-xs block mb-1">Message</span><p className="text-sm font-mono bg-black/30 p-2 rounded break-words">{selectedReport.error.message}</p></div>
                      {selectedReport.error.stack && (
                        <div><span className="text-white/50 text-xs block mb-1">Stack Trace</span><pre className="text-xs font-mono bg-black/30 p-3 rounded overflow-x-auto text-red-400">{selectedReport.error.stack}</pre></div>
                      )}
                      {selectedReport.error.componentStack && (
                        <div><span className="text-white/50 text-xs block mb-1">React Component Stack</span><pre className="text-xs font-mono bg-black/30 p-3 rounded overflow-x-auto text-amber-400">{selectedReport.error.componentStack}</pre></div>
                      )}
                    </div>
                  ) : <p className="text-sm text-white/50">No explicit error object captured.</p>}
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-[#9fd5b2] font-bold text-sm uppercase tracking-wider mb-3">Environment</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-white/50 text-xs block">Browser</span><p className="text-sm">{selectedReport.browser?.name} {selectedReport.browser?.version}</p></div>
                    <div><span className="text-white/50 text-xs block">OS</span><p className="text-sm">{selectedReport.device?.os} {selectedReport.device?.osVersion}</p></div>
                    <div><span className="text-white/50 text-xs block">Device</span><p className="text-sm capitalize">{selectedReport.device?.type || "Unknown"}</p></div>
                    <div><span className="text-white/50 text-xs block">URL</span><p className="text-sm truncate">{selectedReport.application?.pathname}</p></div>
                    <div><span className="text-white/50 text-xs block">Network</span><p className="text-sm capitalize">{selectedReport.network?.effectiveType} ({selectedReport.network?.online ? "Online" : "Offline"})</p></div>
                    <div><span className="text-white/50 text-xs block">App Version</span><p className="text-sm">{selectedReport.application?.frontendVersion}</p></div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {selectedReport.screenshotBase64 && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 className="text-[#9fd5b2] font-bold text-sm uppercase tracking-wider mb-3">Screenshot</h3>
                    <img src={selectedReport.screenshotBase64} alt="Error screenshot" className="w-full rounded border border-white/10" />
                  </div>
                )}
                
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-[#9fd5b2] font-bold text-sm uppercase tracking-wider mb-3">Authentication context</h3>
                  <pre className="text-xs font-mono bg-black/30 p-3 rounded overflow-x-auto text-white/80">
                    {JSON.stringify(selectedReport.authentication, null, 2)}
                  </pre>
                </div>
                
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-[#9fd5b2] font-bold text-sm uppercase tracking-wider mb-3">Performance metrics</h3>
                  <pre className="text-xs font-mono bg-black/30 p-3 rounded overflow-x-auto text-white/80">
                    {JSON.stringify(selectedReport.performance, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-white/[0.02] flex justify-between items-center">
              <div className="flex gap-3">
                {selectedReport.status !== 'resolved' && (
                  <button 
                    onClick={() => updateStatus(selectedReport._id, 'resolved')}
                    className="px-6 py-2.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg font-bold transition-colors"
                  >
                    Mark Resolved
                  </button>
                )}
                {selectedReport.status === 'resolved' && (
                  <button 
                    onClick={() => updateStatus(selectedReport._id, 'open')}
                    className="px-6 py-2.5 bg-white/10 text-white hover:bg-white/20 rounded-lg font-bold transition-colors"
                  >
                    Reopen
                  </button>
                )}
              </div>
              <button onClick={() => setSelectedReport(null)} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
