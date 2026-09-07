import { useEffect, useRef, useState, useContext, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  PlayCircle,
  RefreshCw,
  WifiOff,
  X,
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


function loadVdoCipherApi() {
  if (window.VdoPlayer) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-vdocipher-api="true"]');
    if (existing) {
      // If the script tag exists and has already loaded, VdoPlayer should be on window.
      // If not, the script may still be loading — listen for load/error.
      // Guard: if the script already finished loading but VdoPlayer isn't set yet,
      // use a short poll to avoid hanging forever.
      if (window.VdoPlayer) {
        resolve();
        return;
      }
      let settled = false;
      const onLoad = () => { settled = true; resolve(); };
      const onError = () => { settled = true; reject(new Error('VdoCipher script failed to load')); };
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onError, { once: true });
      // Fallback: if the load event already fired before we attached the listener,
      // the promise would hang. Poll briefly to catch this edge case.
      setTimeout(() => {
        if (!settled) {
          existing.removeEventListener("load", onLoad);
          existing.removeEventListener("error", onError);
          if (window.VdoPlayer) {
            resolve();
          } else {
            // Script tag exists but VdoPlayer not available — force reload
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
  const [videoData, setVideoData] = useState(null);
  const [progressState, setProgressState] = useState(null);
  const [syncState, setSyncState] = useState("idle");
  const [previewResource, setPreviewResource] = useState(null);
  const [vdoPlayerError, setVdoPlayerError] = useState(false);

  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const saveInFlightRef = useRef(false);
  const lastSyncedRef = useRef({ currentTime: 0, duration: 0, totalCovered: 0, totalPlayed: 0 });
  const latestSnapshotRef = useRef(null);
  const savedProgressBaseRef = useRef({ coveredSeconds: 0, watchedSeconds: 0 });
  const s3ProgressRef = useRef({ lastSaveTime: 0, lastCurrentTime: 0, saveInFlight: false, sessionElapsed: 0, lastTickTime: 0 });
  const dataRef = useRef(null);

  // ── Load class data ──
  const loadClass = useCallback(async (mounted = { current: true }) => {
    try {
      setLoading(true);
      setLoadError(null);
      setVideoData(null);
      const res = await api.get(`/courses/class/${classId}`);
      if (mounted.current) {
        setData(res.data);
        setProgressState(res.data.progress || null);
        const videoSource = getClassVideoSource(
          res.data.course?.type,
          res.data.class?.videoSource,
        );

        if (videoSource === "s3") {
          try {
            const videoRes = await api.get(`/courses/video/${classId}`);
            if (mounted.current) setVideoData(videoRes.data);
          } catch (err) {
            console.log("Failed to load S3 video playback data:", err);
            if (mounted.current) setVideoData({ error: true });
          }
        }
      }
    } catch (error) {
      if (mounted.current) {
        const isTimeout = error?.isTimeout || error?.code === "ECONNABORTED";
        setLoadError({
          message: isTimeout
            ? "The server is taking too long to respond. Please try again."
            : error?.friendlyMessage || "Could not load class content. Please try again.",
          isTimeout,
        });
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    const mounted = { current: true };
    loadClass(mounted);
    return () => { mounted.current = false; };
  }, [loadClass]);

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

  // ── Stream security heartbeat & lifecycle ──
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

        // STEP 5: On 401 (stream session expired or invalid device)
        // Immediately STOP heartbeat timer to prevent request storms
        stopHeartbeat();

        if (status === 401) {
          if (isRecovering) return;
          isRecovering = true;
          console.warn("[Heartbeat] Stream expired (401). Attempting stream re-initialization...");

          try {
            const browserFingerprint = JSON.stringify(getBrowserFingerprint());
            await api.post("/courses/start-stream", { classId, deviceId: devId, browserFingerprint });
            // Re-initialized successfully! Resume heartbeat
            isRecovering = false;
            if (isMounted) {
              startHeartbeat(devId);
            }
          } catch (recoveryErr) {
            isRecovering = false;
            const recoveryStatus = recoveryErr?.response?.status;
            console.error("[Heartbeat] Stream recovery failed:", recoveryErr);
            if (recoveryStatus === 401 || recoveryStatus === 403) {
              toast.error("Playback restricted", "Another device may be currently watching this course.");
              navigate(-1);
            }
          }
        } else if (status === 403) {
          // STEP 7: 403 Device Restriction — another device is actively streaming
          toast.error("Playback restricted", "Another device may be currently watching this course.");
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
      }, 25000); // Canonical 25-second heartbeat interval
    };

    const initializeStream = async () => {
      try {
        const deviceId = await getDeviceId();
        cachedDeviceId = deviceId; // Cache for synchronous access in lifecycle unload
        const browserFingerprint = JSON.stringify(getBrowserFingerprint());
        await api.post("/courses/start-stream", { classId, deviceId, browserFingerprint });
        
        if (isMounted) {
          startHeartbeat(deviceId);
        }
      } catch (error) {
        if (!isMounted) return;
        const status = error?.response?.status;
        console.error("[Stream] start-stream failed:", error);
        if (status === 401 || status === 403) {
          toast.error("Playback restricted", "Another device may be currently watching this course.");
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
      } catch (error) { console.log(error); }
    };

    // Synchronous unload handler for web, mobile web, and native WebViews
    const handleUnload = () => {
      const deviceId = cachedDeviceId;
      if (!deviceId) return;
      const currentUser = userRef.current;
      const userId = currentUser?.userId || currentUser?._id || currentUser?.id;
      const baseUrl = api.defaults.baseURL || window.location.origin + "/api";
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${baseUrl}/courses/stop-stream`, new Blob([JSON.stringify({ deviceId, userId })], { type: "application/json" }));
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
  }, [classId, navigate]);

  // ── Initialize progress refs ──
  useEffect(() => {
    const initial = data?.progress?.classProgress;
    lastSyncedRef.current = { currentTime: initial?.lastPositionSeconds || 0, duration: initial?.durationSeconds || 0, totalCovered: initial?.coveredSeconds || 0, totalPlayed: initial?.watchedSeconds || 0 };
    savedProgressBaseRef.current = { coveredSeconds: initial?.coveredSeconds || 0, watchedSeconds: initial?.watchedSeconds || 0 };
    latestSnapshotRef.current = initial ? { completed: Boolean(initial.completed), currentTimeSeconds: initial.lastPositionSeconds || 0, durationSeconds: initial.durationSeconds || 0, totalCoveredSeconds: initial.coveredSeconds || 0, totalPlayedSeconds: initial.watchedSeconds || 0 } : null;
    // Keep dataRef in sync for VdoCipher setup to read without re-triggering effect
    dataRef.current = data;
  }, [data]);

  // ── VdoCipher player setup ──
  // Only depends on classId — reads data from dataRef to avoid tearing down player on progress syncs
  useEffect(() => {
    const classData = dataRef.current?.class;
    const videoSource = getClassVideoSource(
      dataRef.current?.course?.type,
      classData?.videoSource,
    );
    if (
      videoSource === "s3" ||
      !classData?.vdoCipher ||
      !iframeRef.current
    ) {
      return undefined;
    }
    let cancelled = false;
    let cleanup = () => {};

    const buildProgressSnapshot = async (completed = false) => {
      if (!playerRef.current) return null;
      const player = playerRef.current;
      const [sessionPlayedSeconds, sessionCoveredSeconds] = await Promise.all([player.api.getTotalPlayed(), player.api.getTotalCovered()]);
      const currentTimeSeconds = Number(player.video.currentTime) || 0;
      const durationSeconds = Number(player.video.duration) || 0;
      const savedBase = savedProgressBaseRef.current;
      const totalPlayedSeconds = savedBase.watchedSeconds + (Number(sessionPlayedSeconds) || 0);
      const totalCoveredSeconds = Math.max(savedBase.coveredSeconds, Number(sessionCoveredSeconds) || 0);
      const snapshot = { completed, currentTimeSeconds: Math.round(currentTimeSeconds), durationSeconds: Math.round(durationSeconds), totalCoveredSeconds: Math.round(totalCoveredSeconds), totalPlayedSeconds: Math.round(totalPlayedSeconds) };
      latestSnapshotRef.current = snapshot;
      return snapshot;
    };

    const persistProgress = async ({ completed = false, force = false } = {}) => {
      if (cancelled || !playerRef.current || saveInFlightRef.current) return;
      try {
        const snapshot = await buildProgressSnapshot(completed);
        if (!snapshot) return;
        if (!force && snapshot.totalPlayedSeconds <= 0 && snapshot.totalCoveredSeconds <= 0 && snapshot.currentTimeSeconds <= 0) return;
        const previous = lastSyncedRef.current;
        if (!force && snapshot.totalPlayedSeconds - previous.totalPlayed < 15 && snapshot.totalCoveredSeconds - previous.totalCovered < 10 && Math.abs(snapshot.currentTimeSeconds - previous.currentTime) < 15) return;
        saveInFlightRef.current = true;
        setSyncState("saving");
        const res = await api.post(`/courses/class/${classId}/progress`, snapshot);
        lastSyncedRef.current = { currentTime: snapshot.currentTimeSeconds, duration: snapshot.durationSeconds, totalCovered: snapshot.totalCoveredSeconds, totalPlayed: snapshot.totalPlayedSeconds };
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
          const resumeAt = Number(dataRef.current?.progress?.classProgress?.lastPositionSeconds);
          if (Number.isFinite(resumeAt) && resumeAt > 0 && resumeAt < Number(player.video.duration || 0) - 3) player.video.currentTime = resumeAt;
          void persistProgress({ force: true });
        };
        const onTimeUpdate = () => { void persistProgress(); };
        const onPlay = () => { setSyncState("watching"); void buildProgressSnapshot(false); };
        const onPause = () => { void persistProgress({ force: true }); };
        const onSeeked = () => { void persistProgress({ force: true }); };
        const onEnded = () => { void persistProgress({ completed: true, force: true }); };
        const progressInterval = window.setInterval(() => { void persistProgress({ force: true }); }, 15000);
        const flushLatestProgress = () => {
          const snapshot = latestSnapshotRef.current;
          const token = storage.getAccessToken();
          if (!snapshot || !token) return;
          const baseUrl = api.defaults.baseURL || "https://beta.zeitnahacademy.com/api";
          void fetch(`${baseUrl}/courses/class/${classId}/progress`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(snapshot), keepalive: true });
        };
        const onPageHide = () => { flushLatestProgress(); };
        const onVisibilityChange = () => { if (document.visibilityState === "hidden") flushLatestProgress(); };
        player.video.addEventListener("loadedmetadata", onLoadedMetadata);
        player.video.addEventListener("play", onPlay);
        player.video.addEventListener("timeupdate", onTimeUpdate);
        player.video.addEventListener("pause", onPause);
        player.video.addEventListener("seeked", onSeeked);
        player.video.addEventListener("ended", onEnded);
        // ── VdoCipher video error detection ──
        // Listen for fatal video errors from the embedded player's <video> element.
        // These correspond to Chrome's FFmpegDemuxer errors (data source read failures).
        const onVideoError = () => {
          const err = player.video.error;
          if (err && err.code !== 1) {
            console.error('VdoCipher player video error:', err.code, err.message);
            setVdoPlayerError(true);
          }
        };
        // Also detect prolonged stalls (waiting > 20s) that VdoCipher doesn't recover from
        let vdoStallTimer = null;
        const onVdoWaiting = () => {
          if (vdoStallTimer) clearTimeout(vdoStallTimer);
          vdoStallTimer = setTimeout(() => {
            // If still not playing after 20s, flag as error
            if (player.video && !player.video.paused && player.video.readyState < 3) {
              console.warn('VdoCipher prolonged stall detected (20s), showing recovery overlay');
              setVdoPlayerError(true);
            }
          }, 20000);
        };
        const onVdoPlaying = () => {
          if (vdoStallTimer) { clearTimeout(vdoStallTimer); vdoStallTimer = null; }
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
  }, [classId, data?.class?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── VdoCipher network recovery ──
  // When the device comes back online and the VdoCipher player was in an error state,
  // re-fetch class data to get a fresh OTP/playbackInfo and reload the iframe.
  useEffect(() => {
    const classData = dataRef.current?.class;
    const videoSource = getClassVideoSource(
      dataRef.current?.course?.type,
      classData?.videoSource,
    );
    // Only relevant for VdoCipher classes
    if (videoSource === "s3") return;

    const handleOnline = () => {
      if (!vdoPlayerError) return;
      console.log('Network restored — reloading VdoCipher class data for fresh OTP');
      setVdoPlayerError(false);
      // Re-fetch class data to get fresh OTP/playbackInfo
      api.get(`/courses/class/${classId}`)
        .then(res => {
          setData(res.data);
          setProgressState(res.data.progress || null);
        })
        .catch(err => {
          console.error('Failed to reload class data after network recovery:', err);
        });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [classId, vdoPlayerError]);

  // ── VdoCipher manual reload handler ──
  const handleVdoReload = useCallback(async () => {
    setVdoPlayerError(false);
    try {
      const res = await api.get(`/courses/class/${classId}`);
      setData(res.data);
      setProgressState(res.data.progress || null);
    } catch (err) {
      console.error('Failed to reload class data:', err);
      toast.error("Reload failed", "Could not reload the video. Please try again.");
    }
  }, [classId]);

  // ── Loading State ──
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-24 shimmer rounded-xl" />
        <div className="h-6 w-64 shimmer rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="aspect-video shimmer rounded-2xl" />
            <div className="h-32 shimmer rounded-2xl" />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="h-64 shimmer rounded-2xl" />
            <div className="h-48 shimmer rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center max-w-sm"
        >
          {loadError.isTimeout ? (
            <Clock className="w-12 h-12 text-amber-400" />
          ) : navigator.onLine ? (
            <RefreshCw className="w-12 h-12 text-danger" />
          ) : (
            <WifiOff className="w-12 h-12 text-danger" />
          )}
          <p className="text-text-secondary text-sm">{loadError.message}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => loadClass()}
              className="btn-primary text-xs uppercase tracking-wider flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
            <button
              type="button"
              onClick={() => navigate("/courses")}
              className="btn-secondary text-xs uppercase tracking-wider flex items-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Courses
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-text-muted text-sm">
        Unable to load this class right now.
      </div>
    );
  }

  const { chapter, class: cls, course } = data;
  const isS3Video = getClassVideoSource(course?.type, cls?.videoSource) === "s3";
  const videoUrl = getVdoCipherEmbedUrl(cls.vdoCipher) || getBunnyEmbedUrl(cls.videoId);
  const classProgress = progressState?.classProgress || data.progress?.classProgress;
  const learningProgress = progressState?.learningProgress || data.progress?.learningProgress;
  const classProgressPercent = classProgress?.progressPercent || 0;
  const isClassCompleted = Boolean(classProgress?.completed) || classProgressPercent >= 100;
  const courseCompletionPercent = learningProgress?.completionPercent || 0;
  const watchedClasses = learningProgress?.watchedClasses || 0;
  const completedClasses = learningProgress?.completedClasses || 0;
  const totalClasses = learningProgress?.totalClasses || 0;

  const syncLabel = isClassCompleted ? "Completed" : syncState === "saved" ? "Synced" : syncState === "saving" ? "Saving..." : syncState === "watching" ? "Watching" : syncState === "error" ? "Sync failed" : "Ready";
  const syncColor = isClassCompleted || syncState === "saved" ? "text-success border-success/20 bg-success/8" : syncState === "saving" || syncState === "watching" ? "text-brand-mint border-brand-mint/20 bg-brand-mint/8" : syncState === "error" ? "text-danger border-danger/20 bg-danger/8" : "text-text-muted border-white/[0.06] bg-white/[0.03]";

  return (
    <div className="space-y-6">

      {/* ── Back Button ── */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        type="button"
        onClick={() => navigate(-1)}
        className="btn-secondary text-xs uppercase tracking-wider"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </motion.button>

      {/* ── Title Area ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <div className="flex flex-wrap gap-2 items-center">
          <span className="rounded-lg border border-brand-mint/20 bg-brand-mint/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-mint">
            {course.name}
          </span>
          <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            {chapter.title}
          </span>
          {isClassCompleted ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-success/20 bg-success/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
              <CheckCircle2 className="w-3 h-3" />
              Completed
            </span>
          ) : classProgressPercent > 0 ? (
            <span className="rounded-lg border border-info/20 bg-info/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-info">
              Continue watching
            </span>
          ) : null}
        </div>

        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-tight">
          {cls.title}
        </h1>
      </motion.div>

      {/* ═══ TWO-COLUMN LAYOUT ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">

        {/* ── LEFT: Video + Description ── */}
        <div className="lg:col-span-8 space-y-5 flex flex-col">

          {/* Video Player Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl overflow-hidden border border-border-default bg-bg-card relative flex flex-col"
          >
            <div className="gradient-line-top" />

            {/* Status bar */}
            <div className="flex items-center justify-between gap-4 border-b border-border-default px-5 py-3 bg-bg-surface/40">
              <span className="text-xs font-semibold text-text-secondary">
                {isClassCompleted ? "Rewatch this class" : classProgressPercent > 0 ? "Continue watching" : "Start streaming"}
              </span>
              <span className={`text-[10px] font-bold tracking-wide rounded-md border px-2 py-0.5 ${syncColor}`}>
                {syncLabel}
              </span>
            </div>

            {/* Video frame */}
            <div className="relative aspect-video bg-black/90 overflow-hidden w-full">
              {!isS3Video && <VideoWatermark user={user} />}
              {isS3Video ? (
                videoData?.playbackUrl ? (
                  <VideoPlayer 
                    src={videoData.playbackUrl} 
                    refreshUrl={refreshPlaybackUrl}
                    watermarkData={videoData.watermarkData} 
                    initialTime={Number(data?.progress?.classProgress?.lastPositionSeconds || 0)}
                    onProgress={({ currentTime, duration }) => {
                      const s3State = s3ProgressRef.current;
                      const now = Date.now();
                      const isEnding = duration > 0 && currentTime >= duration - 2;

                      // ── Accumulate real elapsed play time ──
                      // Each tick, add the real wall-clock delta since last tick
                      // (only if we have a valid previous tick — skip the first call)
                      if (s3State.lastTickTime > 0) {
                        const deltaMs = now - s3State.lastTickTime;
                        // Clamp to max 2s to avoid huge jumps from tab-switch or resume
                        if (deltaMs > 0 && deltaMs < 2000) {
                          s3State.sessionElapsed += deltaMs / 1000;
                        }
                      }
                      s3State.lastTickTime = now;

                      // Throttle: only save every 15 seconds, or at end
                      const shouldSave = (now - s3State.lastSaveTime > 15000) || isEnding;

                      // Skip duplicate end-of-video saves
                      if (isEnding && s3State.lastCurrentTime === currentTime) return;

                      // Don't fire if a save is already in-flight
                      if (!shouldSave || s3State.saveInFlight) return;

                      s3State.lastSaveTime = now;
                      s3State.lastCurrentTime = currentTime;
                      s3State.saveInFlight = true;

                      const savedBase = savedProgressBaseRef.current;
                      const snapshot = {
                        completed: isEnding,
                        currentTimeSeconds: Math.round(currentTime),
                        durationSeconds: Math.round(duration),
                        // Covered = unique seconds reached — never decreases
                        totalCoveredSeconds: Math.round(Math.max(
                          savedBase.coveredSeconds || 0,
                          (savedBase.coveredSeconds || 0) + currentTime
                        )),
                        // Played = actual wall-clock seconds spent watching this session
                        totalPlayedSeconds: Math.round(
                          (savedBase.watchedSeconds || 0) + s3State.sessionElapsed
                        ),
                      };

                      // Also keep latestSnapshotRef updated for page-hide flush
                      latestSnapshotRef.current = snapshot;

                      setSyncState("saving");
                      api.post(`/courses/class/${classId}/progress`, snapshot)
                        .then(res => {
                          setProgressState(res.data);
                          setSyncState("saved");
                        })
                        .catch(() => setSyncState("error"))
                        .finally(() => { s3State.saveInFlight = false; });
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
                  {/* VdoCipher error recovery overlay */}
                  {vdoPlayerError && (
                    <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center text-white p-6">
                      <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center text-warning mb-4">
                        <WifiOff className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">Video Stream Interrupted</h3>
                      <p className="text-sm text-white/60 text-center max-w-sm mb-5">
                        The video stream was interrupted, likely due to a network issue. Reloading will fetch a fresh video session.
                      </p>
                      <button
                        onClick={handleVdoReload}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-mint text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-brand-mint/90 transition-all active:scale-[0.97]"
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

            {/* Progress bar below video */}
            <div className="h-1 w-full bg-white/[0.04]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${classProgressPercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`h-full ${isClassCompleted ? "bg-gradient-to-r from-success to-brand-mint" : "bg-gradient-to-r from-brand-mint to-brand-yellow"}`}
              />
            </div>
          </motion.div>

          {/* About Card */}
          <div className="rounded-2xl border border-border-default bg-bg-card p-6 relative overflow-hidden">
            <div className="mb-4 flex items-center gap-3 border-b border-border-default pb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-mint/8 border border-brand-mint/15 text-brand-mint">
                <PlayCircle className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-heading font-bold text-white">About This Class</h2>
            </div>
            <p className="text-text-muted text-sm font-medium leading-relaxed">
              {cls.description || "No description provided for this class."}
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2 text-xs font-semibold text-text-secondary">
              <Clock className="w-3.5 h-3.5 text-brand-mint" />
              Duration: {formatDuration(cls.duration)}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Progress + Exercises ── */}
        <div className="lg:col-span-4 space-y-5 flex flex-col w-full">

          {/* Progress Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border-default bg-bg-card p-6 relative overflow-hidden"
          >
            <div className="gradient-line-top" />

            <div className="mb-5 flex items-start justify-between gap-4 border-b border-border-default pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Learning Progress</p>
                <h2 className="mt-1 text-base font-heading font-bold text-white">Your Stats</h2>
              </div>
              <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${syncColor}`}>
                {syncLabel}
              </span>
            </div>

            <div className="space-y-4 w-full">
              {/* This class progress */}
              <div className={`rounded-xl border p-4 ${isClassCompleted ? "border-success/15 bg-success/5" : "border-white/[0.04] bg-white/[0.02]"}`}>
                <div className="mb-2.5 flex items-center justify-between text-xs font-medium text-text-secondary">
                  <span className="inline-flex items-center gap-1.5">
                    {isClassCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
                    This Lesson
                  </span>
                  <span className="font-bold text-white">{classProgressPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${classProgressPercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${isClassCompleted ? "bg-gradient-to-r from-success to-brand-mint" : "bg-gradient-to-r from-brand-mint to-brand-yellow"}`}
                  />
                </div>
              </div>

              {/* Course progress */}
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
                <div className="mb-2.5 flex items-center justify-between text-xs font-medium text-text-secondary">
                  <span>Course Completion</span>
                  <span className="font-bold text-white">{courseCompletionPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${courseCompletionPercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    className="h-full rounded-full bg-gradient-to-r from-brand-mint to-brand-yellow"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
                  <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-text-muted">
                    {watchedClasses} / {totalClasses} started
                  </span>
                  <span className="rounded-md border border-success/20 bg-success/5 px-2 py-1 text-success">
                    {completedClasses} / {totalClasses} done
                  </span>
                  {learningProgress?.averageWatchTime && (
                    <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-text-muted">
                      Avg: {learningProgress.averageWatchTime}
                    </span>
                  )}
                  {learningProgress?.streak && (
                    <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-text-muted">
                      🔥 {learningProgress.streak}d streak
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Exercises Card */}
          <div className="rounded-2xl border border-border-default bg-bg-card p-6 relative overflow-hidden">
            <div className="mb-4 flex items-center gap-3 border-b border-border-default pb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-mint/8 border border-brand-mint/15 text-brand-mint">
                <FileText className="w-4 h-4" />
              </span>
              <h2 className="text-base font-heading font-bold text-white">Resources</h2>
            </div>

            {cls.exercises?.length === 0 ? (
              <p className="text-xs font-medium text-text-muted py-2 text-center">
                No resources attached to this lesson.
              </p>
            ) : (
              <div className="space-y-3 w-full">
                {cls.exercises.map((exercise) => (
                  <div
                    key={exercise._id || exercise.title}
                    className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5 transition-all duration-200 hover:border-brand-mint/20 hover:bg-white/[0.04] group"
                  >
                    <div
                      className="min-w-0 pr-2 cursor-pointer flex-1"
                      onClick={() => setPreviewResource(exercise)}
                    >
                      <h3 className="text-white font-semibold text-sm truncate leading-snug group-hover:text-brand-mint transition-colors">
                        {exercise.title || "Resource File"}
                      </h3>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mt-0.5">
                        {exercise.type || "file"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* VIEW BUTTON */}
                      <button
                        type="button"
                        onClick={() => setPreviewResource(exercise)}
                        className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-brand-mint/20 text-white/80 hover:text-brand-mint border border-white/10 hover:border-brand-mint/30 flex items-center gap-1.5 text-xs font-semibold transition-all"
                        title="View File"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-mint" />
                        <span className="hidden sm:inline">View</span>
                      </button>

                      {/* DOWNLOAD BUTTON */}
                      <a
                        href={getUploadUrl(exercise.file)}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="h-8 px-2.5 rounded-lg bg-brand-mint/10 hover:bg-brand-mint/25 text-brand-mint border border-brand-mint/20 hover:border-brand-mint/40 flex items-center gap-1.5 text-xs font-semibold transition-all"
                        title="Download File"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RESOURCE FILE PREVIEW MODAL ── */}
      {previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 transition-all duration-300">
          <div className="relative flex flex-col w-full max-w-5xl h-[88vh] bg-[#0c1825] border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
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
                {/* Download Button */}
                <a
                  href={getUploadUrl(previewResource.file)}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-mint text-bg-dark hover:bg-brand-mint/90 font-bold text-xs shadow-md transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setPreviewResource(null)}
                  className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-all border border-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="flex-1 bg-[#07111c] relative flex items-center justify-center p-2 overflow-hidden">
              {previewResource.type?.toLowerCase() === "pdf" ||
              (previewResource.file && String(previewResource.file).toLowerCase().includes(".pdf")) ? (
                <iframe
                  src={`${getUploadUrl(previewResource.file)}#toolbar=1&navpanes=0`}
                  className="w-full h-full rounded-xl border-0 bg-white"
                  title={previewResource.title || "PDF Preview"}
                />
              ) : previewResource.type?.toLowerCase() === "image" ||
                /\.(png|jpe?g|webp|gif|svg)/i.test(String(previewResource.file || "")) ? (
                <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                  <img
                    src={getUploadUrl(previewResource.file)}
                    alt={previewResource.title}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10"
                  />
                </div>
              ) : (
                <div className="text-center p-8 space-y-4 max-w-md">
                  <FileText className="w-14 h-14 text-brand-mint/50 mx-auto" />
                  <p className="text-white/80 text-sm font-medium">
                    Direct inline view is not supported for this file format, but you can download or open it in a new window.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <a
                      href={getUploadUrl(previewResource.file)}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-mint text-bg-dark font-bold text-xs shadow-lg hover:bg-brand-mint/90 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Download File
                    </a>
                  </div>
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
