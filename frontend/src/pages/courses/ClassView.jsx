import { useEffect, useRef, useState, useContext, useMemo } from "react";
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
        alert(error.response?.data?.message || "Failed to load class configuration module.");
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
  }, [classId, navigate]);

  // ACTIVE STREAM SECURITY PROTECTION HEARTBEAT LOOP
  useEffect(() => {
    if (!classId) return;

    let heartbeatInterval;

    const initializeStream = async () => {
      try {
        const deviceId = await getDeviceId();
        console.log("Stream Device ID:", deviceId);

        await api.post("/courses/start-stream", {
          classId,
          deviceId,
        });

        heartbeatInterval = setInterval(async () => {
          try {
            await api.post("/courses/heartbeat", {
              deviceId,
            });
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
        const deviceId = await getDeviceId();
        await api.post("/courses/stop-stream", {
          deviceId,
        });
      } catch (error) {
        console.log(error);
      }
    };

    const handleUnload = async () => {
      const deviceId = await getDeviceId();
      navigator.sendBeacon(
        "http://localhost:3000/api/courses/stop-stream",
        new Blob(
          [
            JSON.stringify({
              deviceId,
            }),
          ],
          {
            type: "application/json",
          },
        ),
      );
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      stopStream();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [classId, navigate]);

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

          const baseUrl = api.defaults.baseURL || "http://localhost:3000/api";

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
      <div className="flex min-h-screen items-center justify-center bg-[#07192a] text-white font-body">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-[#9fd5b2]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-semibold uppercase tracking-widest text-white/60">Loading Class Workstation…</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07192a] px-4 text-center text-white/60 font-body text-sm uppercase tracking-wider">
        Unable to load this class parameter allocation context right now.
      </div>
    );
  }

  const { chapter, class: cls, course } = data;
  const videoUrl = getVdoCipherEmbedUrl(cls.vdoCipher) || getBunnyEmbedUrl(cls.videoId);
  const classProgress = progressState?.classProgress || data.progress?.classProgress;
  const learningProgress = progressState?.learningProgress || data.progress?.learningProgress;
  const classProgressPercent = classProgress?.progressPercent || 0;
  const isClassCompleted = Boolean(classProgress?.completed) || classProgressPercent >= 100;
  const courseCompletionPercent = learningProgress?.completionPercent || 0;
  const watchedClasses = learningProgress?.watchedClasses || 0;
  const completedClasses = learningProgress?.completedClasses || 0;
  const totalClasses = learningProgress?.totalClasses || 0;

  return (
    <div className="min-h-screen bg-[#07192a] relative overflow-hidden px-4 py-6 sm:py-8 font-body text-white antialiased selection:bg-[#f6ed4a] selection:text-[#07192a]">
      
      {/* Decorative ambient brand accent blur */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#9fd5b2] opacity-5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-6">
        
        {/* BACK WORKSPACE NAVIGATOR CONTAINER */}
        <div className="flex justify-between items-center w-full">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 transition-all hover:border-[rgba(159,213,178,0.3)] hover:text-[#9fd5b2] cursor-pointer"
          >
            <FiArrowLeft className="text-sm shrink-0" />
            Back
          </button>
        </div>

        {/* HERO SPECIFICATION SHEET OVERVIEW */}
        <div className="space-y-4 w-full">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="rounded-lg border border-[rgba(159,213,178,0.25)] bg-[rgba(159,213,178,0.06)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9fd5b2]">
              {course.name}
            </span>

            <span className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
              {chapter.title}
            </span>

            {isClassCompleted ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                <FiCheckCircle className="shrink-0" />
                Completed Module
              </span>
            ) : classProgressPercent > 0 ? (
              <span className="rounded-lg border border-[#f6ed4a]/20 bg-[#f6ed4a]/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#f6ed4a]">
                Continue watching
              </span>
            ) : null}
          </div>

          <h1 className="font-heading font-black text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-none pt-1">
            {cls.title}
          </h1>

          <p className="max-w-3xl text-xs sm:text-sm font-medium text-white/50 leading-relaxed">
            {cls.description || "Class operational descriptors will load here once configured."}
          </p>
        </div>

        {/* TWO-COLUMN CONTENT PLAYBACK FRAMEWORK */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
          
          {/* LEFT PRIMARY PANEL: MEDIA STREAM & DESCRIPTION */}
          <div className="lg:col-span-8 space-y-6 flex flex-col">
            
            {/* VIDEO INTEGRITY CAPTURE INTERFACE CARD */}
            <div className="glass-card overflow-hidden shadow-2xl relative flex flex-col w-full">
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent z-20" />
              
              <div className="flex items-center justify-between gap-4 border-b border-[rgba(159,213,178,0.12)] px-5 py-3.5 bg-[#0d2035]/40 select-none">
                <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                  {isClassCompleted ? "Rewatch this class" : classProgressPercent > 0 ? "Continue watching" : "Start streaming"}
                </span>
                <span className="text-xs font-bold tracking-wide text-[#9fd5b2] bg-[rgba(159,213,178,0.08)] px-2 py-0.5 rounded-md border border-[rgba(159,213,178,0.15)]">
                  {classProgressPercent}% Complete
                </span>
              </div>

              {/* VIDEO PLAYER RENDER CORE CANVAS */}
              <div className="relative aspect-video bg-black/90 overflow-hidden w-full">
                <VideoWatermark user={user} />

                {videoUrl ? (
                  <iframe
                    ref={iframeRef}
                    src={videoUrl}
                    className="h-full w-full block border-0"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    title={cls.title}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-white/40 text-xs font-semibold uppercase tracking-wider">
                    Video asset link pathway is missing for this class module.
                  </div>
                )}
              </div>
            </div>

            {/* EXPANDED DESCRIPTIVE INDEX CARD */}
            <div className="glass-card p-6 shadow-xl relative overflow-hidden flex flex-col">
              <div className="mb-4 flex items-center gap-3 border-b border-[rgba(159,213,178,0.12)] pb-3.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(159,213,178,0.1)] border border-[rgba(159,213,178,0.15)] text-[#9fd5b2] shrink-0">
                  <FiPlayCircle className="w-4 h-4" />
                </span>
                <h2 className="text-lg font-heading font-black text-white tracking-tight">
                  About This Class
                </h2>
              </div>

              <p className="text-white/60 text-sm font-medium leading-relaxed">
                {cls.description || "No specific detailed overview matrix supplied for this lecture field parameter."}
              </p>

              <div className="mt-5 self-start inline-flex items-center gap-2 rounded-lg border border-[rgba(159,213,178,0.15)] bg-white/[0.02] px-3 py-1.5 text-xs font-bold tracking-wide text-white/70 uppercase select-none">
                <FiClock className="text-[#9fd5b2] w-3.5 h-3.5" />
                Duration: {formatDuration(cls.duration)}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: PROGRESS TRACKER & DATA ATTACHMENTS */}
          <div className="lg:col-span-4 space-y-6 flex flex-col w-full">
            
            {/* METRICS DISPATCH SYNCHRONIZATION SUMMARY */}
            <div className="glass-card p-6 shadow-2xl relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent" />
              
              <div className="mb-5 flex items-start justify-between gap-4 border-b border-[rgba(159,213,178,0.12)] pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Learning Progress</p>
                  <h2 className="mt-1 text-base font-heading font-black text-white tracking-tight">Saved Parameters</h2>
                </div>

                <span
                  className={`rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isClassCompleted || syncState === "saved"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : syncState === "saving" || syncState === "watching"
                      ? "border-[#9fd5b2]/30 bg-[rgba(159,213,178,0.06)] text-[#9fd5b2]"
                      : syncState === "error"
                      ? "border-red-500/20 bg-red-500/10 text-red-400"
                      : "border-white/[0.08] bg-white/[0.02] text-white/40"
                  }`}
                >
                  {isClassCompleted ? "Completed" : syncState === "saved" ? "Synced" : syncState === "saving" ? "Saving" : syncState === "watching" ? "Watching" : syncState === "error" ? "Sync failed" : "Waiting"}
                </span>
              </div>

              {/* CARD PROGRESS SLIDER 1: CURRENT CLASS TRACK */}
              <div className="space-y-5 w-full flex flex-col">
                <div className={`rounded-xl border p-4 flex flex-col w-full ${isClassCompleted ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/[0.04] bg-white/[0.01]'}`}>
                  <div className="mb-2.5 flex items-center justify-between text-xs font-medium text-white/70">
                    <span className="inline-flex items-center gap-1.5">
                      {isClassCompleted && <FiCheckCircle className="text-emerald-400 w-3.5 h-3.5" />}
                      This Lecture Matrix
                    </span>
                    <span className="font-bold text-white">{classProgressPercent}%</span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${isClassCompleted ? 'bg-gradient-to-r from-emerald-400 to-[#9fd5b2]' : 'bg-gradient-to-r from-[#9fd5b2] to-[#f6ed4a]'}`}
                      style={{ width: `${classProgressPercent}%` }}
                    />
                  </div>
                </div>

                {/* CARD PROGRESS SLIDER 2: COURSE OVERVIEW TRACK */}
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col w-full">
                  <div className="mb-2.5 flex items-center justify-between text-xs font-medium text-white/70">
                    <span>Course Completion Metric</span>
                    <span className="font-bold text-white">{courseCompletionPercent}%</span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#9fd5b2] to-[#f6ed4a] transition-all duration-500 ease-out"
                      style={{ width: `${courseCompletionPercent}%` }}
                    />
                  </div>

                  {/* Summary Metric Badges Box */}
                  <div className="mt-4 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-wider w-full">
                    <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-white/60">
                      {watchedClasses} / {totalClasses} started
                    </span>
                    <span className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-emerald-400">
                      {completedClasses} / {totalClasses} completed
                    </span>
                    {learningProgress?.averageWatchTime && (
                      <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-white/60">
                        Avg: {learningProgress.averageWatchTime}
                      </span>
                    )}
                    {learningProgress?.streak && (
                      <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-white/60">
                        Streak: {learningProgress.streak} days
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ATTACHED EXERCISES & LABS PANEL DOWNLOADING SHEET */}
            <div className="glass-card p-6 shadow-2xl relative overflow-hidden flex flex-col w-full">
              <div className="mb-4 flex items-center gap-3 border-b border-[rgba(159,213,178,0.12)] pb-4 w-full">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(159,213,178,0.1)] border border-[rgba(159,213,178,0.15)] text-[#9fd5b2] shrink-0">
                  <FiFileText className="w-4 h-4" />
                </span>
                <h2 className="text-base font-heading font-black text-white tracking-tight">
                  Exercise Attachments
                </h2>
              </div>

              {cls.exercises?.length === 0 ? (
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/30 py-2 text-center">
                  No exercise metrics allocated for this session.
                </p>
              ) : (
                <div className="space-y-3.5 w-full flex flex-col">
                  {cls.exercises.map((exercise) => (
                    <a
                      key={exercise._id}
                      href={getUploadUrl(exercise.file)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 transition-colors duration-200 hover:border-[rgba(159,213,178,0.25)] hover:bg-white/[0.04] group"
                    >
                      <div className="min-w-0 pr-2">
                        <h3 className="text-white font-bold text-sm truncate leading-snug group-hover:text-[#9fd5b2] transition-colors">
                          {exercise.title}
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1">
                          Type Variant: {exercise.type}
                        </p>
                      </div>
                      <div className="h-8 w-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-[#9fd5b2] group-hover:text-white group-hover:bg-[#9fd5b2] group-hover:border-[#9fd5b2] transition-all shrink-0">
                        <FiDownload className="w-3.5 h-3.5" />
                      </div>
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

