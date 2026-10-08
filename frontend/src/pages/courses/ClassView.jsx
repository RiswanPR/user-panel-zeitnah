import React, { Component, useEffect, useRef, useState, useContext, useCallback, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  WifiOff,
  Clock,
  AlertTriangle,
  Send,
  Loader2,
  X,
  Keyboard,
  List,
  Sparkles,
  BookOpen,
} from "lucide-react";
import api, { getRefreshedToken } from "../../services/api";
import {
  formatDuration,
  getBunnyEmbedUrl,
  getClassVideoSource,
  getUploadUrl,
  getVdoCipherEmbedUrl,
} from "../../utils/courseUi";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import storage, { getDeviceId, getBrowserFingerprint } from "../../services/storage";
import { getErrorBuffer, getBrowserInfo } from "../../utils/errorCapture";
import {
  runPwaVideoDiagnostics,
  recordOtpStatus,
  recordVdoError,
} from "../../utils/pwaVideoDiagnostics";

// Modular Classroom Components
import LearningHeader from "../../components/classroom/LearningHeader";
import VideoStage from "../../components/classroom/VideoStage";
import CurriculumSidebar, { CurriculumDrawer } from "../../components/classroom/CurriculumSidebar";
import LessonTabs from "../../components/classroom/LessonTabs";
import LessonNavigation from "../../components/classroom/LessonNavigation";
import ChapterCompleteModal from "../../components/classroom/ChapterCompleteModal";
import KeyboardShortcutsModal from "../../components/classroom/KeyboardShortcutsModal";
import ResourcePreviewModal from "../../components/classroom/ResourcePreviewModal";
import useCourseCurriculum from "../../hooks/useCourseCurriculum";

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

/**
 * Ultra-Premium Classroom Recovery Card
 * Replaces generic error boundary screens with a private luxury learning recovery state.
 */
function ClassroomRecoveryCard({
  title,
  message,
  onRetry,
  onBack,
  onReport,
  isTimeout,
}) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-lg rounded-3xl border border-white/[0.08] bg-bg-card/90 backdrop-blur-xl p-8 sm:p-10 text-center shadow-2xl relative overflow-hidden"
      >
        {/* Subtle ambient lighting */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-brand-mint/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-5 text-brand-mint shadow-inner">
          {isTimeout ? (
            <Clock className="w-7 h-7 text-brand-yellow" />
          ) : (
            <Sparkles className="w-7 h-7 text-brand-mint" />
          )}
        </div>

        <div className="space-y-2 mb-8">
          <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
            {title || "Something interrupted your lesson"}
          </h2>
          <p className="text-xs sm:text-sm text-text-muted max-w-sm mx-auto leading-relaxed">
            {message || "We couldn't load this learning session. Please try again or return to your course syllabus."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-mint text-bg-base font-bold text-xs uppercase tracking-wider hover:bg-brand-mint/90 transition-all cursor-pointer shadow-lg shadow-brand-mint/10 focus-ring"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          )}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer focus-ring"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Course Syllabus
            </button>
          )}
        </div>

        {onReport && (
          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onReport}
              className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-brand-yellow/80" />
              <span>Report playback issue</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

class ClassViewErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ClassView ErrorBoundary Caught]:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-base text-white flex flex-col">
          <ClassroomRecoveryCard
            title="Something interrupted your lesson"
            message="We couldn't initialize this learning session. Click below to reload your workspace."
            onRetry={() => window.location.reload()}
            onBack={() => (window.location.href = "/courses")}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

