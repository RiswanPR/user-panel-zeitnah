import { Navigate } from "react-router-dom";

/**
 * PortfolioPage has been retired.
 * Redirects legacy visits safely to /profile.
 */
export default function PortfolioPage() {
  return <Navigate to="/profile" replace />;
}
