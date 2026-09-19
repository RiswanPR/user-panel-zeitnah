import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Monitor,
  RefreshCw,
  Shield,
  Smartphone,
  Tablet,
  Trash2,
  AlertTriangle,
  Laptop,
} from "lucide-react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import storage from "../../services/storage";
import ProfileNav from "../../components/profile/ProfileNav";
import EmptyState from "../../components/ui/EmptyState";

const formatDate = (value) => {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const getDeviceIcon = (deviceType) => {
  const type = deviceType?.toLowerCase() || "";
  if (type.includes("mobile") || type.includes("phone")) return Smartphone;
  if (type.includes("tablet") || type.includes("ipad")) return Tablet;
  if (type.includes("mac") || type.includes("laptop")) return Laptop;
  return Monitor;
};

export default function ActiveSessions() {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revokingDeviceId, setRevokingDeviceId] = useState("");
  const [sessionToRevoke, setSessionToRevoke] = useState(null);

  const currentSession = useMemo(
    () => sessions.find((s) => s.isCurrent),
    [sessions]
  );

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/auth/sessions");
      setSessions(res.data.sessions || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load active sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const confirmRevoke = async () => {
    if (!sessionToRevoke) return;
    const session = sessionToRevoke;
    setSessionToRevoke(null);

    try {
      setRevokingDeviceId(session.deviceId);
      const res = await api.delete(`/auth/sessions/${session.deviceId}`);
      if (res.data.revokedCurrentSession) {
        storage.clearAuth();
        setUser(null);
        toast.success("Signed out", "Current device session has been terminated.");
        navigate("/login");
        return;
      }

      setSessions((items) => items.filter((item) => item.deviceId !== session.deviceId));
      toast.success("Session revoked", "The selected device session has been terminated.");
    } catch (err) {
      const msg = err.response?.data?.message || "Could not revoke the session. Please try again.";
      toast.error("Revoke failed", msg);
    } finally {
      setRevokingDeviceId("");
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* ── Sub-Navigation ── */}
      <ProfileNav />

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-brand-mint/8 border border-brand-mint/15 px-3 py-1.5 text-xs font-bold text-brand-mint uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" />
            Security Center
          </div>
          <h1 className="font-heading font-black text-3xl sm:text-4xl text-white tracking-tight leading-none">
            Active Sessions
          </h1>
          <p className="text-xs sm:text-sm font-medium text-text-muted mt-1.5 max-w-xl leading-relaxed">
            Review authorized devices, operating systems, and IP addresses signed in to your Zeitnah account.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSessions}
          disabled={loading}
          className="btn-secondary text-xs uppercase tracking-wider self-start sm:self-auto shrink-0 inline-flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </motion.div>

      {/* ── Summary Cards ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="rounded-2xl border border-border-default bg-bg-card p-6 relative overflow-hidden shadow-sm">
          <div className="gradient-line-top" />
          <div className="flex items-center gap-2.5 mb-2">
            <Shield className="w-4 h-4 text-brand-mint" />
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Signed-in Devices
            </p>
          </div>
          <p className="text-3xl sm:text-4xl font-heading font-black text-white font-mono">
            {sessions.length}
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            Active browser and mobile sessions currently authorized
          </p>
        </div>

        <div className="rounded-2xl border border-border-default bg-bg-card p-6 relative overflow-hidden shadow-sm">
          <div className="gradient-line-top" />
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            Current Device
          </p>
          <p className="text-xl sm:text-2xl font-heading font-bold text-brand-mint truncate">
            {currentSession?.browser || "Current Browser"} on {currentSession?.os || "Current OS"}
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            Last active: {formatDate(currentSession?.lastSeen)}
          </p>
        </div>
      </div>

      {/* ── Sessions List ── */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-bg-card rounded-2xl border border-border-default" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-6 text-danger text-sm font-medium">
          {error}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No Active Sessions Found"
          description="There are no recorded active sessions for this account."
        />
      ) : (
        <div className="space-y-4">
          {sessions.map((session, i) => {
            const DeviceIcon = getDeviceIcon(session.deviceType);
            const isCurrent = Boolean(session.isCurrent);

            return (
              <motion.div
                key={session.deviceId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl border p-5 sm:p-6 relative overflow-hidden transition-all ${
                  isCurrent
                    ? "border-brand-mint/30 bg-bg-card shadow-[0_0_24px_rgba(159,213,178,0.04)]"
                    : "border-border-default bg-bg-card hover:border-brand-mint/15"
                }`}
              >
                <div className="gradient-line-top" />

                <div className="flex flex-col lg:flex-row gap-5 justify-between lg:items-center">
                  <div className="flex gap-4 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        isCurrent
                          ? "bg-brand-mint/10 border border-brand-mint/25 text-brand-mint shadow-sm"
                          : "bg-bg-elevated border border-white/[0.05] text-text-muted"
                      }`}
                    >
                      <DeviceIcon className="w-6 h-6" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h2 className="text-base sm:text-lg font-heading font-bold text-white truncate">
                          {session.browser || "Browser"} on {session.os || "Device"}
                        </h2>
                        {isCurrent && (
                          <span className="rounded-md border border-brand-mint/25 bg-brand-mint/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-mint">
                            This Device
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-xs text-text-muted font-medium">
                        <p>Type: <span className="text-text-secondary">{session.deviceType || "Desktop"}</span></p>
                        <p>IP: <span className="text-text-secondary font-mono">{session.ip || "N/A"}</span></p>
                        <p>Location: <span className="text-text-secondary">{session.location || "Unknown"}</span></p>
                        <p>Last Seen: <span className="text-text-secondary">{formatDate(session.lastSeen)}</span></p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSessionToRevoke(session)}
                    disabled={revokingDeviceId === session.deviceId}
                    className="inline-flex items-center gap-2 self-start lg:self-center rounded-xl border border-danger/20 bg-danger/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-danger hover:bg-danger/10 transition-colors cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {revokingDeviceId === session.deviceId
                      ? "Revoking..."
                      : isCurrent
                      ? "Sign Out This Device"
                      : "Revoke Session"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Revoke Confirmation Modal ── */}
      {sessionToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-danger/30 bg-bg-card p-6 shadow-2xl relative overflow-hidden"
          >
            <div className="gradient-line-top" />
            <div className="w-12 h-12 rounded-xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-heading font-bold text-white mb-2">
              {sessionToRevoke.isCurrent
                ? "Sign Out This Device?"
                : "Revoke Device Session?"}
            </h3>

            <p className="text-xs text-text-muted leading-relaxed mb-6">
              {sessionToRevoke.isCurrent
                ? "This will terminate your current session on this browser. You will need to sign in again."
                : `This will immediately revoke access for ${sessionToRevoke.browser || "browser"} on ${sessionToRevoke.os || "device"}.`}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSessionToRevoke(null)}
                className="btn-secondary py-2 px-4 text-xs uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRevoke}
                className="px-4 py-2 rounded-xl bg-danger hover:bg-danger/90 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                {sessionToRevoke.isCurrent ? "Sign Out" : "Revoke"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}