import {
  useCallback,
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
  FaTabletAlt,
  FaSyncAlt,
  FaTrash,
  FaShieldAlt,
} from "react-icons/fa";

import api from "../../services/api";

import {
  AuthContext,
} from "../../context/AuthContext";

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

const getDeviceIcon = (
  deviceType
) => {

  const type =
    deviceType?.toLowerCase();

  if (type === "mobile")
    return <FaMobileAlt />;

  if (type === "tablet")
    return <FaTabletAlt />;

  return <FaDesktop />;

};

function ActiveSessions() {

  const navigate =
    useNavigate();

  const { setUser } =
    useContext(
      AuthContext
    );

  const [sessions,
    setSessions] =
    useState([]);

  const [loading,
    setLoading] =
    useState(true);

  const [error,
    setError] =
    useState("");

  const [revokingDeviceId,
    setRevokingDeviceId] =
    useState("");

  const currentSession =
    useMemo(
      () =>
        sessions.find(
          (s) =>
            s.isCurrent
        ),
      [sessions]
    );

  const loadSessions =
    useCallback(
      async () => {

        try {

          setLoading(true);

          const res =
            await api.get(
              "/auth/sessions"
            );

          setSessions(
            res.data.sessions || []
          );

        } catch (err) {

          setError(
            err.response?.data
              ?.message ||
              "Unable to load sessions"
          );

        } finally {

          setLoading(false);

        }

      },
      []
    );

  useEffect(() => {

    loadSessions();

  }, [loadSessions]);

  const handleRevoke =
    async (session) => {

      const confirmed =
        window.confirm(
          session.isCurrent
            ? "Logout this device?"
            : "Revoke session?"
        );

      if (!confirmed)
        return;

      try {

        setRevokingDeviceId(
          session.deviceId
        );

        const res =
          await api.delete(
            `/auth/sessions/${session.deviceId}`
          );

        if (
          res.data
            .revokedCurrentSession
        ) {

          localStorage.removeItem(
            "token"
          );

          setUser(null);

          navigate("/login");

          return;

        }

        setSessions(
          (items) =>
            items.filter(
              (item) =>
                item.deviceId !==
                session.deviceId
            )
        );

      } catch (err) {

        alert(
          err.response?.data
            ?.message
        );

      } finally {

        setRevokingDeviceId(
          ""
        );

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
              Active Sessions
            </h1>

            <p className="text-white/35 mt-2">
              Monitor and manage your logged-in devices.
            </p>

          </div>

          <button
            onClick={loadSessions}
            disabled={loading}
            className="self-start flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-white hover:border-cyan-400/20"
          >
            <FaSyncAlt />
            Refresh
          </button>

        </div>

        {/* Summary */}
        <div className="grid md:grid-cols-2 gap-5 mb-8">

          <div className="bg-[#111111] border border-white/[0.06] rounded-3xl p-6">

            <div className="flex items-center gap-3 mb-3">

              <FaShieldAlt className="text-cyan-300" />

              <h3 className="text-white font-semibold">
                Signed-in Devices
              </h3>

            </div>

            <h2 className="text-4xl font-bold text-white">
              {sessions.length}
            </h2>

          </div>

          <div className="bg-[#111111] border border-white/[0.06] rounded-3xl p-6">

            <h3 className="text-white font-semibold mb-3">
              Current Device
            </h3>

            <h2 className="text-2xl text-cyan-300">
              {
                currentSession?.deviceType ||
                "Unknown"
              }
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

          ) : (

            <div className="space-y-5">

              {

                sessions.map(
                  (session) => (

                    <div
                      key={
                        session.deviceId
                      }
                      className={`bg-[#111111] border rounded-3xl p-6 transition-all ${
                        session.isCurrent
                          ? "border-cyan-400/20 shadow-lg shadow-cyan-500/5"
                          : "border-white/[0.06]"
                      }`}
                    >

                      <div className="flex flex-col lg:flex-row gap-6 justify-between">

                        {/* Left */}
                        <div className="flex gap-5">

                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-violet-500/10 flex items-center justify-center text-cyan-300 text-xl">
                            {
                              getDeviceIcon(
                                session.deviceType
                              )
                            }
                          </div>

                          <div>

                            <div className="flex items-center gap-3 mb-2">

                              <h2 className="text-xl text-white font-semibold">
                                {session.browser} on {session.os}
                              </h2>

                              {

                                session.isCurrent && (

                                  <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs border border-cyan-400/20">
                                    Current
                                  </span>

                                )

                              }

                            </div>

                            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-white/40">

                              <p>
                                Device:
                                {" "}
                                {session.deviceType}
                              </p>

                              <p>
                                IP:
                                {" "}
                                {session.ip || "N/A"}
                              </p>

                              <p>
                                Location:
                                {" "}
                                {session.location || "Unknown"}
                              </p>

                              <p>
                                Last Seen:
                                {" "}
                                {formatDate(
                                  session.lastSeen
                                )}
                              </p>

                            </div>

                          </div>

                        </div>

                        {/* Button */}
                        <button
                          onClick={() =>
                            handleRevoke(
                              session
                            )
                          }
                          disabled={
                            revokingDeviceId ===
                            session.deviceId
                          }
                          className="self-start flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-400/20 text-red-300 hover:bg-red-500/15"
                        >

                          <FaTrash />

                          {
                            revokingDeviceId ===
                            session.deviceId
                              ? "Revoking..."
                              : "Revoke"
                          }

                        </button>

                      </div>

                    </div>

                  )
                )

              }

            </div>

          )

        }

      </div>

    </div>

  );

}

export default ActiveSessions;