function ClassView() {
  const params = useParams();
  const { classId: routeClassId, chapter_id, chapterId, chapterCode, courseId: routeCourseId } = params;
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const toast = useToast();

  // Authoritative active class ID state
  const [activeClassId, setActiveClassId] = useState(routeClassId || null);

  // Loading & Data State
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [data, setData] = useState(null);
  const [courseChapters, setCourseChapters] = useState([]);
  const [chapterClasses, setChapterClasses] = useState([]);
  const [videoData, setVideoData] = useState(null);
  const [progressState, setProgressState] = useState(null);
  const [syncState, setSyncState] = useState("idle"); // "idle" | "saving" | "saved" | "watching" | "error"
  const [vdoPlayerError, setVdoPlayerError] = useState(false);

  // UI & Workspace State
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [previewResource, setPreviewResource] = useState(null);
  const [chapterCompleteModalOpen, setChapterCompleteModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);

  // Autoplay preference (User controlled, persisted locally, defaults to false)
  const [autoPlayNext, setAutoPlayNext] = useState(() => {
    try {
      return localStorage.getItem("zeitnah_autoplay_next") === "true";
    } catch {
      return false;
    }
  });

  // PWA Video Diagnostic Telemetry Probe on mount
  useEffect(() => {
    void runPwaVideoDiagnostics();
  }, []);

  const handleToggleAutoPlay = (val) => {
    setAutoPlayNext(val);
    try {
      localStorage.setItem("zeitnah_autoplay_next", String(val));
    } catch {
      // Ignore localStorage error
    }
  };

  // Playback & Progress Refs
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
    maxCoveredSeconds: 0,
    hasTriggeredCompletionModal: false,
  });
  const dataRef = useRef(null);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Keep routeClassId synchronized if navigation occurs
  useEffect(() => {
    if (routeClassId && routeClassId !== activeClassId) {
      setActiveClassId(routeClassId);
    }
  }, [routeClassId]);

  // ══════════════════════════════════════════════════════════
  // CANONICAL IDENTIFIER RESOLUTION (/course/:chapter_id)
  // Resolves chapter context to authoritative class ID safely
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    const targetChapter = chapter_id || chapterId || chapterCode;
    if (!routeClassId && targetChapter) {
      let isMounted = true;
      setLoading(true);
      setLoadError(null);

      api
        .get(`/courses/chapter/${targetChapter}`)
        .then((res) => {
          if (!isMounted) return;
          const classes = res.data?.classes || [];
          if (classes.length > 0) {
            // Pick first uncompleted class, or fallback to first class
            const firstUncompleted = classes.find((c) => !c.completed && !c.locked) || classes[0];
            setActiveClassId(firstUncompleted._id || firstUncompleted.id);
          } else {
            setLoadError({
              message: "No lessons found in this chapter.",
              isTimeout: false,
            });
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          const isTimeout = err?.isTimeout || err?.code === "ECONNABORTED";
          setLoadError({
            message: isTimeout
              ? "The server is taking too long to respond. Please try again."
              : err?.response?.data?.message || err?.friendlyMessage || "Could not load chapter workspace.",
            isTimeout,
          });
          setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [chapter_id, chapterId, chapterCode, routeClassId]);

  // ══════════════════════════════════════════════════════════
  // AUTHORITATIVE LOADING PIPELINE (Fixes VR-001 & VR-002)
  // Single authoritative loader with safe parallel execution
  // ══════════════════════════════════════════════════════════
  const loadWorkspace = useCallback(async (targetId) => {
    if (!targetId) return;
    try {
      setLoading(true);
      setLoadError(null);
      setVideoData(null);
      s3ProgressRef.current.hasTriggeredCompletionModal = false;

      // 1. Authoritative Class Details
      const classRes = await api.get(`/courses/class/${targetId}`);
      const classPayload = classRes.data;
      setData(classPayload);
      dataRef.current = classPayload;
      setProgressState(classPayload.progress || null);

      const courseId = classPayload.course?._id;
      const chCode = classPayload.chapter?.uniqueCode;
      const videoSource = getClassVideoSource(
        classPayload.course?.type,
        classPayload.class?.videoSource
      );

      // Diagnostic: Record OTP/playbackInfo fetch metadata without logging secrets
      recordOtpStatus({
        status: classRes.status,
        hasOtp: Boolean(classPayload.class?.vdoCipher?.otp),
        hasPlaybackInfo: Boolean(classPayload.class?.vdoCipher?.playbackInfo),
        videoSource,
      });

      // 2. Parallelize Safe Background Requests (VR-002)
      const parallelRequests = [];

      // A: S3 Video Playback URL (Concurrent)
      if (videoSource === "s3") {
        parallelRequests.push(
          api
            .get(`/courses/video/${targetId}`)
            .then((vRes) => setVideoData(vRes.data))
            .catch((vErr) => {
              console.warn("Failed to load S3 video stream:", vErr);
              setVideoData({ error: true });
            })
        );
      }

      // B: Full Course Curriculum (All Chapters & Classes for Persistent Sidebar)
      if (courseId) {
        parallelRequests.push(
          api
            .get(`/courses/${courseId}/chapters`)
            .then((cRes) => {
              const chaptersList = cRes.data?.course?.chapters || cRes.data?.chapters || [];
              setCourseChapters(chaptersList);
            })
            .catch((cErr) => console.warn("Could not load course curriculum:", cErr))
        );
      }

      // C: Sibling Chapter Classes (For rapid Prev/Next traversal)
      if (courseId && chCode) {
        parallelRequests.push(
          api
            .get(`/courses/${courseId}/chapters/${chCode}/classes`)
            .then((sRes) => setChapterClasses(sRes.data?.classes || []))
            .catch((sErr) => console.warn("Could not load sibling chapter classes:", sErr))
        );
      }

      await Promise.allSettled(parallelRequests);
    } catch (error) {
      const isTimeout = error?.isTimeout || error?.code === "ECONNABORTED";
      setLoadError({
        message: isTimeout
          ? "The server is taking too long to respond. Please try again."
          : error?.response?.data?.message ||
            error?.friendlyMessage ||
            "Could not load class content. Please try again.",
        isTimeout,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Single authoritative trigger for activeClassId changes (VR-001 resolved)
  useEffect(() => {
    if (activeClassId) {
      void loadWorkspace(activeClassId);
    }
  }, [activeClassId, loadWorkspace]);

  // S3 playback URL refresh callback
  const refreshPlaybackUrl = useCallback(async () => {
    if (!activeClassId) return null;
    try {
      const videoRes = await api.get(`/courses/video/${activeClassId}`);
      if (videoRes.data?.playbackUrl) {
        setVideoData(videoRes.data);
        return videoRes.data.playbackUrl;
      }
      return null;
    } catch (err) {
      console.error("Failed to refresh playback URL:", err);
      throw err;
    }
  }, [activeClassId]);

  // ══════════════════════════════════════════════════════════
  // STREAM SECURITY & CANONICAL 25-SECOND HEARTBEAT
  // Single-device stream lock with recovery (PRESERVED 100%)
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!activeClassId) return;
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
        await api.post("/courses/heartbeat", { deviceId: devId, classId: activeClassId });
      } catch (err) {
        if (!isMounted) return;
        const status = err?.response?.status;
        const errorMsg = err?.response?.data?.message || err?.message || "";
        console.warn(`[Heartbeat] Heartbeat returned status ${status}:`, errorMsg);
        stopHeartbeat();

        if (status === 401) {
          if (isRecovering) return;
          isRecovering = true;
          console.warn("[Heartbeat] Stream expired (401). Attempting stream re-initialization...");

          try {
            const browserFingerprint = JSON.stringify(getBrowserFingerprint());
            await api.post("/courses/start-stream", {
              classId: activeClassId,
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
            const recoveryMsg = recoveryErr?.response?.data?.message || recoveryErr?.message || "";
            if (recoveryStatus === 403 && recoveryMsg.toLowerCase().includes("device")) {
              toast.error("Playback restricted", "Another device may be currently watching this course.");
              navigate(-1);
            } else if (recoveryStatus === 401) {
              toast.error("Session expired", "Please log in again to continue.");
            }
          }
        } else if (status === 403) {
          if (errorMsg.toLowerCase().includes("device")) {
            toast.error("Playback restricted", "Another device may be currently watching this course.");
            navigate(-1);
          } else if (
            errorMsg.toLowerCase().includes("purchase") ||
            errorMsg.toLowerCase().includes("enrolled")
          ) {
            toast.error("Access Restricted", "Please purchase or enroll in this course to access this class.");
            navigate(-1);
          } else {
            toast.error("Access Denied", errorMsg || "Playback not permitted.");
          }
        }
      }
    };

    const startHeartbeat = (devId) => {
      stopHeartbeat();
      heartbeatInterval = setInterval(() => {
        if (isMounted) {
          void sendHeartbeat(devId);
        }
      }, 25000); // Canonical 25-second heartbeat interval preserved
    };

    const initializeStream = async () => {
      try {
        const deviceId = await getDeviceId();
        cachedDeviceId = deviceId;
        const browserFingerprint = JSON.stringify(getBrowserFingerprint());
        await api.post("/courses/start-stream", {
          classId: activeClassId,
          deviceId,
          browserFingerprint,
        });

        if (isMounted) {
          startHeartbeat(deviceId);
        }
      } catch (error) {
        if (!isMounted) return;
        const status = error?.response?.status;
        const errorMsg = error?.response?.data?.message || error?.message || "";
        console.error("[Stream] start-stream failed:", error);
        if (status === 403 && errorMsg.toLowerCase().includes("device")) {
          toast.error("Playback restricted", "Another device may be currently watching this course.");
          navigate(-1);
        } else if (
          status === 403 &&
          (errorMsg.toLowerCase().includes("purchase") ||
            errorMsg.toLowerCase().includes("enrolled"))
        ) {
          toast.error("Access Restricted", "Please purchase or enroll in this course to access this class.");
          navigate(-1);
        } else if (status === 401) {
          toast.error("Session expired", "Please log in again to continue.");
        }
      }
    };

    void initializeStream();

    const stopStream = async () => {
      try {
        const deviceId = cachedDeviceId || (await getDeviceId());
        const currentUser = userRef.current;
        const userId = currentUser?.userId || currentUser?._id || currentUser?.id;
        if (deviceId && userId) {
          await api.post("/courses/stop-stream", { deviceId, userId, classId: activeClassId });
        }
      } catch (error) {
        console.warn("[Stream] stop-stream error:", error);
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
          new Blob([JSON.stringify({ deviceId, userId, classId: activeClassId })], {
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
  }, [activeClassId, navigate, toast]);

  // ══════════════════════════════════════════════════════════
  // PROGRESS REFS SYNCHRONIZATION
  // ══════════════════════════════════════════════════════════
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
    s3ProgressRef.current.maxCoveredSeconds = initial?.coveredSeconds || 0;
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

  // ══════════════════════════════════════════════════════════
  // VDOCIPHER PLAYER LIFECYCLE (Preserved with token guard)
  // ══════════════════════════════════════════════════════════
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
      if (cancelled || !playerRef.current || saveInFlightRef.current || !activeClassId) return;
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
          `/courses/class/${activeClassId}/progress`,
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
        console.warn("[VdoCipher] Progress save error:", error);
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
          ) {
            player.video.currentTime = resumeAt;
          }
          void persistProgress({ force: true });
        };
        const onTimeUpdate = () => {
          setCurrentVideoTime(player.video.currentTime || 0);
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
        const progressInterval = window.setInterval(async () => {
          const token = storage.getAccessToken();
          if (token) {
            try {
              const parts = token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                if (payload?.exp && payload.exp * 1000 - Date.now() < 60000) {
                  await getRefreshedToken().catch(() => {});
                }
              }
            } catch {
              // Ignore JWT decode errors
            }
          }
          void persistProgress({ force: true });
        }, 15000);

        const flushLatestProgress = () => {
          const snapshot = latestSnapshotRef.current;
          const token = storage.getAccessToken();
          if (!snapshot || !token || !activeClassId) return;

          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload?.exp && payload.exp * 1000 < Date.now()) {
                // Token already expired; do not send expired token beacon
                return;
              }
            }
          } catch {
            // Proceed
          }

          const baseUrl = api.defaults.baseURL || "https://zeitnahacademy.com/api";
          void fetch(`${baseUrl}/courses/class/${activeClassId}/progress`, {
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
            void persistProgress({ force: true });
          }
        };

        player.video.addEventListener("loadedmetadata", onLoadedMetadata);
        player.video.addEventListener("play", onPlay);
        player.video.addEventListener("timeupdate", onTimeUpdate);
        player.video.addEventListener("pause", onPause);
        player.video.addEventListener("seeked", onSeeked);
        player.video.addEventListener("ended", onEnded);

        const handlePlayerError = (err) => {
          recordVdoError(err);
          const code = err?.code || player?.video?.error?.code;
          const msg = err?.message || player?.video?.error?.message || err?.payload?.message || "";
          console.warn("[VdoCipher] Player error intercepted:", code, msg, err);

          if (code === 60072014 || msg.toLowerCase().includes("domain")) {
            setVdoPlayerError(
              "Domain authorization notice: This domain must be allowed in VdoCipher dashboard settings. Click below to refresh the stream."
            );
          } else if (code === 4 || msg.toLowerCase().includes("drm") || msg.toLowerCase().includes("license") || msg.toLowerCase().includes("protected")) {
            setVdoPlayerError(
              "Protected content could not be verified. If using Incognito/Private mode, please switch to a normal window, or allow Protected Content in Chrome Site Settings."
            );
          } else if (code && code !== 1) {
            setVdoPlayerError(
              "Playback session was interrupted. Click below to fetch a fresh authenticated session."
            );
          }
        };

        const handlePostMessage = (event) => {
          if (event?.origin && event.origin.includes("vdocipher.com")) {
            try {
              const payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
              if (payload && (payload.event === "error" || payload.type === "error" || payload.error)) {
                recordVdoError(payload);
              }
            } catch {}
          }
        };

        player.video.addEventListener("error", handlePlayerError);
        if (player.api && typeof player.api.addEventListener === "function") {
          try {
            player.api.addEventListener("error", handlePlayerError);
          } catch {}
        }
        window.addEventListener("message", handlePostMessage);
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
          player.video.removeEventListener("error", handlePlayerError);
          if (player.api && typeof player.api.removeEventListener === "function") {
            try {
              player.api.removeEventListener("error", handlePlayerError);
            } catch {}
          }
          window.removeEventListener("message", handlePostMessage);
          window.removeEventListener("pagehide", onPageHide);
          document.removeEventListener("visibilitychange", onVisibilityChange);
          void persistProgress({ force: true });
        };
      } catch (error) {
        console.warn("[VdoCipher] setup error:", error);
        setSyncState("error");
      }
    };

    void setupPlayer();
    return () => {
      cancelled = true;
      cleanup();
      playerRef.current = null;
    };
  }, [activeClassId, data?.class?._id]);

  // VdoCipher reload handler
  const handleVdoReload = useCallback(async () => {
    setVdoPlayerError(false);
    if (!activeClassId) return;
    try {
      const res = await api.get(`/courses/class/${activeClassId}`);
      setData(res.data);
      setProgressState(res.data.progress || null);
    } catch (err) {
      console.error("Failed to reload class data:", err);
      toast.error("Reload failed", "Could not reload the video. Please try again.");
    }
  }, [activeClassId, toast]);

  // ══════════════════════════════════════════════════════════
  // DERIVED PROGRESS & COMPLETION METRICS
  // Memoized before hooks to eliminate Temporal Dead Zone (TDZ)
  // ══════════════════════════════════════════════════════════
  const classProgress = useMemo(
    () => progressState?.classProgress || data?.progress?.classProgress || null,
    [progressState?.classProgress, data?.progress?.classProgress]
  );
  const learningProgress = useMemo(
    () => progressState?.learningProgress || data?.progress?.learningProgress || null,
    [progressState?.learningProgress, data?.progress?.learningProgress]
  );
  const classProgressPercent = useMemo(
    () => Math.min(100, Math.max(0, Math.round(classProgress?.progressPercent || 0))),
    [classProgress?.progressPercent]
  );
  const isClassCompleted = useMemo(
    () => Boolean(classProgress?.completed) || classProgressPercent >= 90,
    [classProgress?.completed, classProgressPercent]
  );

  // ══════════════════════════════════════════════════════════
  // UNIFIED AUTHORITATIVE CURRICULUM MODEL (Single Source of Truth)
  // ══════════════════════════════════════════════════════════
  const unifiedCurriculum = useCourseCurriculum({
    course: data?.course,
    rawChapters: courseChapters,
    activeClassId,
    activeChapterClasses: chapterClasses,
    activeClassProgress: classProgress,
    purchased: data?.purchased,
  });

  const unifiedCurriculumRef = useRef(unifiedCurriculum);
  useEffect(() => {
    unifiedCurriculumRef.current = unifiedCurriculum;
  }, [unifiedCurriculum]);

  const {
    prevLesson,
    nextLesson,
    nextChapter,
    isLastLessonInChapter,
    isLastLessonInCourse,
  } = unifiedCurriculum;

  // ══════════════════════════════════════════════════════════
  // S3 HLS PROGRESS & VIDEO COMPLETION (Fixes VR-003 & PERF-001)
  // Double-save race guarded, throttled state updates
  // ══════════════════════════════════════════════════════════
  const handleS3ProgressUpdate = useCallback(
    ({ currentTime, duration }) => {
      setCurrentVideoTime(currentTime);

      const s3State = s3ProgressRef.current;
      const now = Date.now();
      const isEnding = duration > 0 && currentTime >= duration - 2;

      // Track clock delta
      if (s3State.lastTickTime > 0) {
        const deltaMs = now - s3State.lastTickTime;
        if (deltaMs > 0 && deltaMs < 2000) {
          s3State.sessionElapsed += deltaMs / 1000;
        }
      }
      s3State.lastTickTime = now;

      const shouldSave = now - s3State.lastSaveTime > 15000 || isEnding;
      if (isEnding && s3State.lastCurrentTime === currentTime) return;
      if (!shouldSave || s3State.saveInFlight || !activeClassId) return;

      s3State.lastSaveTime = now;
      s3State.lastCurrentTime = currentTime;
      s3State.saveInFlight = true;

      const savedBase = savedProgressBaseRef.current;
      s3State.maxCoveredSeconds = Math.max(
        s3State.maxCoveredSeconds || 0,
        savedBase.coveredSeconds || 0,
        currentTime || 0
      );

      const snapshot = {
        completed: isEnding,
        currentTimeSeconds: Math.round(currentTime),
        durationSeconds: Math.round(duration),
        totalCoveredSeconds: Math.round(s3State.maxCoveredSeconds),
        totalPlayedSeconds: Math.round(
          (savedBase.watchedSeconds || 0) + s3State.sessionElapsed
        ),
      };

      latestSnapshotRef.current = snapshot;
      setSyncState("saving");

      api
        .post(`/courses/class/${activeClassId}/progress`, snapshot)
        .then((res) => {
          setProgressState(res.data);
          setSyncState("saved");

          // Chapter Completion & Autoplay Trigger (Cross-Chapter Enabled)
          if (isEnding && !s3State.hasTriggeredCompletionModal) {
            s3State.hasTriggeredCompletionModal = true;
            const currentCurriculum = unifiedCurriculumRef.current;
            const isLast = currentCurriculum?.isLastLessonInChapter;
            const nextOne = currentCurriculum?.nextLesson;

            if (isLast) {
              setChapterCompleteModalOpen(true);
            } else if (autoPlayNext && nextOne && nextOne.id && !nextOne.locked && !nextOne.isLocked) {
              toast.info("Autoplay", `Loading next lesson: ${nextOne.title}`);
              setTimeout(() => {
                setActiveClassId(nextOne.id);
                navigate(`/courses/class/${nextOne.id}`);
              }, 1500);
            }
          }
        })
        .catch(() => setSyncState("error"))
        .finally(() => {
          s3State.saveInFlight = false;
        });
    },
    [activeClassId, autoPlayNext, navigate, toast]
  );

  // Switch to selected lesson seamlessly
  const handleSelectLesson = (lesson) => {
    if (!lesson) return;
    if (lesson.locked || lesson.isLocked) {
      toast.error("Lesson Locked", "Please complete preceding lessons to unlock this session.");
      return;
    }
    const targetId = lesson._id || lesson.id;
    if (targetId && targetId !== activeClassId) {
      setCurriculumOpen(false);
      setActiveClassId(targetId);
      navigate(`/courses/class/${targetId}`);
    }
  };

  // Chapter completion transition (Unified cross-chapter support)
  const handleContinueToNextChapter = () => {
    setChapterCompleteModalOpen(false);
    if (nextLesson && nextLesson.id && !nextLesson.locked && !nextLesson.isLocked) {
      handleSelectLesson(nextLesson);
      return;
    }
    if (!nextChapter) return;
    if (nextChapter.locked) {
      toast.error("Chapter Locked", "Please complete prior curriculum modules to unlock.");
      return;
    }
    const nextChapterLessons = nextChapter.lessons || nextChapter.classes || [];
    if (nextChapterLessons.length > 0) {
      const firstLesson = nextChapterLessons[0];
      handleSelectLesson(firstLesson);
    } else {
      navigate(`/courses/${data?.course?._id}/chapters`);
    }
  };

  // Keyboard shortcut listener (A11Y-002)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setCurriculumOpen(false);
        setPreviewResource(null);
        setChapterCompleteModalOpen(false);
        setShortcutsModalOpen(false);
        setIssueModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Issue report submission
  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    if (!issueDescription.trim() || !activeClassId) return;
    try {
      setSubmittingIssue(true);
      await api.post("/troubleshoot/report", {
        title: `[Playback Issue] ${data?.class?.title || "Class"}`,
        description: `${issueDescription.trim()} (ClassId: ${activeClassId}, Course: ${data?.course?.name})`,
        severity: "medium",
        browserInfo: getBrowserInfo(),
        errors: getErrorBuffer(),
      });
      toast.success("Report received", "Thank you. Our technical operations team has been notified.");
      setIssueModalOpen(false);
      setIssueDescription("");
    } catch (err) {
      console.error("Failed to submit issue report:", err);
      toast.error("Submission failed", "Could not send report. Please try again.");
    } finally {
      setSubmittingIssue(false);
    }
  };

  // ══════════════════════════════════════════════════════════
  // RENDER STATES (Loading Skeleton & Premium Error States)
  // ══════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base text-white flex flex-col selection:bg-brand-mint/30 selection:text-white pb-20">
        {/* Top Header Skeleton */}
        <header className="sticky top-0 z-30 w-full bg-bg-base/95 backdrop-blur-xl border-b border-white/[0.08]">
          <div className="max-w-[1680px] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/[0.04] shimmer" />
              <div className="h-4 w-36 sm:w-56 rounded-lg bg-white/[0.04] shimmer" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-7 w-20 rounded-full bg-white/[0.04] shimmer" />
              <div className="hidden md:block h-7 w-24 rounded-xl bg-white/[0.04] shimmer" />
              <div className="xl:hidden h-9 w-28 rounded-xl bg-white/[0.04] shimmer" />
            </div>
          </div>
        </header>

        {/* Studio Body Skeleton */}
        <div className="flex-1 max-w-[1680px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-8 space-y-6">
              {/* 16:9 Cinematic Video Player Shimmer */}
              <div className="relative aspect-video w-full rounded-2xl sm:rounded-3xl bg-neutral-950/80 border border-white/[0.08] overflow-hidden shadow-2xl flex items-center justify-center">
                <div className="absolute inset-0 shimmer" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-brand-mint animate-spin" />
                  </div>
                  <span className="text-xs font-mono font-medium text-white/50 tracking-wider">
                    Preparing studio workspace...
                  </span>
                </div>
              </div>

              {/* Lesson Nav Skeleton */}
              <div className="h-28 w-full rounded-2xl sm:rounded-3xl bg-white/[0.02] border border-white/[0.06] p-4 shimmer" />

              {/* Tabs Skeleton */}
              <div className="space-y-4">
                <div className="h-10 w-80 rounded-xl bg-white/[0.03] shimmer" />
                <div className="h-44 w-full rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 shimmer" />
              </div>
            </div>

            {/* Persistent Sidebar Skeleton on Desktop */}
            <div className="hidden xl:block xl:col-span-4 sticky top-20">
              <div className="h-[calc(100vh-6.5rem)] rounded-3xl bg-white/[0.02] border border-white/[0.08] p-5 space-y-4 shimmer overflow-hidden">
                <div className="h-5 w-32 rounded-lg bg-white/[0.05]" />
                <div className="h-4 w-48 rounded-lg bg-white/[0.03]" />
                <div className="h-2 w-full rounded-full bg-white/[0.05] mt-4" />
                <div className="pt-4 space-y-3">
                  <div className="h-16 rounded-2xl bg-white/[0.04]" />
                  <div className="h-16 rounded-2xl bg-white/[0.04]" />
                  <div className="h-16 rounded-2xl bg-white/[0.04]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-bg-base text-white flex flex-col">
        <ClassroomRecoveryCard
          title={loadError.isTimeout ? "Connection Timed Out" : "Something interrupted your lesson"}
          message={loadError.message || "We couldn't load this learning session. Please check your network connection and retry."}
          isTimeout={loadError.isTimeout}
          onRetry={() => activeClassId && loadWorkspace(activeClassId)}
          onBack={() => navigate(data?.course?._id ? `/courses/${data.course._id}/chapters` : "/courses")}
          onReport={() => setIssueModalOpen(true)}
        />
      </div>
    );
  }

  if (!data || !data.class) {
    return (
      <div className="min-h-screen bg-bg-base text-white flex flex-col">
        <ClassroomRecoveryCard
          title="Lesson Not Found"
          message="The requested lesson is unavailable or may have been updated. Return to the course syllabus to continue learning."
          onBack={() => navigate(data?.course?._id ? `/courses/${data.course._id}/chapters` : "/courses")}
        />
      </div>
    );
  }

  const { chapter = {}, class: cls = {}, course = {} } = data || {};
  const isS3Video = getClassVideoSource(course?.type, cls?.videoSource) === "s3";
  const videoUrl =
    (cls?.vdoCipher ? getVdoCipherEmbedUrl(cls.vdoCipher) : "") ||
    (cls?.videoId ? getBunnyEmbedUrl(cls.videoId) : "");

  return (
    <div className="min-h-screen bg-bg-base text-white flex flex-col selection:bg-brand-mint/30 selection:text-white">
      {/* ══════════════════════════════════════════════════════════
          1. COMPACT LEARNING HEADER
          Responsive breadcrumbs, sync status, curriculum toggle
          ══════════════════════════════════════════════════════════ */}
      <LearningHeader
        course={course}
        chapter={chapter}
        currentClass={cls}
        learningProgress={learningProgress}
        syncState={syncState}
        isClassCompleted={isClassCompleted}
        onOpenCurriculum={() => setCurriculumOpen((prev) => !prev)}
        onOpenIssueModal={() => setIssueModalOpen(true)}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
      />

      {/* ══════════════════════════════════════════════════════════
          2. MAIN LEARNING STUDIO VIEWPORT
          Desktop: 2 Columns (Main Studio + Persistent Curriculum)
          Mobile/Tablet: 1 Column + Bottom Drawer
          ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 max-w-[1680px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* ── LEFT / MAIN STAGE (Player + Workspace Tabs + Navigation) ── */}
          <div className="xl:col-span-8 space-y-6">
            {/* Cinematic Video Player Stage */}
            <VideoStage
              isS3Video={isS3Video}
              videoData={videoData}
              videoUrl={videoUrl}
              vdoCipher={cls?.vdoCipher}
              classTitle={cls.title}
              classProgress={classProgress}
              isClassCompleted={isClassCompleted}
              classProgressPercent={classProgressPercent}
              user={user}
              iframeRef={iframeRef}
              vdoPlayerError={vdoPlayerError}
              onVdoReload={handleVdoReload}
              onRefreshPlaybackUrl={refreshPlaybackUrl}
              onProgressUpdate={handleS3ProgressUpdate}
            />

            {/* Editorial Lesson Title & Identity Banner */}
            <div className="rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-md p-5 sm:p-7 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-32 bg-brand-mint/[0.03] rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <span className="text-brand-mint font-mono">{chapter?.title || 'Course Module'}</span>
                {cls.duration && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-text-muted" />
                      {formatDuration(cls.duration)}
                    </span>
                  </>
                )}
                {isClassCompleted ? (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Completed
                    </span>
                  </>
                ) : classProgressPercent > 0 ? (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-brand-yellow font-mono font-medium">
                      {classProgressPercent}% watched
                    </span>
                  </>
                ) : null}
              </div>

              <h1 className="font-heading font-extrabold text-xl sm:text-2xl md:text-3xl text-white tracking-tight leading-tight">
                {cls.title || 'Untitled Lesson'}
              </h1>
            </div>

            {/* Lesson Navigation (Previous / Next Up / Chapter Transition) */}
            <LessonNavigation
              prevLesson={prevLesson}
              nextLesson={nextLesson}
              nextChapter={nextChapter}
              isLastLessonInChapter={isLastLessonInChapter}
              isLastLessonInCourse={isLastLessonInCourse}
              autoPlayNext={autoPlayNext}
              onToggleAutoPlay={handleToggleAutoPlay}
              onNavigateLesson={handleSelectLesson}
              onNavigateNextChapter={handleContinueToNextChapter}
              onOpenCurriculum={() => setCurriculumOpen(true)}
            />

            {/* Lesson Workspace Tabs (Overview, Lazy Resources, Notes, Progress) */}
            <LessonTabs
              currentClass={cls}
              chapter={chapter}
              course={course}
              classProgress={classProgress}
              learningProgress={learningProgress}
              isClassCompleted={isClassCompleted}
              classProgressPercent={classProgressPercent}
              currentVideoTime={currentVideoTime}
              onPreviewResource={(res) => setPreviewResource(res)}
            />
          </div>

          {/* ── RIGHT / PERSISTENT CURRICULUM SIDEBAR (Desktop >= 1280px) ── */}
          <div className="hidden xl:block xl:col-span-4 sticky top-20">
            <div className="h-[calc(100vh-6.5rem)] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              <CurriculumSidebar
                curriculum={unifiedCurriculum}
                currentChapterCode={chapter?.uniqueCode}
                currentClassId={activeClassId}
                onSelectClass={handleSelectLesson}
                onLockedClick={() =>
                  toast.error("Lesson Locked", "Please complete preceding lessons to unlock.")
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          3. MOBILE / TABLET CURRICULUM SLIDE-OVER DRAWER (< 1280px)
          Rendered ONLY when opened. Exactly ONE curriculum model.
          ══════════════════════════════════════════════════════════ */}
      <CurriculumDrawer
        isOpen={curriculumOpen}
        onClose={() => setCurriculumOpen(false)}
        curriculum={unifiedCurriculum}
        currentChapterCode={chapter?.uniqueCode}
        currentClassId={activeClassId}
        onSelectClass={handleSelectLesson}
        onLockedClick={() =>
          toast.error("Lesson Locked", "Please complete preceding lessons to unlock.")
        }
      />

      {/* ══════════════════════════════════════════════════════════
          4. MODAL DIALOGS
          Chapter Completion, Keyboard Shortcuts, Resource Preview, Issue Reporting
          ══════════════════════════════════════════════════════════ */}
      <ChapterCompleteModal
        isOpen={chapterCompleteModalOpen}
        onClose={() => setChapterCompleteModalOpen(false)}
        chapter={chapter}
        nextChapter={nextChapter}
        completedLessonCount={unifiedCurriculum.activeChapter?.completedLessonsCount ?? chapterClasses.filter((c) => c.completed).length}
        totalLessonCount={unifiedCurriculum.activeChapter?.lessonsCount ?? chapterClasses.length}
        onContinueToNextChapter={handleContinueToNextChapter}
        onReviewChapter={() => {
          setChapterCompleteModalOpen(false);
          const firstInChapter = unifiedCurriculum.activeChapter?.lessons?.[0];
          if (firstInChapter) {
            handleSelectLesson(firstInChapter);
          } else if (chapterClasses.length > 0) {
            handleSelectLesson(chapterClasses[0]);
          }
        }}
      />

      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      <ResourcePreviewModal
        resource={previewResource}
        onClose={() => setPreviewResource(null)}
      />

      {/* Video Issue Report Modal */}
      <AnimatePresence>
        {issueModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIssueModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-bg-surface border border-white/10 rounded-3xl p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
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
                  Let us know if you are experiencing playback or audio interruptions with{" "}
                  <span className="text-white font-semibold">{cls.title}</span>.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Describe the issue
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Video stalls at 04:15 or audio drops..."
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    className="w-full glass-input p-3 text-xs sm:text-sm focus-ring resize-none rounded-xl"
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
    </div>
  );
}

export default function SafeClassView() {
  return (
    <ClassViewErrorBoundary>
      <ClassView />
    </ClassViewErrorBoundary>
  );
}
