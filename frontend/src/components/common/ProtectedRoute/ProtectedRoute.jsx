import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";

/**
 * Premium loading screen for protected route authentication check.
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-base">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-brand-mint/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Logo */}
        <div className="relative mb-8">
          <img
            src="/zeitnah-logo.svg"
            alt="Zeitnah Academy"
            className="h-10 w-auto opacity-80"
          />
        </div>

        {/* Premium spinner */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-2 border-white/[0.06]" />
          <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-t-brand-mint animate-spin" />
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-text-muted animate-pulse">
          Loading your workspace...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}

export default ProtectedRoute;