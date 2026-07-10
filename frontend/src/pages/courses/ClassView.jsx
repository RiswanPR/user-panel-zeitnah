import { useEffect, useRef, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  PlayCircle,
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

function loadVdoCipherApi() {
  if (window.VdoPlayer) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-vdocipher-api="true"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
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
  const [videoData, setVideoData] = useState(null);
  const [progressState, setProgressState] = useState(null);
  const [syncState, setSyncState] = useState("idle");

  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const saveInFlightRef = useRef(false);
  const lastSyncedRef = useRef({ currentTime: 0, duration: 0, totalCovered: 0, totalPlayed: 0 });
  const latestSnapshotRef = useRef(null);
  const savedProgressBaseRef = useRef({ coveredSeconds: 0, watchedSeconds: 0 });

  // ── Load class data ──
  useEffect(() => {
    let mounted = true;
    const loadClass = async () => {
      try {
        setLoading(true);
        setVideoData(null);
        const res = await api.get(`/courses/class/${classId}`);
        if (mounted) {
          setData(res.data);
          setProgressState(res.data.progress || null);
          const videoSource = getClassVideoSource(
            res.data.course?.type,
            res.data.class?.videoSource,
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
        }
      } catch (error) {
        alert(error.response?.data?.message || "Failed to load class.");
        navigate("/courses");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadClass();
    return () => { mounted = false; };
  }, [classId, navigate]);

  // ── Stream security heartbeat ──
  useEffect(() => {
    if (!classId) return;
    let heartbeatInterval;
    const initializeStream = async () => {
      try {
        const { getPersistentDeviceId, getBrowserFingerprint } = await import('../../utils/deviceFingerprint');
        const deviceId = await getPersistentDeviceId();
        const browserFingerprint = JSON.stringify(getBrowserFingerprint());
        await api.post("/courses/start-stream", { classId, deviceId, browserFingerprint });
        
        heartbeatInterval = setInterval(async () => {
          try { await api.post("/courses/heartbeat", { deviceId }); } catch (err) { console.log(err); }
        }, 25000); // Heartbeat every 25 seconds
      } catch (error) {
        alert(error.response?.data?.message || "Another device is currently watching this course.");
        navigate(-1);
      }
    };
    initializeStream();
    
    const stopStream = async () => {
      try { 
        const { getPersistentDeviceId } = await import('../../utils/deviceFingerprint');
        const deviceId = await getPersistentDeviceId(); 
        await api.post("/courses/stop-stream", { deviceId }); 
      } catch (error) { console.log(error); }
    };
    
    const handleUnload = async () => {
      const { getPersistentDeviceId } = await import('../../utils/deviceFingerprint');
      const deviceId = await getPersistentDeviceId();
      const baseUrl = api.defaults.baseURL || window.location.origin + "/api";
      navigator.sendBeacon(`${baseUrl}/courses/stop-stream`, new Blob([JSON.stringify({ deviceId })], { type: "application/json" }));
    };
    
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      stopStream();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [classId, navigate]);

  // ── Initialize progress refs ──
  useEffect(() => {
    const initial = data?.progress?.classProgress;
    lastSyncedRef.current = { currentTime: initial?.lastPositionSeconds || 0, duration: initial?.durationSeconds || 0, totalCovered: initial?.coveredSeconds || 0, totalPlayed: initial?.watchedSeconds || 0 };
    savedProgressBaseRef.current = { coveredSeconds: initial?.coveredSeconds || 0, watchedSeconds: initial?.watchedSeconds || 0 };
    latestSnapshotRef.current = initial ? { completed: Boolean(initial.completed), currentTimeSeconds: initial.lastPositionSeconds || 0, durationSeconds: initial.durationSeconds || 0, totalCoveredSeconds: initial.coveredSeconds || 0, totalPlayedSeconds: initial.watchedSeconds || 0 } : null;
  }, [data]);

  // ── VdoCipher player setup ──
  useEffect(() => {
    const classData = data?.class;
    const videoSource = getClassVideoSource(
      data?.course?.type,
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
      if (!playerRef.current || saveInFlightRef.current) return;
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
          const resumeAt = Number(data?.progress?.classProgress?.lastPositionSeconds);
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
          const token = localStorage.getItem("token");
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
      void persistProgress({ force: true });
      cleanup();
      playerRef.current = null;
    };
  }, [classId, data]);

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
                    watermarkData={videoData.watermarkData} 
                    initialTime={Number(data?.progress?.classProgress?.lastPositionSeconds || 0)}
                    onProgress={({ currentTime, duration }) => {
                      const state = latestSnapshotRef.current || { lastSaveTime: 0, lastCurrentTime: 0 };
                      const now = Date.now();
                      const isEnding = duration > 0 && currentTime >= duration - 2;
                      const shouldSave = (now - (state.lastSaveTime || 0) > 15000) || isEnding;

                      if (isEnding && state.lastCurrentTime === currentTime) return;

                      if (shouldSave) {
                        const newState = { ...state, lastSaveTime: now, lastCurrentTime: currentTime };
                        latestSnapshotRef.current = newState;

                        const snapshot = {
                          completed: isEnding,
                          currentTimeSeconds: Math.round(currentTime),
                          durationSeconds: Math.round(duration),
                          totalCoveredSeconds: Math.round((savedProgressBaseRef.current?.coveredSeconds || 0) + currentTime),
                          totalPlayedSeconds: Math.round((savedProgressBaseRef.current?.watchedSeconds || 0) + currentTime)
                        };

                        setSyncState("saving");
                        api.post(`/courses/class/${classId}/progress`, snapshot)
                          .then(res => {
                            setProgressState(res.data);
                            setSyncState("saved");
                          })
                          .catch(() => setSyncState("error"));
                      }
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
                <iframe
                  ref={iframeRef}
                  src={videoUrl}
                  className="h-full w-full block border-0"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  title={cls.title}
                />
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
                  <a
                    key={exercise._id}
                    href={getUploadUrl(exercise.file)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5 transition-all duration-200 hover:border-brand-mint/20 hover:bg-white/[0.04] group"
                  >
                    <div className="min-w-0 pr-2">
                      <h3 className="text-white font-semibold text-sm truncate leading-snug group-hover:text-brand-mint transition-colors">
                        {exercise.title}
                      </h3>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mt-0.5">
                        {exercise.type}
                      </p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-brand-mint group-hover:text-white group-hover:bg-brand-mint group-hover:border-brand-mint transition-all shrink-0">
                      <Download className="w-3.5 h-3.5" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClassView;
