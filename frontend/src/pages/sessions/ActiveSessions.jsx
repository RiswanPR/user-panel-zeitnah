import {
  useEffect,
  useMemo,
  useState,
  useContext,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  FaArrowLeft,
  FaDesktop,
  FaMobileAlt,
  FaSyncAlt,
  FaTabletAlt,
  FaTrash,
} from "react-icons/fa";

import api from "../../services/api";

import {
  AuthContext,
} from "../../context/AuthContext";

import "./ActiveSessions.css";

const formatDate = (value) => {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const getDeviceIcon = (deviceType) => {
  const type = deviceType?.toLowerCase();

  if (type === "mobile") return <FaMobileAlt />;

  if (type === "tablet") return <FaTabletAlt />;

  return <FaDesktop />;
};

function ActiveSessions() {
  const navigate = useNavigate();

  const { setUser } =
    useContext(AuthContext);

  const [sessions, setSessions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [revokingDeviceId, setRevokingDeviceId] =
    useState("");

  const currentSession = useMemo(
    () =>
      sessions.find(
        (session) =>
          session.isCurrent
      ),
    [sessions]
  );

  const loadSessions =
    async () => {
      try {
        setError("");

        const res =
          await api.get(
            "/auth/sessions"
          );

        setSessions(
          res.data.sessions || []
        );
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load active sessions"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevoke =
    async (session) => {
      const confirmed =
        window.confirm(
          session.isCurrent
            ? "Revoke this session and log out?"
            : "Revoke this session?"
        );

      if (!confirmed) return;

      try {
        setRevokingDeviceId(
          session.deviceId
        );

        const res =
          await api.delete(
            `/auth/sessions/${session.deviceId}`
          );

        if (
          res.data.revokedCurrentSession
        ) {
          localStorage.removeItem(
            "token"
          );

          setUser(null);

          navigate("/login");

          return;
        }

        setSessions((items) =>
          items.filter(
            (item) =>
              item.deviceId !==
              session.deviceId
          )
        );
      } catch (err) {
        alert(
          err.response?.data?.message ||
            "Unable to revoke session"
        );
      } finally {
        setRevokingDeviceId("");
      }
    };

  return (
    <main className="sessions-page">
      <header className="sessions-header">
        <div>
          <Link
            to="/"
            className="sessions-back-link"
          >
            <FaArrowLeft />
            Dashboard
          </Link>

          <h1>Active Sessions</h1>

          <p>
            Manage the devices currently signed in to your account.
          </p>
        </div>

        <button
          className="sessions-refresh-button"
          onClick={loadSessions}
          disabled={loading}
          title="Refresh sessions"
          aria-label="Refresh sessions"
        >
          <FaSyncAlt />
        </button>
      </header>

      <section className="sessions-summary">
        <div>
          <span>Signed-in devices</span>
          <strong>
            {sessions.length}
          </strong>
        </div>

        <div>
          <span>Current device</span>
          <strong>
            {currentSession
              ? currentSession.deviceType
              : "Unknown"}
          </strong>
        </div>
      </section>

      {loading ? (
        <div className="sessions-state">
          Loading sessions...
        </div>
      ) : error ? (
        <div className="sessions-state sessions-state-error">
          {error}
        </div>
      ) : sessions.length === 0 ? (
        <div className="sessions-state">
          No active sessions found.
        </div>
      ) : (
        <section className="sessions-list">
          {sessions.map((session) => (
            <article
              className="session-card"
              key={session.deviceId}
            >
              <div className="session-device-icon">
                {getDeviceIcon(
                  session.deviceType
                )}
              </div>

              <div className="session-details">
                <div className="session-title-row">
                  <h2>
                    {session.browser} on {session.os}
                  </h2>

                  {session.isCurrent && (
                    <span className="session-current-badge">
                      Current
                    </span>
                  )}
                </div>

                <dl>
                  <div>
                    <dt>Device</dt>
                    <dd>
                      {session.deviceType}
                    </dd>
                  </div>

                  <div>
                    <dt>Location</dt>
                    <dd>
                      {session.location ||
                        "Unknown"}
                    </dd>
                  </div>

                  <div>
                    <dt>IP address</dt>
                    <dd>
                      {session.ip ||
                        "Not available"}
                    </dd>
                  </div>

                  <div>
                    <dt>Last seen</dt>
                    <dd>
                      {formatDate(
                        session.lastSeen
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>Expires</dt>
                    <dd>
                      {formatDate(
                        session.refreshTokenExpiry
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <button
                className="session-revoke-button"
                onClick={() =>
                  handleRevoke(session)
                }
                disabled={
                  revokingDeviceId ===
                  session.deviceId
                }
                title="Revoke session"
                aria-label="Revoke session"
              >
                <FaTrash />
                <span>
                  {revokingDeviceId ===
                  session.deviceId
                    ? "Revoking"
                    : "Revoke"}
                </span>
              </button>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default ActiveSessions;
