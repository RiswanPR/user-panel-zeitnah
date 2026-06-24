import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Monitor, RefreshCw, Shield, Smartphone, Tablet, Trash2 } from "lucide-react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";

const formatDate = (value) => {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
};

const getDeviceIcon = (deviceType) => {
  const type = deviceType?.toLowerCase();
  if (type === "mobile") return Smartphone;
  if (type === "tablet") return Tablet;
  return Monitor;
};

function ActiveSessions() {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revokingDeviceId, setRevokingDeviceId] = useState("");

  const currentSession = useMemo(() => sessions.find((s) => s.isCurrent), [sessions]);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/sessions");
      setSessions(res.data.sessions || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadSessions(); }, [loadSessions]);

  const handleRevoke = async (session) => {
    const confirmed = window.confirm(session.isCurrent ? "Logout this device?" : "Revoke session?");
    if (!confirmed) return;
    try {
      setRevokingDeviceId(session.deviceId);
      const res = await api.delete(`/auth/sessions/${session.deviceId}`);
      if (res.data.revokedCurrentSession) {
        localStorage.removeItem("token");
        setUser(null);
        navigate("/login");
        return;
      }
      setSessions((items) => items.filter((item) => item.deviceId !== session.deviceId));
    } catch (err) {
      alert(err.response?.data?.message);
    } finally {
      setRevokingDeviceId("");
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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-brand-mint/8 border border-brand-mint/15 px-3 py-1.5 text-xs font-semibold text-brand-mint uppercase tracking-wider mb-3">
            <Shield className="w-3.5 h-3.5" />
            Security
          </div>
          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight leading-none">
            Active Sessions
          </h1>
          <p className="text-sm font-medium text-text-muted mt-2">Monitor and manage your logged-in devices.</p>
        </div>
        <button
          type="button"
          onClick={loadSessions}
          disabled={loading}
          className="btn-secondary text-xs uppercase tracking-wider self-start shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </motion.div>

      {/* ── Summary Cards ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="rounded-2xl border border-border-default bg-bg-card p-6 relative overflow-hidden">
          <div className="gradient-line-top" />
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-4 h-4 text-brand-mint" />
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Signed-in Devices</p>
          </div>
          <p className="text-3xl sm:text-4xl font-heading font-extrabold text-white">{sessions.length}</p>
        </div>
        <div className="rounded-2xl border border-border-default bg-bg-card p-6 relative overflow-hidden">
          <div className="gradient-line-top" />
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Current Device</p>
          <p className="text-xl sm:text-2xl font-heading font-bold text-brand-mint">{currentSession?.deviceType || "Unknown"}</p>
        </div>
      </div>

      {/* ── Session List ── */}
      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 shimmer rounded-2xl" />)}</div>
      ) : error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-6 text-danger text-sm font-medium">{error}</div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session, i) => {
            const DeviceIcon = getDeviceIcon(session.deviceType);
            return (
              <motion.div
                key={session.deviceId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl border bg-bg-card p-5 sm:p-6 relative overflow-hidden transition-colors ${
                  session.isCurrent ? "border-brand-mint/20" : "border-border-default"
                }`}
              >
                <div className="gradient-line-top" />
                <div className="flex flex-col lg:flex-row gap-5 justify-between">
                  <div className="flex gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      session.isCurrent ? "bg-brand-mint/10 border border-brand-mint/20 text-brand-mint" : "bg-bg-elevated border border-white/[0.05] text-text-muted"
                    }`}>
                      <DeviceIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h2 className="text-base sm:text-lg font-heading font-bold text-white truncate">
                          {session.browser} on {session.os}
                        </h2>
                        {session.isCurrent && (
                          <span className="rounded-md border border-brand-mint/20 bg-brand-mint/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-mint">Current</span>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs font-medium text-text-muted">
                        <p>Device: {session.deviceType}</p>
                        <p>IP: {session.ip || "N/A"}</p>
                        <p>Location: {session.location || "Unknown"}</p>
                        <p>Last Seen: {formatDate(session.lastSeen)}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(session)}
                    disabled={revokingDeviceId === session.deviceId}
                    className="inline-flex items-center gap-2 self-start rounded-xl border border-danger/20 bg-danger/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-danger hover:bg-danger/10 transition-colors cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {revokingDeviceId === session.deviceId ? "Revoking..." : "Revoke"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ActiveSessions;