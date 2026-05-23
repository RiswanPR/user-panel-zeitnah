import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  FaArrowLeft,
  FaExclamationTriangle,
  FaFilter,
  FaHistory,
  FaSyncAlt,
} from "react-icons/fa";

import {
  getAuditLogs,
} from "../../services/api";

import "./AuditLogs.css";

const severityOptions = [
  {
    label: "All",
    value: "",
  },
  {
    label: "Info",
    value: "info",
  },
  {
    label: "Warning",
    value: "warning",
  },
  {
    label: "Critical",
    value: "critical",
  },
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
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 1,
    });
  const [severity, setSeverity] =
    useState("");
  const [action, setAction] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const filters = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      severity: severity || undefined,
      action: action.trim() || undefined,
    }),
    [
      action,
      pagination.limit,
      pagination.page,
      severity,
    ]
  );

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res =
        await getAuditLogs(filters);

      setLogs(res.data.items || []);
      setPagination((current) =>
        res.data.pagination || current
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load audit logs"
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadLogs();
    });
  }, [loadLogs]);

  const handleSeverityChange = (value) => {
    setSeverity(value);
    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  };

  const handleActionChange = (event) => {
    setAction(event.target.value);
    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  };

  const goToPage = (page) => {
    setPagination((current) => ({
      ...current,
      page: Math.min(
        Math.max(page, 1),
        current.totalPages || 1
      ),
    }));
  };

  return (
    <main className="audit-page">
      <header className="audit-header">
        <div>
          <Link
            to="/"
            className="audit-back-link"
          >
            <FaArrowLeft />
            Dashboard
          </Link>

          <h1>Audit Logs</h1>

          <p>
            Review sign-ins, session changes, token refreshes, and security alerts.
          </p>
        </div>

        <button
          className="audit-icon-button"
          onClick={loadLogs}
          disabled={loading}
          title="Refresh audit logs"
          aria-label="Refresh audit logs"
        >
          <FaSyncAlt />
        </button>
      </header>

      <section className="audit-toolbar">
        <label>
          <FaFilter />
          <input
            value={action}
            onChange={handleActionChange}
            placeholder="Filter by action"
          />
        </label>

        <div
          className="audit-severity-control"
          role="group"
          aria-label="Filter by severity"
        >
          {severityOptions.map((option) => (
            <button
              key={option.value || "all"}
              type="button"
              className={
                severity === option.value
                  ? "is-selected"
                  : ""
              }
              onClick={() =>
                handleSeverityChange(
                  option.value
                )
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="audit-summary">
        <div>
          <span>Total Events</span>
          <strong>{pagination.total}</strong>
        </div>

        <div>
          <span>Current Page</span>
          <strong>
            {pagination.page} / {pagination.totalPages || 1}
          </strong>
        </div>
      </section>

      {loading ? (
        <div className="audit-state">
          Loading audit logs...
        </div>
      ) : error ? (
        <div className="audit-state audit-state-error">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="audit-state">
          No audit logs found.
        </div>
      ) : (
        <section className="audit-list">
          {logs.map((log) => (
            <article
              className="audit-row"
              key={log._id}
            >
              <div
                className={`audit-event-icon audit-${log.severity}`}
              >
                {log.severity ===
                "warning" ? (
                  <FaExclamationTriangle />
                ) : (
                  <FaHistory />
                )}
              </div>

              <div className="audit-event-main">
                <div className="audit-event-title">
                  <h2>
                    {formatAction(
                      log.action
                    )}
                  </h2>

                  <span
                    className={`audit-severity audit-${log.severity}`}
                  >
                    {log.severity}
                  </span>
                </div>

                <p>
                  {log.message ||
                    "Audit event recorded"}
                </p>

                <dl>
                  <div>
                    <dt>When</dt>
                    <dd>
                      {formatDate(
                        log.createdAt
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>Entity</dt>
                    <dd>
                      {log.entityType}
                    </dd>
                  </div>

                  <div>
                    <dt>IP address</dt>
                    <dd>
                      {log.ipAddress ||
                        "Not available"}
                    </dd>
                  </div>

                  <div>
                    <dt>Device</dt>
                    <dd>
                      {log.deviceId ||
                        "Not available"}
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </section>
      )}

      <footer className="audit-pagination">
        <button
          type="button"
          onClick={() =>
            goToPage(pagination.page - 1)
          }
          disabled={
            loading ||
            pagination.page <= 1
          }
        >
          Previous
        </button>

        <button
          type="button"
          onClick={() =>
            goToPage(pagination.page + 1)
          }
          disabled={
            loading ||
            pagination.page >=
              (pagination.totalPages || 1)
          }
        >
          Next
        </button>
      </footer>
    </main>
  );
}

export default AuditLogs;
