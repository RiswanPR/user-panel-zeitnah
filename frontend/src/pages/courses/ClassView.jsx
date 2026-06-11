import { useEffect, useRef, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiFileText,
  FiPlayCircle,
} from "react-icons/fi";
import { getDeviceId } from "../../utils/device";
import api from "../../services/api";
import {
  formatDuration,
  getBunnyEmbedUrl,
  getUploadUrl,
  getVdoCipherEmbedUrl,
} from "../../utils/courseUi";

import VideoWatermark from "../../components/player/VideoWatermark";
import { useContext } from "react";

import { AuthContext } from "../../context/AuthContext";

function loadVdoCipherApi() {
  if (window.VdoPlayer) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-vdocipher-api="true"]',
    );

    if (existing) {
      existing.addEventListener("load", resolve, {
        once: true,
      });

      existing.addEventListener("error", reject, {
        once: true,
      });

      return;
    }

    const script = document.createElement("script");

    script.src = "https://player.vdocipher.com/v2/api.js";
    script.async = true;
    script.dataset.vdocipherApi = "true";
    script.onload = resolve;
    script.onerror = reject;

    document.body.appendChild(script);
  });
}

function ClassView() {
  const { classId } = useParams();
  const navigate = useNavigate();

  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [progressState, setProgressState] = useState(null);
  const [syncState, setSyncState] = useState("idle");

  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const saveInFlightRef = useRef(false);
  const lastSyncedRef = useRef({
    currentTime: 0,
    duration: 0,
    totalCovered: 0,
    totalPlayed: 0,
  });
  const latestSnapshotRef = useRef(null);
  const savedProgressBaseRef = useRef({
    coveredSeconds: 0,
    watchedSeconds: 0,
  });

  useEffect(() => {
    let mounted = true;

    const loadClass = async () => {
      try {
        setLoading(true);

        const res = await api.get(`/courses/class/${classId}`);

        if (mounted) {
          setData(res.data);
          setProgressState(res.data.progress || null);
        }
      } catch (error) {
        alert(error.response?.data?.message);
        navigate("/courses");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadClass();

    return () => {
      mounted = false;
    };
  }, [classId, navigate]);// =====================================
// ACTIVE STREAM PROTECTION
// =====================================

useEffect(() => {
  if (!classId) return;

  let heartbeatInterval;

  const initializeStream = async () => {
    try {

      const deviceId =
        await getDeviceId();

      console.log(
        "Stream Device ID:",
        deviceId,
      );

      await api.post(
        "/courses/start-stream",
        {
          classId,
          deviceId,
        },
      );

      heartbeatInterval =
        setInterval(async () => {

          try {

            await api.post(
              "/courses/heartbeat",
              {
                deviceId,
              },
            );

          } catch (err) {
            console.log(err);
          }

        }, 15000);

    } catch (error) {

      alert(
        error.response?.data?.message ||
          "Another device is currently watching this course.",
      );

      navigate(-1);
    }
  };

  initializeStream();

  const stopStream = async () => {

    try {

      const deviceId =
        await getDeviceId();

      await api.post(
        "/courses/stop-stream",
        {
          deviceId,
        },
      );

    } catch (error) {

      console.log(error);

    }

  };

  const handleUnload = async () => {

    const deviceId =
      await getDeviceId();

    navigator.sendBeacon(
      "http://localhost:3000/api/courses/stop-stream",
      new Blob(
        [
          JSON.stringify({
            deviceId,
          }),
        ],
        {
          type:
            "application/json",
        },
      ),
    );

  };

  window.addEventListener(
    "beforeunload",
    handleUnload,
  );

  return () => {

    if (
      heartbeatInterval
    ) {
      clearInterval(
        heartbeatInterval,
      );
    }

    stopStream();

    window.removeEventListener(
      "beforeunload",
      handleUnload,
    );

  };

}, [
  classId,
  navigate,
]);
  useEffect(() => {
    const initial = data?.progress?.classProgress;

    lastSyncedRef.current = {
      currentTime: initial?.lastPositionSeconds || 0,
      duration: initial?.durationSeconds || 0,
      totalCovered: initial?.coveredSeconds || 0,
      totalPlayed: initial?.watchedSeconds || 0,
    };
    savedProgressBaseRef.current = {
      coveredSeconds: initial?.coveredSeconds || 0,
      watchedSeconds: initial?.watchedSeconds || 0,
    };
    latestSnapshotRef.current = initial
      ? {
          completed: Boolean(initial.completed),
          currentTimeSeconds: initial.lastPositionSeconds || 0,
          durationSeconds: initial.durationSeconds || 0,
          totalCoveredSeconds: initial.coveredSeconds || 0,
          totalPlayedSeconds: initial.watchedSeconds || 0,
        }
      : null;
  }, [data]);

  useEffect(() => {
    const classData = data?.class;

    if (!classData?.vdoCipher || !iframeRef.current) {
      return undefined;
    }

    let cancelled = false;
    let cleanup = () => {};

    const buildProgressSnapshot = async (completed = false) => {
      if (!playerRef.current) {
        return null;
      }

      const player = playerRef.current;

      const [sessionPlayedSeconds, sessionCoveredSeconds] = await Promise.all([
        player.api.getTotalPlayed(),
        player.api.getTotalCovered(),
      ]);

      const currentTimeSeconds = Number(player.video.currentTime) || 0;
      const durationSeconds = Number(player.video.duration) || 0;
      const savedBase = savedProgressBaseRef.current;
      const totalPlayedSeconds =
        savedBase.watchedSeconds + (Number(sessionPlayedSeconds) || 0);
      const totalCoveredSeconds = Math.max(
        savedBase.coveredSeconds,
        Number(sessionCoveredSeconds) || 0,
      );
      const snapshot = {
        completed,
        currentTimeSeconds: Math.round(currentTimeSeconds),
        durationSeconds: Math.round(durationSeconds),
        totalCoveredSeconds: Math.round(totalCoveredSeconds),
        totalPlayedSeconds: Math.round(totalPlayedSeconds),
      };

      latestSnapshotRef.current = snapshot;

      return snapshot;
    };

    const persistProgress = async ({
      completed = false,
      force = false,
    } = {}) => {
      if (!playerRef.current || saveInFlightRef.current) {
        return;
      }

      try {
        const snapshot = await buildProgressSnapshot(completed);

        if (!snapshot) {
          return;
        }

        if (
          !force &&
          snapshot.totalPlayedSeconds <= 0 &&
          snapshot.totalCoveredSeconds <= 0 &&
          snapshot.currentTimeSeconds <= 0
        ) {
          return;
        }

        const previous = lastSyncedRef.current;

        if (
          !force &&
          snapshot.totalPlayedSeconds - previous.totalPlayed < 15 &&
          snapshot.totalCoveredSeconds - previous.totalCovered < 10 &&
          Math.abs(snapshot.currentTimeSeconds - previous.currentTime) < 15
        ) {
          return;
        }

        saveInFlightRef.current = true;
        setSyncState("saving");

        const res = await api.post(
          `/courses/class/${classId}/progress`,
          snapshot,
        );

        lastSyncedRef.current = {
          currentTime: snapshot.currentTimeSeconds,
          duration: snapshot.durationSeconds,
          totalCovered: snapshot.totalCoveredSeconds,
          totalPlayed: snapshot.totalPlayedSeconds,
        };

        setProgressState(res.data);
        setSyncState("saved");
      } catch (error) {
        console.log(error);
        setSyncState("error");
      } finally {
        saveInFlightRef.current = false;
      }
    };

    const setupPlayer = async () => {
      try {
        await loadVdoCipherApi();

        if (cancelled || !iframeRef.current || !window.VdoPlayer) {
          return;
        }

        const player = window.VdoPlayer.getInstance(iframeRef.current);

        playerRef.current = player;

        const onLoadedMetadata = () => {
          const resumeAt = Number(
            data?.progress?.classProgress?.lastPositionSeconds,
          );

          if (
            Number.isFinite(resumeAt) &&
            resumeAt > 0 &&
            resumeAt < Number(player.video.duration || 0) - 3
          ) {
            player.video.currentTime = resumeAt;
          }

          void persistProgress({
            force: true,
          });
        };

        const onTimeUpdate = () => {
          void persistProgress();
        };

        const onPlay = () => {
          setSyncState("watching");
          void buildProgressSnapshot(false);
        };

        const onPause = () => {
          void persistProgress({
            force: true,
          });
        };

        const onSeeked = () => {
          void persistProgress({
            force: true,
          });
        };

        const onEnded = () => {
          void persistProgress({
            completed: true,
            force: true,
          });
        };

        const progressInterval = window.setInterval(() => {
          void persistProgress({
            force: true,
          });
        }, 15000);

        const flushLatestProgress = () => {
          const snapshot = latestSnapshotRef.current;
          const token = localStorage.getItem("token");

          if (!snapshot || !token) {
            return;
          }

          const baseUrl =
            api.defaults.baseURL || "http://localhost:3000/api";

          void fetch(`${baseUrl}/courses/class/${classId}/progress`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(snapshot),
            keepalive: true,
          });
        };

        const onPageHide = () => {
          flushLatestProgress();
        };

        const onVisibilityChange = () => {
          if (document.visibilityState === "hidden") {
            flushLatestProgress();
          }
        };

        player.video.addEventListener("loadedmetadata", onLoadedMetadata);
        player.video.addEventListener("play", onPlay);
        player.video.addEventListener("timeupdate", onTimeUpdate);
        player.video.addEventListener("pause", onPause);
        player.video.addEventListener("seeked", onSeeked);
        player.video.addEventListener("ended", onEnded);
        window.addEventListener("pagehide", onPageHide);
        document.addEventListener("visibilitychange", onVisibilityChange);

        cleanup = () => {
          window.clearInterval(progressInterval);
          player.video.removeEventListener("loadedmetadata", onLoadedMetadata);
          player.video.removeEventListener("play", onPlay);
          player.video.removeEventListener("timeupdate", onTimeUpdate);
          player.video.removeEventListener("pause", onPause);
          player.video.removeEventListener("seeked", onSeeked);
          player.video.removeEventListener("ended", onEnded);
          window.removeEventListener("pagehide", onPageHide);
          document.removeEventListener("visibilitychange", onVisibilityChange);
          flushLatestProgress();
        };
      } catch (error) {
        console.log(error);
        setSyncState("error");
      }
    };

    void setupPlayer();

    return () => {
      cancelled = true;
      void persistProgress({
        force: true,
      });
      cleanup();
      playerRef.current = null;
    };
  }, [classId, data]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
        Loading...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 text-center text-white/70">
        Unable to load this class right now.
      </div>
    );
  }

  const { chapter, class: cls, course } = data;
  const videoUrl =
    getVdoCipherEmbedUrl(cls.vdoCipher) || getBunnyEmbedUrl(cls.videoId);
  const classProgress =
    progressState?.classProgress || data.progress?.classProgress;
  const learningProgress =
    progressState?.learningProgress || data.progress?.learningProgress;
  const classProgressPercent = classProgress?.progressPercent || 0;
  const isClassCompleted = Boolean(classProgress?.completed) || classProgressPercent >= 100;
  const courseCompletionPercent = learningProgress?.completionPercent || 0;
  const watchedClasses = learningProgress?.watchedClasses || 0;
  const completedClasses = learningProgress?.completedClasses || 0;
  const totalClasses = learningProgress?.totalClasses || 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] px-4 py-8">
      <div className="absolute left-[-100px] top-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="absolute bottom-[-100px] right-[-80px] h-[360px] w-[360px] rounded-full bg-violet-500/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#111111] px-4 py-2 text-white/70 transition-all hover:border-cyan-400/20 hover:text-cyan-300"
        >
          <FiArrowLeft />
          Back
        </button>

        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
              {course.name}
            </span>

            <span className="rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1 text-xs font-medium text-white/65">
              {chapter.title}
            </span>

            {isClassCompleted ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                <FiCheckCircle />
                Completed
              </span>
            ) : classProgressPercent > 0 ? (
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
                Continue watching
              </span>
            ) : null}
          </div>

          <h1 className="mt-5 font-['Sora'] text-3xl font-semibold text-white sm:text-5xl">
            {cls.title}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
            {cls.description ||
              "Class details will appear here once they are added."}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#111111] shadow-[0_24px_90px_rgba(0,0,0,0.3)]">
              <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-4">
                <span className="text-sm font-medium text-white/75">
                  {isClassCompleted
                    ? "Rewatch this class"
                    : classProgressPercent > 0
                      ? "Continue watching"
                      : "Start watching"}
                </span>

                <span className="text-sm text-white/45">
                  {classProgressPercent}%
                </span>
              </div>

              <div className="relative aspect-video bg-black overflow-hidden">
                {/* Dynamic Watermark */}
                <VideoWatermark user={user} />

                {videoUrl ? (
                  <iframe
                    ref={iframeRef}
                    src={videoUrl}
                    className="h-full w-full"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    title={cls.title}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-white/60">
                    Video link is missing for this class.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/[0.08] bg-[#111111] p-6">
              <div className="mb-4 flex items-center gap-3">
                <FiPlayCircle className="text-cyan-300" />
                <h2 className="text-xl font-semibold text-white">
                  About This Class
                </h2>
              </div>

              <p className="text-white/50 leading-7">
                {cls.description ||
                  "Class details will appear here once they are added."}
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/65">
                <FiClock className="text-cyan-300" />
                {formatDuration(cls.duration)}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-white/[0.08] bg-[#111111] p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                    Learning Progress
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    Saved Progress
                  </h2>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    isClassCompleted
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                      : syncState === "saved"
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                      : syncState === "saving"
                        ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                        : syncState === "watching"
                          ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                        : syncState === "error"
                          ? "border-red-400/20 bg-red-500/10 text-red-200"
                          : "border-white/[0.08] bg-white/[0.03] text-white/55"
                  }`}
                >
                  {isClassCompleted
                    ? "Completed"
                    : syncState === "saved"
                    ? "Synced"
                    : syncState === "saving"
                      ? "Saving"
                      : syncState === "watching"
                        ? "Watching"
                      : syncState === "error"
                        ? "Sync failed"
                        : "Waiting"}
                </span>
              </div>

              <div
                className={`rounded-[24px] border p-4 ${
                  isClassCompleted
                    ? "border-emerald-400/20 bg-emerald-500/10"
                    : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                <div className="mb-3 flex items-center justify-between text-sm text-white/65">
                  <span className="inline-flex items-center gap-2">
                    {isClassCompleted ? (
                      <FiCheckCircle className="text-emerald-300" />
                    ) : null}
                    This class
                  </span>
                  <span>{classProgressPercent}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isClassCompleted
                        ? "bg-gradient-to-r from-emerald-400 to-cyan-300"
                        : "bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400"
                    }`}
                    style={{
                      width: `${classProgressPercent}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between text-sm text-white/65">
                  <span>Course completion</span>
                  <span>{courseCompletionPercent}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-all duration-500"
                    style={{
                      width: `${courseCompletionPercent}%`,
                    }}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/55">
                  <span className="rounded-full border border-white/[0.08] bg-black/20 animate-pulse px-3 py-2">
                    {watchedClasses}/{totalClasses} classes started
                  </span>

                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-emerald-200">
                    {completedClasses}/{totalClasses} completed
                  </span>

                  {learningProgress?.averageWatchTime ? (
                    <span className="rounded-full border border-white/[0.08] bg-black/20 animate-pulse px-3 py-2">
                      Avg watch: {learningProgress.averageWatchTime}
                    </span>
                  ) : null}

                  {learningProgress?.streak ? (
                    <span className="rounded-full border border-white/[0.08] bg-black/20 animate-pulse px-3 py-2">
                      Streak: {learningProgress.streak} days
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/[0.08] bg-[#111111] p-6">
              <div className="mb-5 flex items-center gap-3">
                <FiFileText className="text-cyan-300" />
                <h2 className="text-xl font-semibold text-white">Exercises</h2>
              </div>

              {cls.exercises?.length === 0 ? (
                <p className="text-white/40">No exercises</p>
              ) : (
                <div className="space-y-3">
                  {cls.exercises.map((exercise) => (
                    <a
                      key={exercise._id}
                      href={getUploadUrl(exercise.file)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4 transition-all hover:border-cyan-400/20"
                    >
                      <div>
                        <h3 className="text-white">{exercise.title}</h3>
                        <p className="text-sm text-white/40">{exercise.type}</p>
                      </div>

                      <FiDownload className="text-cyan-300" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClassView;
