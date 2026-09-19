import { useEffect, useRef, useState, useContext, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  RefreshCw,
  WifiOff,
  X,
  ChevronLeft,
  ChevronRight,
  List,
  AlertTriangle,
  Send,
  Loader2,
  Lock,
  Play,
} from "lucide-react";
import api from "../../services/api";
import {
  formatDuration,
  getBunnyEmbedUrl,
  getClassVideoSource,
  getUploadUrl,
  getVdoCipherEmbedUrl,
} from "../../utils/courseUi";
import VideoWatermark from "../../components/player/VideoWatermark";
import VideoPlayer from "../../components/player/VideoPlayer";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import storage, { getDeviceId, getBrowserFingerprint } from "../../services/storage";
import { getErrorBuffer, getBrowserInfo } from "../../utils/errorCapture";
import FeatureErrorBoundary from "../../components/common/FeatureErrorBoundary";

function loadVdoCipherApi() {
  if (window.VdoPlayer) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-vdocipher-api="true"]');
    if (existing) {
      if (window.VdoPlayer) {
        resolve();
        return;
      }
      let settled = false;
      const onLoad = () => {
        settled = true;
        resolve();
      };
      const onError = () => {
        settled = true;
        reject(new Error("VdoCipher script failed to load"));
      };
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onError, { once: true });
      setTimeout(() => {
        if (!settled) {
          existing.removeEventListener("load", onLoad);
          existing.removeEventListener("error", onError);
          if (window.VdoPlayer) {
            resolve();
          } else {
            existing.remove();
            const script = document.createElement("script");
            script.src = "https://player.vdocipher.com/v2/api.js";
            script.async = true;
            script.dataset.vdocipherApi = "true";
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          }
        }
      }, 3000);
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
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [data, setData] = useState(null);
  const [chapterClasses, setChapterClasses] = useState([]);
  const [videoData, setVideoData] = useState(null);
  const [progressState, setProgressState] = useState(null);
  const [syncState, setSyncState] = useState("idle");
  const [previewResource, setPreviewResource] = useState(null);
  const [vdoPlayerError, setVdoPlayerError] = useState(false);

  // Redesign states
  const [activeTab, setActiveTab] = useState("about"); // "about" | "resources" | "progress"
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);

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
  const savedProgressBaseRef = useRef({ coveredSeconds: 0, watchedSeconds: 0 });
  const s3ProgressRef = useRef({
    lastSaveTime: 0,
    lastCurrentTime: 0,
    saveInFlight: false,
    sessionElapsed: 0,
    lastTickTime: 0,
  });
  const dataRef = useRef(null);

  // ── Load class data ──
  const loadClass = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setVideoData(null);
      const res = await api.get(`/courses/class/${classId}`);
      setData(res.data);
      setProgressState(res.data.progress || null);

      const videoSource = getClassVideoSource(
        res.data.course?.type,
        res.data.class?.videoSource
      );

      if (videoSource === "s3") {
        try {
          const videoRes = await api.get(`/courses/video/${classId}`);
          setVideoData(videoRes.data);
        } catch (err) {
          console.log("Failed to load S3 video playback data:", err);
          setVideoData({ error: true });
        }
      }

      if (res.data.course?._id && res.data.chapter?.uniqueCode) {
        try {
          const chRes = await api.get(
            `/courses/${res.data.course._id}/chapters/${res.data.chapter.uniqueCode}/classes`
          );
          setChapterClasses(chRes.data.classes || []);
        } catch (chErr) {
          console.log("Could not load sibling chapter classes:", chErr);
        }
      }
    } catch (error) {
      const isTimeout = error?.isTimeout || error?.code === "ECONNABORTED";
      setLoadError({
        message: isTimeout
          ? "The server is taking too long to respond. Please try again."
          : error?.friendlyMessage ||
            "Could not load class content. Please try again.",
        isTimeout,
      });
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    let mounted = true;
    const fetchClassData = async () => {
      try {
        setLoadError(null);
        setVideoData(null);
        const res = await api.get(`/courses/class/${classId}`);
        if (!mounted) return;
        setData(res.data);
        setProgressState(res.data.progress || null);

        const videoSource = getClassVideoSource(
          res.data.course?.type,
          res.data.class?.videoSource
        );

        if (videoSource === "s3") {
          try {
            const videoRes = await api.get(`/courses/video/${classId}`);
            if (mounted) setVideoData(videoRes.data);
          } catch (err) {
            console.log("Failed to load S3 video playback data:", err);
            if (mounted) setVideoData({ error: true });
          }
        }

        if (res.data.course?._id && res.data.chapter?.uniqueCode) {
          try {
            const chRes = await api.get(
              `/courses/${res.data.course._id}/chapters/${res.data.chapter.uniqueCode}/classes`
            );
            if (mounted) setChapterClasses(chRes.data.classes || []);
          } catch (chErr) {
            console.log("Could not load sibling chapter classes:", chErr);
          }
        }
      } catch (error) {
        if (!mounted) return;
        const isTimeout = error?.isTimeout || error?.code === "ECONNABORTED";
        setLoadError({
          message: isTimeout
            ? "The server is taking too long to respond. Please try again."
            : error?.friendlyMessage ||
              "Could not load class content. Please try again.",
          isTimeout,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void fetchClassData();
    return () => {
      mounted = false;
    };
  }, [classId]);

  const refreshPlaybackUrl = useCallback(async () => {
    try {
      const videoRes = await api.get(`/courses/video/${classId}`);
      if (videoRes.data?.playbackUrl) {
        setVideoData(videoRes.data);
        return videoRes.data.playbackUrl;
      }
      return null;
    } catch (err) {
      console.error("Failed to refresh playback URL:", err);
      throw err;
    }
  }, [classId]);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // ── Stream security heartbeat & lifecycle (CANONICAL 25-SECOND HEARTBEAT PRESERVED) ──
  useEffect(() => {
    if (!classId) return;
    let heartbeatInterval = null;
    let cachedDeviceId = null;
    let isMounted = true;
    let isRecovering = false;

    const stopHeartbeat = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };

    const sendHeartbeat = async (devId) => {
      try {
        await api.post("/courses/heartbeat", { deviceId: devId, classId });
      } catch (err) {
        if (!isMounted) return;
        const status = err?.response?.status;
        const errorMsg = err?.response?.data?.message || err?.message || "";

        console.warn(`[Heartbeat] Heartbeat returned status ${status}:`, errorMsg);
        stopHeartbeat();

        if (status === 401) {
          if (isRecovering) return;
          isRecovering = true;
          console.warn(
            "[Heartbeat] Stream expired (401). Attempting stream re-initialization..."
          );

          try {
            const browserFingerprint = JSON.stringify(getBrowserFingerprint());
            await api.post("/courses/start-stream", {
              classId,
              deviceId: devId,
              browserFingerprint,
            });
            isRecovering = false;
            if (isMounted) {
              startHeartbeat(devId);
            }
          } catch (recoveryErr) {
            isRecovering = false;
            const recoveryStatus = recoveryErr?.response?.status;
            console.error("[Heartbeat] Stream recovery failed:", recoveryErr);
            if (recoveryStatus === 401 || recoveryStatus === 403) {
              toast.error(
                "Playback restricted",
                "Another device may be currently watching this course."
              );
              navigate(-1);
            }
          }
        } else if (status === 403) {
          toast.error(
            "Playback restricted",
            "Another device may be currently watching this course."
          );
          navigate(-1);
        }
      }
    };

    const startHeartbeat = (devId) => {
      stopHeartbeat();
      heartbeatInterval = setInterval(() => {
        if (isMounted) {
          void sendHeartbeat(devId);
        }
      }, 25000); // CANONICAL 25000ms HEARTBEAT INTERVAL PRESERVED
    };

    const initializeStream = async () => {
      try {
        const deviceId = await getDeviceId();
        cachedDeviceId = deviceId;
        const browserFingerprint = JSON.stringify(getBrowserFingerprint());
        await api.post("/courses/start-stream", {
          classId,
          deviceId,
          browserFingerprint,
        });

        if (isMounted) {
          startHeartbeat(deviceId);
        }
      } catch (error) {
        if (!isMounted) return;
        const status = error?.response?.status;
        console.error("[Stream] start-stream failed:", error);
        if (status === 401 || status === 403) {
          toast.error(
            "Playback restricted",
            "Another device may be currently watching this course."
          );
          navigate(-1);
        }
      }
    };

    initializeStream();

    const stopStream = async () => {
      try {
        const deviceId = cachedDeviceId || (await getDeviceId());
        const currentUser = userRef.current;
        const userId = currentUser?.userId || currentUser?._id || currentUser?.id;
        if (deviceId && userId) {
          await api.post("/courses/stop-stream", { deviceId, userId });
        }
      } catch (error) {
        console.log(error);
      }
    };

    const handleUnload = () => {
      const deviceId = cachedDeviceId;
      if (!deviceId) return;
      const currentUser = userRef.current;
      const userId = currentUser?.userId || currentUser?._id || currentUser?.id;
      const baseUrl = api.defaults.baseURL || window.location.origin + "/api";
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `${baseUrl}/courses/stop-stream`,
          new Blob([JSON.stringify({ deviceId, userId })], {
            type: "application/json",
          })
        );
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      isMounted = false;
      stopHeartbeat();
      stopStream();
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [classId, navigate, toast]);

  // ── Initialize progress refs ──
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
    dataRef.current = data;
  }, [data]);

  // ── VdoCipher player setup ──
  useEffect(() => {
    const classData = dataRef.current?.class;
    const videoSource = getClassVideoSource(
      dataRef.current?.course?.type,
      classData?.videoSource
    );
    if (videoSource === "s3" || !classData?.vdoCipher || !iframeRef.current) {
      return undefined;
    }
    let cancelled = false;
    let cleanup = () => {};

    const buildProgressSnapshot = async (completed = false) => {
      if (!playerRef.current) return null;
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
        Number(sessionCoveredSeconds) || 0
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
      if (cancelled || !playerRef.current || saveInFlightRef.current) return;
      try {
        const snapshot = await buildProgressSnapshot(completed);
        if (!snapshot) return;
        if (
          !force &&
          snapshot.totalPlayedSeconds <= 0 &&
          snapshot.totalCoveredSeconds <= 0 &&
          snapshot.currentTimeSeconds <= 0
        )
          return;
        const previous = lastSyncedRef.current;
        if (
          !force &&
          snapshot.totalPlayedSeconds - previous.totalPlayed < 15 &&
          snapshot.totalCoveredSeconds - previous.totalCovered < 10 &&
          Math.abs(snapshot.currentTimeSeconds - previous.currentTime) < 15
        )
          return;
        saveInFlightRef.current = true;
        setSyncState("saving");
        const res = await api.post(
          `/courses/class/${classId}/progress`,
          snapshot
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
        if (cancelled || !iframeRef.current || !window.VdoPlayer) return;
        const player = window.VdoPlayer.getInstance(iframeRef.current);
        playerRef.current = player;
        const onLoadedMetadata = () => {
          const resumeAt = Number(
            dataRef.current?.progress?.classProgress?.lastPositionSeconds
          );
          if (
            Number.isFinite(resumeAt) &&
            resumeAt > 0 &&
            resumeAt < Number(player.video.duration || 0) - 3
          )
            player.video.currentTime = resumeAt;
          void persistProgress({ force: true });
        };
        const onTimeUpdate = () => {
          void persistProgress();
        };
        const onPlay = () => {
          setSyncState("watching");
          void buildProgressSnapshot(false);
        };
        const onPause = () => {
          void persistProgress({ force: true });
        };
        const onSeeked = () => {
          void persistProgress({ force: true });
        };
        const onEnded = () => {
          void persistProgress({ completed: true, force: true });
        };
        const progressInterval = window.setInterval(() => {
          void persistProgress({ force: true });
        }, 15000);
        const flushLatestProgress = () => {
          const snapshot = latestSnapshotRef.current;
          const token = storage.getAccessToken();
          if (!snapshot || !token) return;
          const baseUrl =
            api.defaults.baseURL || "https://zeitnahacademy.com/api";
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
          if (document.visibilityState === "hidden") flushLatestProgress();
        };
        player.video.addEventListener("loadedmetadata", onLoadedMetadata);
        player.video.addEventListener("play", onPlay);
        player.video.addEventListener("timeupdate", onTimeUpdate);
        player.video.addEventListener("pause", onPause);
        player.video.addEventListener("seeked", onSeeked);
        player.video.addEventListener("ended", onEnded);

        const onVideoError = () => {
          const err = player.video.error;
          if (err && err.code !== 1) {
            console.error("VdoCipher player video error:", err.code, err.message);
            setVdoPlayerError(true);
          }
        };

        let vdoStallTimer = null;
        const onVdoWaiting = () => {
          if (vdoStallTimer) clearTimeout(vdoStallTimer);
          vdoStallTimer = setTimeout(() => {
            if (
              player.video &&
              !player.video.paused &&
              player.video.readyState < 3
            ) {
              console.warn(
                "VdoCipher prolonged stall detected (20s), showing recovery overlay"
              );
              setVdoPlayerError(true);
            }
          }, 20000);
        };
        const onVdoPlaying = () => {
          if (vdoStallTimer) {
            clearTimeout(vdoStallTimer);
            vdoStallTimer = null;
          }
        };

        player.video.addEventListener("error", onVideoError);
        player.video.addEventListener("waiting", onVdoWaiting);
        player.video.addEventListener("playing", onVdoPlaying);
        player.video.addEventListener("canplay", onVdoPlaying);
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
          player.video.removeEventListener("error", onVideoError);
          player.video.removeEventListener("waiting", onVdoWaiting);
          player.video.removeEventListener("playing", onVdoPlaying);
          player.video.removeEventListener("canplay", onVdoPlaying);
          if (vdoStallTimer) clearTimeout(vdoStallTimer);
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
      cleanup();
      playerRef.current = null;
    };
  }, [classId, data?.class?._id]);

  // VdoCipher network recovery
  useEffect(() => {
    const classData = dataRef.current?.class;
    const videoSource = getClassVideoSource(
      dataRef.current?.course?.type,
      classData?.videoSource
    );
    if (videoSource === "s3") return;

    const handleOnline = () => {
      if (!vdoPlayerError) return;
      setVdoPlayerError(false);
      api
        .get(`/courses/class/${classId}`)
        .then((res) => {
          setData(res.data);
          setProgressState(res.data.progress || null);
        })
        .catch((err) => {
          console.error("Failed to reload class data after network recovery:", err);
        });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [classId, vdoPlayerError]);

  const handleVdoReload = useCallback(async () => {
    setVdoPlayerError(false);
    try {
      const res = await api.get(`/courses/class/${classId}`);
      setData(res.data);
      setProgressState(res.data.progress || null);
    } catch (err) {
      console.error("Failed to reload class data:", err);
      toast.error("Reload failed", "Could not reload the video. Please try again.");
    }
  }, [classId, toast]);

  // Submit Video Issue Report
  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    if (!issueDescription.trim()) return;
    try {
      setSubmittingIssue(true);
      await api.post("/troubleshoot/report", {
        title: `[Playback Issue] ${data?.class?.title || "Class"}`,
        description: `${issueDescription.trim()} (ClassId: ${classId}, Course: ${data?.course?.name})`,
        severity: "medium",
        browserInfo: getBrowserInfo(),
        errors: getErrorBuffer(),
      });
      toast.success("Report received", "Thank you. Our technical team has been alerted.");
      setIssueModalOpen(false);
      setIssueDescription("");
    } catch (err) {
      console.error("Failed to submit issue report:", err);
      toast.error("Submission failed", "Could not send report. Please try again.");
    } finally {
      setSubmittingIssue(false);
    }
  };

  // ── Sibling Classes & Navigation ──
  const currentClassIdx = chapterClasses.findIndex((c) => c._id === classId);
  const prevLesson = currentClassIdx > 0 ? chapterClasses[currentClassIdx - 1] : null;
  const nextLesson =
    currentClassIdx >= 0 && currentClassIdx < chapterClasses.length - 1
      ? chapterClasses[currentClassIdx + 1]
      : null;

  // ── Loading Skeleton ──
  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="h-4 w-48 shimmer rounded" />
        <div className="aspect-video w-full shimmer rounded-2xl" />
        <div className="h-20 shimmer rounded-xl" />
      </div>
    );
  }

  // ── Error State ──
  if (loadError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center max-w-md bg-bg-card p-8 rounded-2xl border border-white/[0.08]"
        >
          {loadError.isTimeout ? (
            <Clock className="w-12 h-12 text-warning" />
          ) : (
            <WifiOff className="w-12 h-12 text-danger" />
          )}
          <h3 className="font-heading font-bold text-lg text-white">
            Playback Unavailable
          </h3>
          <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
            {loadError.message}
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => loadClass()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-mint text-bg-base font-bold text-xs uppercase tracking-wider hover:bg-brand-mint/90 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
            <button
              type="button"
              onClick={() => navigate("/courses")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-white hover:bg-white/[0.08] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!data || !data.class) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
        <p className="text-text-muted text-sm font-medium">
          The requested lesson is unavailable or does not exist.
        </p>
        <button
          type="button"
          onClick={() => navigate(data?.course?._id ? `/courses/${data.course._id}/chapters` : "/courses")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-white hover:bg-white/[0.1] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Course
        </button>
      </div>
    );
  }

  const { chapter = {}, class: cls = {}, course = {} } = data;
  const isS3Video = getClassVideoSource(course?.type, cls?.videoSource) === "s3";
  const videoUrl =
    (cls?.vdoCipher ? getVdoCipherEmbedUrl(cls.vdoCipher) : "") ||
    (cls?.videoId ? getBunnyEmbedUrl(cls.videoId) : "");
  const classProgress =
    progressState?.classProgress || data.progress?.classProgress;
  const learningProgress =
    progressState?.learningProgress || data.progress?.learningProgress;
  const classProgressPercent = Math.min(
    100,
    Math.max(0, Math.round(classProgress?.progressPercent || 0))
  );
  const isClassCompleted =
    Boolean(classProgress?.completed) || classProgressPercent >= 100;
  const courseCompletionPercent = Math.min(
    100,
    Math.max(0, Math.round(learningProgress?.completionPercent || 0))
  );

  const syncLabel = isClassCompleted
    ? "Completed"
    : syncState === "saved"
    ? "Synced"
    : syncState === "saving"
    ? "Saving..."
    : syncState === "watching"
    ? "Playing"
    : syncState === "error"
    ? "Sync Failed"
    : "Ready";

  const syncBadgeClass =
    isClassCompleted || syncState === "saved"
      ? "text-success border-success/25 bg-success/10"
      : syncState === "saving" || syncState === "watching"
      ? "text-brand-mint border-brand-mint/25 bg-brand-mint/10"
      : syncState === "error"
      ? "text-danger border-danger/25 bg-danger/10"
      : "text-text-muted border-white/[0.08] bg-white/[0.02]";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Breadcrumb Navigation & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-medium text-text-muted">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 truncate">
          <Link
            to="/courses"
            className="hover:text-white transition-colors focus-ring rounded"
          >
            Courses
          </Link>
          {course?._id && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-text-faint shrink-0" />
              <Link
                to={`/courses/${course._id}/chapters`}
                className="hover:text-white transition-colors focus-ring rounded truncate max-w-[140px]"
              >
                {course.name || "Course"}
              </Link>
            </>
          )}
          {chapter?.uniqueCode && course?._id && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-text-faint shrink-0" />
              <Link
                to={`/courses/${course._id}/chapters/${chapter.uniqueCode}/classes`}
                className="hover:text-white transition-colors focus-ring rounded truncate max-w-[160px]"
              >
                {chapter.title || "Chapter"}
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${syncBadgeClass}`}
          >
            {isClassCompleted && <CheckCircle2 className="w-3 h-3" />}
            {syncLabel}
          </span>
          <button
            type="button"
            onClick={() => setIssueModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-[10px] font-semibold uppercase tracking-wider text-text-muted hover:text-white transition-all cursor-pointer focus-ring"
          >
            <AlertTriangle className="w-3 h-3 text-warning" />
            <span>Report Issue</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          CINEMATIC VIDEO PLAYER FRAME
          ══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl overflow-hidden border border-white/[0.08] bg-black relative shadow-2xl flex flex-col"
      >
        <div className="gradient-line-top" />

        {/* Video Player Box */}
        <FeatureErrorBoundary featureName="Video Player">
          <div className="relative aspect-video bg-black overflow-hidden w-full">
          {!isS3Video && <VideoWatermark user={user} />}

          {isS3Video ? (
            videoData?.playbackUrl ? (
              <VideoPlayer
                src={videoData.playbackUrl}
                refreshUrl={refreshPlaybackUrl}
                watermarkData={videoData.watermarkData}
                initialTime={Number(
                  data?.progress?.classProgress?.lastPositionSeconds || 0
                )}
                onProgress={({ currentTime, duration }) => {
                  const s3State = s3ProgressRef.current;
                  const now = Date.now();
                  const isEnding =
                    duration > 0 && currentTime >= duration - 2;

                  if (s3State.lastTickTime > 0) {
                    const deltaMs = now - s3State.lastTickTime;
                    if (deltaMs > 0 && deltaMs < 2000) {
                      s3State.sessionElapsed += deltaMs / 1000;
                    }
                  }
                  s3State.lastTickTime = now;

                  const shouldSave =
                    now - s3State.lastSaveTime > 15000 || isEnding;
                  if (isEnding && s3State.lastCurrentTime === currentTime)
                    return;
                  if (!shouldSave || s3State.saveInFlight) return;

                  s3State.lastSaveTime = now;
                  s3State.lastCurrentTime = currentTime;
                  s3State.saveInFlight = true;

                  const savedBase = savedProgressBaseRef.current;
                  const snapshot = {
                    completed: isEnding,
                    currentTimeSeconds: Math.round(currentTime),
                    durationSeconds: Math.round(duration),
                    totalCoveredSeconds: Math.round(
                      Math.max(
                        savedBase.coveredSeconds || 0,
                        (savedBase.coveredSeconds || 0) + currentTime
                      )
                    ),
                    totalPlayedSeconds: Math.round(
                      (savedBase.watchedSeconds || 0) + s3State.sessionElapsed
                    ),
                  };

                  latestSnapshotRef.current = snapshot;
                  setSyncState("saving");
                  api
                    .post(`/courses/class/${classId}/progress`, snapshot)
                    .then((res) => {
                      setProgressState(res.data);
                      setSyncState("saved");
                    })
                    .catch(() => setSyncState("error"))
                    .finally(() => {
                      s3State.saveInFlight = false;
                    });
                }}
              />
            ) : videoData?.error ? (
              <div className="flex h-full items-center justify-center text-danger text-sm font-medium">
                Failed to load secure video stream.
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-text-muted text-sm font-medium shimmer">
                Loading secure video...
              </div>
            )
          ) : videoUrl ? (
            <>
              <iframe
                ref={iframeRef}
                src={videoUrl}
                className="h-full w-full block border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                title={cls.title}
              />
              {vdoPlayerError && (
                <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center text-white p-6">
                  <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center text-warning mb-4">
                    <WifiOff className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold mb-2">
                    Video Stream Interrupted
                  </h3>
                  <p className="text-xs sm:text-sm text-white/60 text-center max-w-sm mb-5">
                    Stream interrupted by network jitter. Click below to fetch a fresh authenticated session.
                  </p>
                  <button
                    type="button"
                    onClick={handleVdoReload}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-mint text-bg-base font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-brand-mint/90 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reload Player
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-text-muted text-sm font-medium">
              Video not available for this class.
            </div>
          )}
        </div>
        </FeatureErrorBoundary>

        {/* Progress bar directly below player */}
        <div className="h-1 w-full bg-white/[0.06]">
          <div
            className={`h-full transition-all duration-500 ${
              isClassCompleted
                ? "bg-success"
                : "bg-gradient-to-r from-brand-mint to-brand-yellow"
            }`}
            style={{ width: `${classProgressPercent}%` }}
          />
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════
          LESSON NAVIGATION BAR (Previous / Playlist / Next)
          ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border border-white/[0.06] bg-bg-card">
        {/* Previous Lesson Button */}
        <button
          type="button"
          disabled={!prevLesson}
          onClick={() => prevLesson && navigate(`/courses/class/${prevLesson._id}`)}
          className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold text-white transition-all cursor-pointer focus-ring"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous Lesson</span>
          <span className="sm:hidden">Prev</span>
        </button>

        {/* Chapter Playlist Drawer Trigger */}
        <button
          type="button"
          onClick={() => setPlaylistOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-lg bg-brand-mint/10 border border-brand-mint/20 text-brand-mint hover:bg-brand-mint/15 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer focus-ring"
        >
          <List className="w-4 h-4" />
          <span>Chapter Playlist ({chapterClasses.length})</span>
        </button>

        {/* Next Lesson Button */}
        <button
          type="button"
          disabled={!nextLesson}
          onClick={() => {
            if (!nextLesson) return;
            if (nextLesson.locked) {
              toast.error("Lesson locked", "Please complete this lesson first.");
            } else {
              navigate(`/courses/class/${nextLesson._id}`);
            }
          }}
          className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg bg-brand-yellow text-bg-base hover:bg-brand-yellow/90 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider transition-all cursor-pointer focus-ring"
        >
          <span className="hidden sm:inline">Next Lesson</span>
          <span className="sm:hidden">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          LESSON DETAILS & CONTENT TABS
          ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Tabbed Content (About, Resources, Stats) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="border-b border-white/[0.06] flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("about")}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === "about"
                  ? "border-brand-mint text-white"
                  : "border-transparent text-text-muted hover:text-white"
              }`}
            >
              About Lesson
            </button>

            {cls.exercises && cls.exercises.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("resources")}
                className={`pb-3 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "resources"
                    ? "border-brand-mint text-white"
                    : "border-transparent text-text-muted hover:text-white"
                }`}
              >
                <span>Resources</span>
                <span className="rounded-full bg-brand-mint/20 text-brand-mint text-[10px] px-1.5 py-0.2">
                  {cls.exercises.length}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("progress")}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === "progress"
                  ? "border-brand-mint text-white"
                  : "border-transparent text-text-muted hover:text-white"
              }`}
            >
              Your Progress
            </button>
          </div>

          {/* TAB 1: About */}
          {activeTab === "about" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-5 sm:p-6 rounded-2xl border border-white/[0.06] bg-bg-card space-y-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  <span>{chapter.title}</span>
                  {cls.duration && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-border-default" />
                      <span>{formatDuration(cls.duration)}</span>
                    </>
                  )}
                </div>
                <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-white">
                  {cls.title}
                </h2>
              </div>

              <p className="text-xs sm:text-sm font-medium text-text-muted leading-relaxed">
                {cls.description ||
                  "No detailed description provided for this lesson."}
              </p>
            </motion.div>
          )}

          {/* TAB 2: Resources & Exercises */}
          {activeTab === "resources" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-5 sm:p-6 rounded-2xl border border-white/[0.06] bg-bg-card space-y-3"
            >
              <h3 className="font-heading font-bold text-base text-white mb-2">
                Lesson Attachments
              </h3>
              <div className="space-y-2.5">
                {cls.exercises?.map((exercise) => (
                  <div
                    key={exercise._id || exercise.title}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 hover:border-brand-mint/25 transition-all"
                  >
                    <div className="min-w-0 pr-3">
                      <h4 className="text-white font-semibold text-xs sm:text-sm truncate">
                        {exercise.title || "Resource File"}
                      </h4>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mt-0.5">
                        {exercise.type || "Attachment"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewResource(exercise)}
                        className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-brand-mint/20 text-white/80 hover:text-brand-mint border border-white/10 flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-mint" />
                        <span>Preview</span>
                      </button>

                      <a
                        href={getUploadUrl(exercise.file)}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="h-8 px-2.5 rounded-lg bg-brand-mint/10 hover:bg-brand-mint/25 text-brand-mint border border-brand-mint/25 flex items-center gap-1.5 text-xs font-semibold transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 3: Progress & Stats */}
          {activeTab === "progress" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-5 sm:p-6 rounded-2xl border border-white/[0.06] bg-bg-card space-y-4"
            >
              <h3 className="font-heading font-bold text-base text-white">
                Progress Overview
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>This Lesson</span>
                    <span className="font-bold text-white">
                      {classProgressPercent}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-mint to-brand-yellow"
                      style={{ width: `${classProgressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>Course Overall</span>
                    <span className="font-bold text-white">
                      {courseCompletionPercent}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-brand-mint"
                      style={{ width: `${courseCompletionPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Desktop Playlist Panel */}
        <div className="hidden lg:block lg:col-span-4 space-y-3">
          <div className="rounded-2xl border border-white/[0.08] bg-bg-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-mint">
                  Current Chapter
                </span>
                <h3 className="font-heading font-bold text-sm text-white truncate max-w-[200px]">
                  {chapter.title}
                </h3>
              </div>
              <span className="text-xs text-text-muted font-semibold">
                {chapterClasses.length} Lessons
              </span>
            </div>

            <div className="space-y-1.5 max-h-[440px] overflow-y-auto no-scrollbar pr-1">
              {chapterClasses.map((item, idx) => {
                const isCurrent = item._id === classId;
                const isDone = item.completed;
                const isLocked = item.locked;

                return (
                  <div
                    key={item._id}
                    onClick={() => {
                      if (isLocked) {
                        toast.error(
                          "Lesson locked",
                          "Please complete previous classes to unlock."
                        );
                      } else {
                        navigate(`/courses/class/${item._id}`);
                      }
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-brand-mint/10 border-brand-mint/30 text-white font-bold"
                        : isDone
                        ? "bg-success/5 border-success/15 text-text-secondary hover:bg-success/10"
                        : isLocked
                        ? "bg-white/[0.01] border-transparent text-text-faint opacity-50"
                        : "bg-white/[0.02] border-white/[0.04] text-text-secondary hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="text-[10px] font-mono opacity-50 shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </div>

                    <div className="shrink-0">
                      {isCurrent ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-brand-mint">
                          Playing
                        </span>
                      ) : isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      ) : isLocked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3 h-3 text-text-muted" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Chapter Playlist Drawer ── */}
      <AnimatePresence>
        {playlistOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPlaylistOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="relative w-full max-w-lg rounded-t-3xl bg-bg-surface border-t border-white/10 p-5 pb-8 shadow-2xl z-10 max-h-[75vh] flex flex-col"
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />

              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-mint">
                    Chapter Playlist
                  </span>
                  <h3 className="font-heading font-bold text-base text-white">
                    {chapter.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPlaylistOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 mt-4 overflow-y-auto flex-1">
                {chapterClasses.map((item, idx) => {
                  const isCurrent = item._id === classId;
                  const isDone = item.completed;
                  const isLocked = item.locked;

                  return (
                    <div
                      key={item._id}
                      onClick={() => {
                        if (isLocked) {
                          toast.error(
                            "Lesson locked",
                            "Please complete previous classes first."
                          );
                        } else {
                          setPlaylistOpen(false);
                          navigate(`/courses/class/${item._id}`);
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium cursor-pointer ${
                        isCurrent
                          ? "bg-brand-mint/10 border-brand-mint/30 text-white font-bold"
                          : isDone
                          ? "bg-success/5 border-success/15 text-text-secondary"
                          : isLocked
                          ? "bg-white/[0.01] border-transparent text-text-faint opacity-50"
                          : "bg-white/[0.02] border-white/[0.04] text-text-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="text-[10px] font-mono opacity-50">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="truncate">{item.title}</span>
                      </div>
                      <div className="shrink-0">
                        {isCurrent ? (
                          <span className="text-[9px] font-bold uppercase text-brand-mint">
                            Playing
                          </span>
                        ) : isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        ) : isLocked ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Report Video Issue Modal ── */}
      <AnimatePresence>
        {issueModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIssueModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-bg-surface border border-white/10 rounded-2xl p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <h3 className="font-heading font-bold text-base text-white">
                    Report Video Issue
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitIssue} className="space-y-3.5">
                <p className="text-xs text-text-muted">
                  Let us know if you are experiencing playback, audio, or streaming problems with{" "}
                  <span className="text-white font-semibold">{cls.title}</span>.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Describe the issue
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Video is buffering continuously at 04:15..."
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    className="w-full glass-input p-3 text-xs sm:text-sm focus-ring resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIssueModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-text-muted hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingIssue || !issueDescription.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-mint text-bg-base font-bold text-xs uppercase tracking-wider hover:bg-brand-mint/90 disabled:opacity-40"
                  >
                    {submittingIssue ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Send Report
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Resource File Preview Modal ── */}
      {previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 transition-all duration-300">
          <div className="relative flex flex-col w-full max-w-5xl h-[88vh] bg-bg-surface border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <span className="h-9 w-9 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint shrink-0">
                  <FileText className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-white font-heading font-bold text-sm sm:text-base truncate">
                    {previewResource.title || "Resource Preview"}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-mint">
                    {previewResource.type || "Document"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={getUploadUrl(previewResource.file)}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-mint text-bg-base font-bold text-xs transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewResource(null)}
                  className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-all border border-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-bg-base relative flex items-center justify-center p-2 overflow-hidden">
              {previewResource.type?.toLowerCase() === "pdf" ||
              (previewResource.file &&
                String(previewResource.file).toLowerCase().includes(".pdf")) ? (
                <iframe
                  src={`${getUploadUrl(previewResource.file)}#toolbar=1&navpanes=0`}
                  className="w-full h-full rounded-xl border-0 bg-white"
                  title={previewResource.title || "PDF Preview"}
                />
              ) : previewResource.type?.toLowerCase() === "image" ||
                /\.(png|jpe?g|webp|gif|svg)/i.test(
                  String(previewResource.file || "")
                ) ? (
                <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                  <img
                    src={getUploadUrl(previewResource.file)}
                    alt={previewResource.title}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10"
                  />
                </div>
              ) : (
                <div className="text-center p-8 space-y-4 max-w-md">
                  <FileText className="w-12 h-12 text-brand-mint/50 mx-auto" />
                  <p className="text-white/80 text-sm font-medium">
                    Direct inline view is not supported for this file format, but you can download it below.
                  </p>
                  <a
                    href={getUploadUrl(previewResource.file)}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-mint text-bg-base font-bold text-xs shadow-lg hover:bg-brand-mint/90 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClassView;
