import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  RefreshCw,
  Shield,
  Search,
} from "lucide-react";
import { getAuditLogs } from "../../services/api";
import { Skeleton } from "../../components/ui/Skeleton";
import Badge from "../../components/ui/Badge";

const severityOptions = [
  { label: "All", value: "" },
  { label: "Info", value: "info" },
  { label: "Warning", value: "warning" },
  { label: "Critical", value: "critical" },
];

const formatDate = (value) => {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatAction = (action) =>
  (action || "UNKNOWN")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });
  const [severity, setSeverity] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filters = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      severity: severity || undefined,
      action: action.trim() || undefined,
    }),
    [pagination.page, pagination.limit, severity, action]
  );

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAuditLogs(filters);
      setLogs(res.data.items || []);

      setPagination((current) => {
        const incoming = res.data.pagination;
        if (!incoming) return current;
        if (
          current.page === incoming.page &&
          current.total === incoming.total &&
          current.totalPages === incoming.totalPages
        ) {
          return current;
        }
        return { ...current, ...incoming };
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load logs");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadLogs();
    }, 200);
    return () => clearTimeout(timeout);
  }, [loadLogs]);

  const severityBadgeVariant = (sev) => {
    switch (sev) {
      case "critical":
        return "danger";
      case "warning":
        return "warning";
      default:
        return "info";
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Back ── */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <Link to="/profile" className="btn-secondary text-xs uppercase tracking-wider inline-flex">
          <ArrowLeft className="w-4 h-4" />
          Back to profile
        </Link>
      </motion.div>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-brand-mint/8 border border-brand-mint/15 px-3 py-1.5 text-xs font-semibold text-brand-mint uppercase tracking-wider mb-3">
            <Shield className="w-3.5 h-3.5" />
            Security
          </div>
          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight leading-none">
            Audit Logs
          </h1>
          <p className="text-sm font-medium text-text-muted mt-2">
            Authentication, security and account activity history.
          </p>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="btn-secondary text-xs uppercase tracking-wider self-start shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </motion.div>

      {/* ── Toolbar ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border-default bg-bg-card p-4 sm:p-5 flex flex-col lg:flex-row gap-4 relative overflow-hidden"
      >
        <div className="gradient-line-top" />

        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-text-faint">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Search action..."
            className="w-full glass-input pl-10 pr-4 py-2.5 text-sm font-medium"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {severityOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSeverity(option.value)}
              className={`px-4 py-2 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                severity === option.value
                  ? "bg-brand-mint/10 border-brand-mint/20 text-brand-mint"
                  : "border-border-default text-text-muted hover:text-white hover:border-white/[0.1]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Summary Cards ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="rounded-2xl border border-border-default bg-bg-card p-6 relative overflow-hidden">
          <div className="gradient-line-top" />
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-4 h-4 text-brand-mint" />
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Total Events</p>
          </div>
          <p className="text-3xl sm:text-4xl font-heading font-extrabold text-white">{pagination.total}</p>
        </div>
        <div className="rounded-2xl border border-border-default bg-bg-card p-6 relative overflow-hidden">
          <div className="gradient-line-top" />
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Current Page</p>
          <p className="text-xl sm:text-2xl font-heading font-bold text-brand-mint">
            {pagination.page} / {pagination.totalPages || 1}
          </p>
        </div>
      </div>

      {/* ── Log List ── */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-6 text-danger text-sm font-medium">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-border-default bg-bg-card p-10 text-center">
          <History className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-sm font-medium text-text-muted">No logs found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log, i) => (
            <motion.div
              key={log._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-2xl border border-border-default bg-bg-card p-5 sm:p-6 relative overflow-hidden hover:border-brand-mint/15 transition-colors"
            >
              <div className="gradient-line-top" />
              <div className="flex gap-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                    log.severity === "warning" || log.severity === "critical"
                      ? "bg-warning/8 border-warning/15 text-warning"
                      : "bg-brand-mint/8 border-brand-mint/15 text-brand-mint"
                  }`}
                >
                  {log.severity === "warning" || log.severity === "critical" ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <History className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    <h2 className="text-base sm:text-lg font-heading font-bold text-white">
                      {formatAction(log.action)}
                    </h2>
                    <Badge variant={severityBadgeVariant(log.severity)} size="sm">
                      {log.severity}
                    </Badge>
                  </div>

                  <p className="text-sm font-medium text-text-muted mb-3 line-clamp-2">
                    {log.message || "Audit event recorded"}
                  </p>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1.5 text-xs font-medium text-text-muted">
                    <p className="inline-flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-brand-mint" />
                      {formatDate(log.createdAt)}
                    </p>
                    <p>Entity: {log.entityType}</p>
                    <p>IP: {log.ipAddress || "N/A"}</p>
                    <p>Device: {log.deviceId || "N/A"}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() =>
            setPagination((p) => ({ ...p, page: Math.max(p.page - 1, 1) }))
          }
          disabled={pagination.page <= 1}
          className="btn-secondary py-2.5 px-4 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider px-3">
          Page {pagination.page} of {pagination.totalPages || 1}
        </span>

        <button
          type="button"
          onClick={() =>
            setPagination((p) => ({
              ...p,
              page: Math.min(p.page + 1, p.totalPages),
            }))
          }
          disabled={pagination.page >= pagination.totalPages}
          className="btn-secondary py-2.5 px-4 disabled:opacity-30"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default AuditLogs;