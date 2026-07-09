import React, { useState, useEffect } from "react";
import { Clock, ShieldCheck, ShieldAlert, KeyRound, RefreshCw, Laptop, Loader2, LogOut } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import api from "../../services/api";

const SessionDiagnostics = () => {
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = () => {
    const token = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");
    const sessionExpiresAtStr = localStorage.getItem("sessionExpiresAt");

    let decoded = null;
    let accessExpiresAt = null;

    if (token) {
      try {
        decoded = jwtDecode(token);
        if (decoded.exp) {
          accessExpiresAt = new Date(decoded.exp * 1000);
        }
      } catch (e) {
        console.error("Invalid token format");
      }
    }

    let sessionExpiresAt = null;
    if (sessionExpiresAtStr) {
      sessionExpiresAt = new Date(sessionExpiresAtStr);
    }

    setTokenData({
      token: !!token,
      refreshToken: !!refreshToken,
      decoded,
      accessExpiresAt,
      sessionExpiresAt,
      rawRefreshToken: refreshToken
    });
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualRefresh = async () => {
    if (!tokenData?.rawRefreshToken) return;
    try {
      setRefreshing(true);
      const res = await api.post("/auth/refresh-token", { refreshToken: tokenData.rawRefreshToken });
      const newToken = res.data.token || res.data.accessToken;
      
      localStorage.setItem("token", newToken);
      if (res.data.refreshToken) localStorage.setItem("refreshToken", res.data.refreshToken);
      if (res.data.sessionExpiresAt) localStorage.setItem("sessionExpiresAt", res.data.sessionExpiresAt);
      
      loadData();
    } catch (err) {
      console.error("Refresh failed", err);
      alert("Manual refresh failed: " + (err.response?.data?.message || err.message));
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("sessionExpiresAt");
    window.location.href = "/login";
  };

  const formatCountdown = (targetDate) => {
    if (!targetDate) return "Unknown";
    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) return "Expired";
    
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    
    return parts.join(" ");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#07192a] text-white">
        <Loader2 className="w-10 h-10 animate-spin text-brand-mint" />
      </div>
    );
  }

  const isAccessValid = tokenData?.accessExpiresAt && tokenData.accessExpiresAt > now;
  const isSessionValid = tokenData?.sessionExpiresAt && tokenData.sessionExpiresAt > now;

  return (
    <div className="min-h-screen bg-[#07192a] text-white p-6 sm:p-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-brand-mint" />
              Session Diagnostics
            </h1>
            <p className="text-white/50 text-sm mt-1">Real-time authentication & token monitoring</p>
          </div>
          <div className="flex gap-3">
             <button 
                onClick={handleManualRefresh}
                disabled={refreshing || !tokenData?.refreshToken}
                className="flex items-center gap-2 px-4 py-2 bg-brand-mint/10 text-brand-mint border border-brand-mint/20 rounded-lg hover:bg-brand-mint/20 transition-colors disabled:opacity-50"
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Force Refresh
             </button>
             <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Clear Session
             </button>
          </div>
        </div>

        {/* Note about LocalStorage */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-8 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-100/80">
            <strong className="text-blue-300 block mb-1">Architecture Note (Storage)</strong>
            Currently, refresh tokens are stored in <code className="bg-black/20 px-1 py-0.5 rounded text-blue-200">localStorage</code> to maintain compatibility with the existing architecture. 
            For production-grade security against XSS, this should eventually be migrated to Secure, HttpOnly, SameSite cookies.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Access Token Card */}
          <div className={`glass-card p-6 rounded-2xl border ${isAccessValid ? 'border-brand-mint/20' : 'border-red-500/20'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${isAccessValid ? 'bg-brand-mint/10 text-brand-mint' : 'bg-red-500/10 text-red-500'}`}>
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Access Token</h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isAccessValid ? 'bg-brand-mint/20 text-brand-mint' : 'bg-red-500/20 text-red-400'}`}>
                  {isAccessValid ? 'ACTIVE' : 'EXPIRED'}
                </span>
              </div>
            </div>
            
            <div className="space-y-4 mt-6">
              <div>
                <div className="text-sm text-white/50 mb-1">Status</div>
                <div className="font-medium">{tokenData?.token ? "Present in Storage" : "Missing"}</div>
              </div>
              
              <div>
                <div className="text-sm text-white/50 mb-1">Expires In</div>
                <div className={`text-2xl font-mono font-bold tracking-tight ${isAccessValid ? 'text-white' : 'text-red-400'}`}>
                  {formatCountdown(tokenData?.accessExpiresAt)}
                </div>
              </div>
              
              {tokenData?.accessExpiresAt && (
                <div>
                  <div className="text-sm text-white/50 mb-1">Exact Expiry</div>
                  <div className="text-sm font-medium">{tokenData.accessExpiresAt.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>

          {/* Refresh Token Card */}
          <div className={`glass-card p-6 rounded-2xl border ${isSessionValid ? 'border-blue-500/30' : 'border-red-500/20'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${isSessionValid ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-500'}`}>
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Refresh Session</h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isSessionValid ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-400'}`}>
                  {isSessionValid ? 'ACTIVE' : 'EXPIRED'}
                </span>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <div>
                <div className="text-sm text-white/50 mb-1">Status</div>
                <div className="font-medium">{tokenData?.refreshToken ? "Present in Storage" : "Missing"}</div>
              </div>
              
              <div>
                <div className="text-sm text-white/50 mb-1">Session Valid For</div>
                <div className={`text-2xl font-mono font-bold tracking-tight ${isSessionValid ? 'text-white' : 'text-red-400'}`}>
                  {formatCountdown(tokenData?.sessionExpiresAt)}
                </div>
              </div>
              
              {tokenData?.sessionExpiresAt && (
                <div>
                  <div className="text-sm text-white/50 mb-1">Exact Expiry</div>
                  <div className="text-sm font-medium">{tokenData.sessionExpiresAt.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payload Debug */}
        {tokenData?.decoded && (
          <div className="mt-8 glass-card p-6 rounded-2xl border border-white/10">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Laptop className="w-5 h-5 text-white/50" />
              Decoded Token Payload
            </h3>
            <pre className="bg-black/40 p-4 rounded-xl text-xs sm:text-sm text-brand-mint font-mono overflow-x-auto">
              {JSON.stringify(tokenData.decoded, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionDiagnostics;
