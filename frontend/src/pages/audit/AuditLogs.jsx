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
  FaShieldAlt,
} from "react-icons/fa";

import {
  getAuditLogs,
} from "../../services/api";

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

  if (!value)
    return "Not available";

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(
    new Date(value)
  );

};

const formatAction = (
  action
) =>
  (action || "UNKNOWN")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (l) =>
        l.toUpperCase()
    );

function AuditLogs() {

  const [logs, setLogs] =
    useState([]);

  const [pagination,
    setPagination] =
    useState({
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 1,
    });

  const [severity,
    setSeverity] =
    useState("");

  const [action,
    setAction] =
    useState("");

  const [loading,
    setLoading] =
    useState(true);

  const [error,
    setError] =
    useState("");

  const filters = useMemo(
  () => ({
    page: pagination.page,
    limit: pagination.limit,
    severity:
      severity || undefined,
    action:
      action.trim() ||
      undefined,
  }),
  [
    pagination.page,
    pagination.limit,
    severity,
    action,
  ]
);

  const loadLogs =
    useCallback(
      async () => {

        try {

          setLoading(true);

          const res =
            await getAuditLogs(
              filters
            );

          setLogs(
            res.data.items ||
              []
          );

        setPagination(
  (current) => {

    const incoming =
      res.data.pagination;

    if (!incoming)
      return current;

    // prevent rerender loop
    if (
      current.page ===
        incoming.page &&
      current.total ===
        incoming.total &&
      current.totalPages ===
        incoming.totalPages
    ) {
      return current;
    }

    return {
      ...current,
      ...incoming,
    };

  }
);
        } catch (err) {

          setError(
            err.response?.data
              ?.message ||
              "Unable to load logs"
          );

        } finally {

          setLoading(false);

        }

      },
      [filters]
    );

 useEffect(() => {

  const timeout =
    setTimeout(() => {

      loadLogs();

    }, 200);

  return () =>
    clearTimeout(timeout);

}, [loadLogs]);

  const severityStyle =
    (severity) => {

      switch (
        severity
      ) {

        case "critical":
          return "bg-red-500/10 text-red-300 border-red-400/20";

        case "warning":
          return "bg-yellow-500/10 text-yellow-300 border-yellow-400/20";

        default:
          return "bg-cyan-500/10 text-cyan-300 border-cyan-400/20";

      }

    };

  return (

    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden px-4 py-10">

      {/* Glow */}
      <div className="absolute top-[-120px] left-[-100px] w-[420px] h-[420px] bg-cyan-500/10 rounded-full blur-[120px]" />

      <div className="absolute bottom-[-100px] right-[-80px] w-[360px] h-[360px] bg-violet-600/10 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">

          <div>
<Link
  to="/profile"
  className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#111111] border border-white/[0.06] text-white/75 hover:text-cyan-300 hover:border-cyan-400/20 hover:bg-cyan-500/[0.03] transition-all duration-300 mb-5 shadow-lg shadow-black/30"
>

  <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-400/10 flex items-center justify-center text-cyan-300">
    <FaArrowLeft />
  </div>

  <span className="font-medium  text-white">
    Back to Profile
  </span>

</Link>

            <h1 className="text-4xl font-bold text-white">
              Audit Logs
            </h1>

            <p className="text-white/35 mt-2">
              Authentication, security and account activity history.
            </p>

          </div>

          <button
            onClick={loadLogs}
            disabled={loading}
            className="self-start flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-white hover:border-cyan-400/20"
          >
            <FaSyncAlt />
            Refresh
          </button>

        </div>

        {/* Toolbar */}
        <div className="bg-[#111111] border border-white/[0.06] rounded-3xl p-5 mb-6 flex flex-col lg:flex-row gap-4">

          <div className="flex items-center gap-3 flex-1 bg-[#0f0f0f] rounded-2xl px-4 py-3 border border-white/[0.04]">

            <FaFilter className="text-cyan-300" />

            <input
              value={action}
              onChange={(e) =>
                setAction(
                  e.target.value
                )
              }
              placeholder="Search action"
              className="bg-transparent outline-none text-white flex-1"
            />

          </div>

          <div className="flex flex-wrap gap-2">

            {

              severityOptions.map(
                (option) => (

                  <button
                    key={
                      option.value
                    }
                    onClick={() =>
                      setSeverity(
                        option.value
                      )
                    }
                    className={`px-4 py-2 rounded-2xl border text-sm transition-all ${
                      severity ===
                      option.value
                        ? "bg-cyan-500/10 border-cyan-400/20 text-cyan-300"
                        : "border-white/[0.06] text-white/40 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>

                )
              )

            }

          </div>

        </div>

        {/* Summary */}
        <div className="grid md:grid-cols-2 gap-5 mb-8">

          <div className="bg-[#111111] border border-white/[0.06] rounded-3xl p-6">

            <div className="flex items-center gap-3 mb-3">

              <FaShieldAlt className="text-cyan-300" />

              <h3 className="text-white font-semibold">
                Total Events
              </h3>

            </div>

            <h2 className="text-4xl font-bold text-white">
              {pagination.total}
            </h2>

          </div>

          <div className="bg-[#111111] border border-white/[0.06] rounded-3xl p-6">

            <h3 className="text-white font-semibold mb-3">
              Current Page
            </h3>

            <h2 className="text-2xl text-cyan-300">
              {pagination.page} / {pagination.totalPages || 1}
            </h2>

          </div>

        </div>

        {/* States */}
        {

          loading ? (

            <div className="text-white/40">
              Loading...
            </div>

          ) : error ? (

            <div className="text-red-400">
              {error}
            </div>

          ) : logs.length === 0 ? (

            <div className="text-white/40">
              No logs found.
            </div>

          ) : (

            <div className="space-y-5">

              {

                logs.map(
                  (log) => (

                    <div
                      key={log._id}
                      className="bg-[#111111] border border-white/[0.06] rounded-3xl p-6"
                    >

                      <div className="flex gap-5">

                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          log.severity === "warning"
                            ? "bg-yellow-500/10 text-yellow-300"
                            : "bg-cyan-500/10 text-cyan-300"
                        }`}>
                          {
                            log.severity ===
                            "warning"
                              ? <FaExclamationTriangle />
                              : <FaHistory />
                          }
                        </div>

                        <div className="flex-1">

                          <div className="flex flex-wrap gap-3 items-center mb-2">

                            <h2 className="text-xl text-white font-semibold">
                              {
                                formatAction(
                                  log.action
                                )
                              }
                            </h2>

                            <span className={`px-3 py-1 rounded-full border text-xs ${severityStyle(log.severity)}`}>
                              {log.severity}
                            </span>

                          </div>

                          <p className="text-white/40 mb-4">
                            {
                              log.message ||
                              "Audit event recorded"
                            }
                          </p>

                          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-white/40">

                            <p>
                              When:
                              {" "}
                              {
                                formatDate(
                                  log.createdAt
                                )
                              }
                            </p>

                            <p>
                              Entity:
                              {" "}
                              {
                                log.entityType
                              }
                            </p>

                            <p>
                              IP:
                              {" "}
                              {
                                log.ipAddress ||
                                "N/A"
                              }
                            </p>

                            <p>
                              Device:
                              {" "}
                              {
                                log.deviceId ||
                                "N/A"
                              }
                            </p>

                          </div>

                        </div>

                      </div>

                    </div>

                  )
                )

              }

            </div>

          )

        }

        {/* Pagination */}
        <div className="flex justify-center gap-4 mt-10">

          <button
            onClick={() =>
              setPagination(
                (p) => ({
                  ...p,
                  page:
                    Math.max(
                      p.page - 1,
                      1
                    ),
                })
              )
            }
            disabled={
              pagination.page <= 1
            }
            className="px-5 py-3 rounded-2xl border border-white/[0.06] text-white hover:border-cyan-400/20 disabled:opacity-40"
          >
            Previous
          </button>

          <button
            onClick={() =>
              setPagination(
                (p) => ({
                  ...p,
                  page:
                    Math.min(
                      p.page + 1,
                      p.totalPages
                    ),
                })
              )
            }
            disabled={
              pagination.page >=
              pagination.totalPages
            }
            className="px-5 py-3 rounded-2xl border border-white/[0.06] text-white hover:border-cyan-400/20 disabled:opacity-40"
          >
            Next
          </button>

        </div>

      </div>

    </div>

  );

}

export default AuditLogs;