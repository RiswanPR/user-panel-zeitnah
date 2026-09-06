import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import VideoWatermark from './VideoWatermark';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Loader2, RefreshCw, WifiOff, SkipForward, SkipBack } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import storage from '../../services/storage';

// Detect iOS — volume control is hardware-only on iOS Safari
const IS_IOS = typeof navigator !== 'undefined' && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);

const IS_TOUCH = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));

export const PLAYER_STATES = {
  IDLE: 'IDLE',
  PLAYING: 'PLAYING',
  BUFFERING: 'BUFFERING',
  SEEKING: 'SEEKING',
  RECOVERING_SOFT: 'RECOVERING_SOFT',
  RECOVERING_MEDIA: 'RECOVERING_MEDIA',
  REBUILDING: 'REBUILDING',
  FATAL: 'FATAL',
};

/**
 * YouTube-grade HLS configuration:
 * - Forward buffer: 60s (up to 120s) for uninterrupted streaming through network dips
 * - Back buffer: 60s auto-eviction to guarantee lightweight RAM footprint during 1–3+ hour classes
 * - Max buffer size: 200MB to prevent memory inflation
 * - Smooth ABR tuning: EWMA estimator with conservative down-switching to prevent stalls
 * - Progressive fragment streaming enabled
 */
function createHlsConfig() {
  return {
    xhrSetup: (xhr, url) => {
      const currentToken = storage.getAccessToken();
      if (url.includes('/api/courses/video/') && currentToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${currentToken}`);
      }
    },
    // Buffer targets
    maxBufferLength: 60,
    maxMaxBufferLength: 120,
    maxBufferSize: 200 * 1024 * 1024, // 200MB memory safety ceiling
    maxBufferHole: 0.5,
    maxSeekHole: 2,
    nudgeOffset: 0.1,
    nudgeMaxRetry: 5,
    backBufferLength: 60, // Auto-evicts played chunks >60s old to prevent memory leaks

    // ABR (Adaptive Bitrate) settings
    startLevel: -1,
    abrEwmaDefaultEstimate: 1000000,
    abrEwmaDefaultEstimateMax: 10000000,
    abrBandWidthFactor: 0.9,
    abrBandWidthUpFactor: 0.7,
    testBandwidth: true,

    // Timeouts and retries for resilient streaming
    maxStarvationDelay: 3,
    maxLoadingDelay: 4,
    lowLatencyMode: false,
    fragLoadingTimeOut: 20000,
    fragLoadingMaxRetry: 6,
    fragLoadingRetryDelay: 1000,
    fragLoadingMaxRetryTimeout: 64000,
    levelLoadingTimeOut: 10000,
    levelLoadingMaxRetry: 4,
    levelLoadingRetryDelay: 1000,

    enableWorker: true,
    progressive: true,
  };
}

export const VideoPlayer = ({ src, refreshUrl, watermarkData, onProgress, initialTime }) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const initialTimeRef = useRef(initialTime);
  const activeSrcRef = useRef(src);

  // Sync activeSrcRef when src prop changes
  useEffect(() => {
    activeSrcRef.current = src;
  }, [src]);

  const tapTimerRef = useRef(null);
  const tapCountRef = useRef(0);
  const [skipRipple, setSkipRipple] = useState(null);
  const skipRippleTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressActiveRef = useRef(false);
  const savedRateRef = useRef(1);

  const [playerState, setPlayerState] = useState(PLAYER_STATES.IDLE);
  const playerStateRef = useRef(PLAYER_STATES.IDLE);

  const setPlayerStateSync = useCallback((newState) => {
    playerStateRef.current = newState;
    setPlayerState(newState);
  }, []);

  const recoveryLevelRef = useRef(0);
  const recoveryAttemptRef = useRef(0);
  const recoveryGenerationRef = useRef(0);
  const isRecoveringRef = useRef(false);
  const recoveryLockTimeRef = useRef(0);
  const lastSuccessfulTimeRef = useRef(0);
  const verificationStartPosRef = useRef(null);
  const verificationStartTimeRef = useRef(0);
  const requestedTimeRef = useRef(null);
  const wasPlayingRef = useRef(false);
  const stallWatchdogRef = useRef(null);
  const rebuildTimeoutRef = useRef(null);
  const eventTimelineRef = useRef([]);

  // Deep Diagnostic Refs
  const lastHlsErrorRef = useRef(null);
  const lastRecoveryTimeRef = useRef(null);
  const lastNativeErrorTimeRef = useRef(null);
  const recentErrorTimestampsRef = useRef([]);

  useEffect(() => { initialTimeRef.current = initialTime; }, [initialTime]);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [errorType, setErrorType] = useState('unknown');
  const [autoRetryCountdown, setAutoRetryCountdown] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const playbackErrorRef = useRef(false);
  const errorTypeRef = useRef('unknown');
  useEffect(() => { playbackErrorRef.current = playbackError; }, [playbackError]);
  useEffect(() => { errorTypeRef.current = errorType; }, [errorType]);

  const playbackRateRef = useRef(playbackRate);
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);

  const recordEvent = useCallback((eventName, extra = {}) => {
    const video = videoRef.current;
    const now = new Date().toISOString().substring(11, 19);
    let bufferedRanges = [];
    if (video && video.buffered) {
      for (let i = 0; i < video.buffered.length; i++) {
        try {
          bufferedRanges.push({
            start: Number(video.buffered.start(i).toFixed(1)),
            end: Number(video.buffered.end(i).toFixed(1)),
          });
        } catch (e) {}
      }
    }
    const entry = {
      time: now,
      event: eventName,
      currentTime: video ? Number(video.currentTime.toFixed(2)) : null,
      readyState: video ? video.readyState : null,
      networkState: video ? video.networkState : null,
      paused: video ? video.paused : null,
      videoError: video && video.error ? { code: video.error.code, message: video.error.message } : null,
      buffered: bufferedRanges,
      state: playerStateRef.current,
      gen: recoveryGenerationRef.current,
      ...extra,
    };
    eventTimelineRef.current.push(entry);
    if (eventTimelineRef.current.length > 20) eventTimelineRef.current.shift();
  }, []);

  const logRecoveryTelemetry = useCallback((status, payload = {}) => {
    const video = videoRef.current;
    const nowMs = Date.now();
    let bufferedRanges = [];
    if (video && video.buffered) {
      for (let i = 0; i < video.buffered.length; i++) {
        try {
          bufferedRanges.push(`[${video.buffered.start(i).toFixed(1)}s - ${video.buffered.end(i).toFixed(1)}s]`);
        } catch (e) {}
      }
    }
    const logData = {
      tag: `[VideoPlayer Recovery] ${status}`,
      timestamp: new Date().toISOString(),
      status,
      state: playerStateRef.current,
      generation: recoveryGenerationRef.current,
      attempt: recoveryAttemptRef.current,
      level: recoveryLevelRef.current,
      currentTime: video ? Number(video.currentTime.toFixed(2)) : null,
      targetTime: requestedTimeRef.current,
      wasPlaying: wasPlayingRef.current,
      videoError: video && video.error ? { code: video.error.code, message: video.error.message } : null,
      readyState: video ? video.readyState : null,
      networkState: video ? video.networkState : null,
      buffered: bufferedRanges.join(', '),
      visibility: document.visibilityState,
      timeSinceLastRecovery: lastRecoveryTimeRef.current ? Number(((nowMs - lastRecoveryTimeRef.current) / 1000).toFixed(1)) : null,
      timeSinceLastNativeError: lastNativeErrorTimeRef.current ? Number(((nowMs - lastNativeErrorTimeRef.current) / 1000).toFixed(1)) : null,
      lastHlsError: lastHlsErrorRef.current,
      timelineSummary: eventTimelineRef.current.slice(-5).map(e => `${e.time} ${e.event}(${e.state})`).join(' -> '),
      ...payload,
    };
    console.warn(logData.tag, logData);
  }, []);

  let executeRecovery;

  // ── REBUILD PLAYER PIPELINE WITH DYNAMIC URL REFRESH ──
  const rebuildPlayerPipeline = useCallback(async (targetTime, shouldPlay = false, generation) => {
    logRecoveryTelemetry('HARD_REBUILD_START', { targetTime, shouldPlay, generation });
    setPlayerStateSync(PLAYER_STATES.REBUILDING);
    if (rebuildTimeoutRef.current) clearTimeout(rebuildTimeoutRef.current);
    const video = videoRef.current;
    if (video) try { video.pause(); } catch (e) {}
    if (hlsRef.current) {
      try { hlsRef.current.detachMedia(); hlsRef.current.destroy(); } catch (e) {}
      hlsRef.current = null;
    }

    // Proactively fetch a fresh signed URL if refreshUrl is available
    let effectiveSrc = activeSrcRef.current;
    if (refreshUrl && typeof refreshUrl === 'function') {
      try {
        const freshUrl = await refreshUrl();
        if (freshUrl) {
          activeSrcRef.current = freshUrl;
          effectiveSrc = freshUrl;
          logRecoveryTelemetry('HARD_REBUILD_URL_REFRESHED', { newUrl: freshUrl.substring(0, 60) + '...' });
        }
      } catch (err) {
        logRecoveryTelemetry('HARD_REBUILD_URL_REFRESH_FAILED', { error: err.message });
      }
    }

    if (!video || !effectiveSrc) { isRecoveringRef.current = false; return; }
    try { video.removeAttribute('src'); video.load(); } catch (e) {}

    rebuildTimeoutRef.current = setTimeout(() => {
      if (generation !== recoveryGenerationRef.current) return;
      logRecoveryTelemetry('HARD_REBUILD_TIMEOUT', { generation, attempt: recoveryAttemptRef.current });
      if (recoveryAttemptRef.current < 2) {
        executeRecovery('rebuild-timeout-retry', { forceLevel: 3, targetTime: requestedTimeRef.current, wasPlaying: shouldPlay });
      } else {
        setPlayerStateSync(PLAYER_STATES.FATAL);
        setErrorType('media');
        setPlaybackError(true);
        isRecoveringRef.current = false;
      }
    }, 12000);

    setTimeout(() => {
      if (generation !== recoveryGenerationRef.current || !videoRef.current || !effectiveSrc) return;
      const currentVideo = videoRef.current;

      if (Hls.isSupported() && effectiveSrc.endsWith('.m3u8')) {
        const hls = new Hls(createHlsConfig());
        hlsRef.current = hls;
        hls.loadSource(effectiveSrc);
        hls.attachMedia(currentVideo);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (generation !== recoveryGenerationRef.current) return;
          const activeTarget = requestedTimeRef.current != null ? requestedTimeRef.current : targetTime;
          if (activeTarget > 0 && Number.isFinite(activeTarget)) try { currentVideo.currentTime = activeTarget; } catch (e) {}
          if (playbackRateRef.current !== 1) currentVideo.playbackRate = playbackRateRef.current;
          if (shouldPlay) {
            currentVideo.play().catch(err => logRecoveryTelemetry('HARD_REBUILD_PLAY_PREVENTED', { error: err.message }));
          } else {
            try { currentVideo.pause(); } catch (e) {}
          }
        });
        hls.on(Hls.Events.ERROR, async (_event, data) => {
          if (generation !== recoveryGenerationRef.current) return;
          if (data.fatal) {
            logRecoveryTelemetry('HARD_REBUILD_HLS_FATAL', { type: data.type, details: data.details });
            if (rebuildTimeoutRef.current) clearTimeout(rebuildTimeoutRef.current);
            if (recoveryAttemptRef.current < 2) {
              executeRecovery('hls-fatal-rebuild-retry', { forceLevel: 3, targetTime: requestedTimeRef.current, wasPlaying: shouldPlay });
            } else {
              setPlayerStateSync(PLAYER_STATES.FATAL);
              setErrorType(data.type === Hls.ErrorTypes.NETWORK_ERROR ? 'network' : 'media');
              setPlaybackError(true);
              try { hls.destroy(); } catch (e) {}
              hlsRef.current = null;
              isRecoveringRef.current = false;
            }
          }
        });
      } else {
        const token = storage.getAccessToken();
        let nativeSrc = effectiveSrc;
        if (effectiveSrc && effectiveSrc.includes('.m3u8') && token && !effectiveSrc.includes('token=')) {
          const separator = effectiveSrc.includes('?') ? '&' : '?';
          nativeSrc = `${effectiveSrc}${separator}token=${encodeURIComponent(token)}`;
        }
        currentVideo.src = nativeSrc;
        currentVideo.load();
        currentVideo.addEventListener('loadedmetadata', () => {
          if (generation !== recoveryGenerationRef.current) return;
          const activeTarget = requestedTimeRef.current != null ? requestedTimeRef.current : targetTime;
          if (activeTarget > 0 && Number.isFinite(activeTarget)) try { currentVideo.currentTime = activeTarget; } catch (e) {}
          if (playbackRateRef.current !== 1) currentVideo.playbackRate = playbackRateRef.current;
          if (shouldPlay) {
            currentVideo.play().catch(() => {});
          } else {
            try { currentVideo.pause(); } catch (e) {}
          }
        }, { once: true });
      }
    }, 100);
  }, [refreshUrl, logRecoveryTelemetry, setPlayerStateSync]);

  // ── GRADUATED MULTI-TIER RECOVERY ──
  executeRecovery = useCallback((cause, options = {}) => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    const now = Date.now();
    recoveryGenerationRef.current += 1;
    const generation = recoveryGenerationRef.current;

    // Lock recovery throttle to prevent hammering
    if (isRecoveringRef.current && (now - recoveryLockTimeRef.current < 8000) && !options.forceLevel) {
      logRecoveryTelemetry('RECOVERY_BLOCKED_CONCURRENT', { cause, generation });
      return;
    }
    isRecoveringRef.current = true;
    recoveryLockTimeRef.current = now;
    lastRecoveryTimeRef.current = now;

    if (options.resetAttempt) recoveryAttemptRef.current = 1; else recoveryAttemptRef.current += 1;
    const targetPos = options.targetTime != null
      ? options.targetTime
      : (requestedTimeRef.current != null
        ? requestedTimeRef.current
        : (video && Number.isFinite(video.currentTime) && video.currentTime > 0
          ? video.currentTime
          : (initialTimeRef.current || 0)));
    requestedTimeRef.current = targetPos;

    if (options.wasPlaying != null) wasPlayingRef.current = options.wasPlaying;
    else if (video) wasPlayingRef.current = !video.paused;

    let level = options.forceLevel || 1;
    if (!options.forceLevel) {
      if (recoveryAttemptRef.current === 1) level = 1;
      else if (recoveryAttemptRef.current === 2) level = 2;
      else if (recoveryAttemptRef.current >= 3 && recoveryAttemptRef.current <= 4) level = 3;
      else level = 4;
    }

    // Media element error 4 (SRC_NOT_SUPPORTED / 403 Forbidden) mandates full pipeline rebuild
    if (video && video.error && video.error.code === 4 && level < 3) level = 3;
    recoveryLevelRef.current = level;
    logRecoveryTelemetry('RECOVERY_EXECUTE', { cause, level, attempt: recoveryAttemptRef.current, targetTime: targetPos, generation });

    // Tier 1: Soft micro-nudge (0.05s) to bypass tiny buffer holes + restart load
    if (level === 1) {
      setPlayerStateSync(PLAYER_STATES.RECOVERING_SOFT);
      if (hls) {
        const nudge = targetPos + 0.05;
        if (video && Number.isFinite(nudge) && nudge < (video.duration || Infinity)) {
          try { video.currentTime = nudge; } catch (e) {}
        }
        try { hls.startLoad(); } catch (e) {}
      } else if (video) {
        try {
          const nudge = targetPos + 0.05;
          if (Number.isFinite(nudge) && nudge < (video.duration || Infinity)) video.currentTime = nudge;
          if (wasPlayingRef.current) video.play().catch(() => {});
        } catch (e) {}
      }
      setTimeout(() => { if (generation === recoveryGenerationRef.current) isRecoveringRef.current = false; }, 2000);
    }
    // Tier 2: Media Source recovery
    else if (level === 2) {
      setPlayerStateSync(PLAYER_STATES.RECOVERING_MEDIA);
      if (hls) {
        try { hls.recoverMediaError(); } catch (e) {}
      } else if (video) {
        try {
          video.load();
          video.addEventListener('loadedmetadata', () => {
            if (generation !== recoveryGenerationRef.current) return;
            if (requestedTimeRef.current > 0) video.currentTime = requestedTimeRef.current;
            if (wasPlayingRef.current) video.play().catch(() => {});
          }, { once: true });
        } catch (e) {}
      }
      setTimeout(() => { if (generation === recoveryGenerationRef.current) isRecoveringRef.current = false; }, 3000);
    }
    // Tier 3: Hard rebuild pipeline with fresh signed URL
    else if (level === 3) {
      rebuildPlayerPipeline(targetPos, wasPlayingRef.current, generation);
    }
    // Tier 4: Fatal fallback with user retry overlay
    else {
      setPlayerStateSync(PLAYER_STATES.FATAL);
      logRecoveryTelemetry('RECOVERY_FATAL_UI', { cause });
      const isNet = cause.includes('network') || (video && video.error && video.error.code === 2);
      setErrorType(isNet ? 'network' : 'media');
      setPlaybackError(true);
      isRecoveringRef.current = false;
    }
  }, [logRecoveryTelemetry, rebuildPlayerPipeline, setPlayerStateSync]);

  // ── USER SEEKING ──
  const seekTo = useCallback((targetTime, options = {}) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(targetTime)) return;
    const validDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : Infinity;
    const clampedTarget = Math.max(0, Math.min(validDuration, targetTime));
    if (stallWatchdogRef.current) { clearTimeout(stallWatchdogRef.current); stallWatchdogRef.current = null; }
    recoveryGenerationRef.current += 1;
    const generation = recoveryGenerationRef.current;
    requestedTimeRef.current = clampedTarget;
    wasPlayingRef.current = options.shouldPlay != null ? options.shouldPlay : !video.paused;
    setCurrentTime(clampedTarget);
    setPlayerStateSync(PLAYER_STATES.SEEKING);
    recordEvent('user_seek', { targetTime: clampedTarget, options });

    const isHlsMissing = !hlsRef.current && Hls.isSupported() && activeSrcRef.current?.endsWith('.m3u8');
    const isPipUnhealthy = !!video.error || isHlsMissing || playerStateRef.current === PLAYER_STATES.FATAL;

    if (isPipUnhealthy || options.forceRebuild) {
      if (playbackErrorRef.current) { setPlaybackError(false); setErrorType('unknown'); }
      executeRecovery('user-seek-unhealthy-pipeline', { forceLevel: 3, targetTime: clampedTarget, wasPlaying: wasPlayingRef.current, resetAttempt: true });
    } else {
      try {
        video.currentTime = clampedTarget;
        if (hlsRef.current && (isBuffering || video.paused)) hlsRef.current.startLoad();
        setTimeout(() => {
          if (generation === recoveryGenerationRef.current) {
            setPlayerStateSync(video.paused && !wasPlayingRef.current ? PLAYER_STATES.IDLE : PLAYER_STATES.PLAYING);
          }
        }, 400);
      } catch (e) {
        recordEvent('seek_exception', { error: e.message });
        executeRecovery('user-seek-exception', { forceLevel: 3, targetTime: clampedTarget, wasPlaying: wasPlayingRef.current });
      }
    }
    if (options.rippleSeconds != null) {
      clearTimeout(skipRippleTimerRef.current);
      setSkipRipple({ side: options.rippleSeconds > 0 ? 'right' : 'left', seconds: Math.abs(options.rippleSeconds), key: Date.now() });
      skipRippleTimerRef.current = setTimeout(() => setSkipRipple(null), 700);
    }
  }, [recordEvent, executeRecovery, isBuffering, setPlayerStateSync]);

  const handleSeek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = pos * (duration || 0);
    seekTo(targetTime);
  }, [duration, seekTo]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const totalSecs = Math.floor(seconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      recordEvent('toggle_play');
      videoRef.current.play().catch(e => console.log('Playback interrupted:', e));
    } else {
      recordEvent('toggle_pause');
      videoRef.current.pause();
    }
  }, [recordEvent]);

  const skipBy = useCallback((seconds) => {
    const video = videoRef.current;
    const current = video && Number.isFinite(video.currentTime) ? video.currentTime : (currentTime || 0);
    seekTo(current + seconds, { rippleSeconds: seconds });
  }, [seekTo, currentTime]);

  const isPseudoFullscreenRef = useRef(false);

  const getIsNativeFullscreen = useCallback(() => {
    const video = videoRef.current;
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      (video && (video.webkitDisplayingFullscreen || (video.webkitSupportsFullscreen && video.webkitDisplayingFullscreen)))
    );
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const isCurrentlyFS = getIsNativeFullscreen() || isPseudoFullscreenRef.current;

    if (isCurrentlyFS) {
      isPseudoFullscreenRef.current = false;
      setIsFullscreen(false);
      document.body.style.overflow = '';

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (video.webkitDisplayingFullscreen && typeof video.webkitExitFullscreen === 'function') {
        try { video.webkitExitFullscreen(); } catch (e) {}
      }
    } else {
      if (typeof container.requestFullscreen === 'function') {
        container.requestFullscreen().catch(() => {
          if (typeof video.webkitEnterFullscreen === 'function') {
            try { video.webkitEnterFullscreen(); setIsFullscreen(true); } catch (e) {}
          } else {
            isPseudoFullscreenRef.current = true;
            setIsFullscreen(true);
            document.body.style.overflow = 'hidden';
          }
        });
      } else if (typeof video.webkitEnterFullscreen === 'function') {
        try {
          video.webkitEnterFullscreen();
          setIsFullscreen(true);
        } catch (e) {
          isPseudoFullscreenRef.current = true;
          setIsFullscreen(true);
          document.body.style.overflow = 'hidden';
        }
      } else if (typeof container.webkitRequestFullscreen === 'function') {
        try {
          container.webkitRequestFullscreen();
        } catch (e) {
          isPseudoFullscreenRef.current = true;
          setIsFullscreen(true);
          document.body.style.overflow = 'hidden';
        }
      } else {
        isPseudoFullscreenRef.current = true;
        setIsFullscreen(true);
        document.body.style.overflow = 'hidden';
      }
    }
  }, [getIsNativeFullscreen]);

  useEffect(() => {
    const video = videoRef.current;
    const handleFSChange = () => {
      const isFS = getIsNativeFullscreen() || isPseudoFullscreenRef.current;
      setIsFullscreen(isFS);
      if (!isFS) {
        isPseudoFullscreenRef.current = false;
        document.body.style.overflow = '';
      }
    };

    const handleIOSBeginFS = () => {
      setIsFullscreen(true);
      recordEvent('ios_begin_fullscreen');
    };

    const handleIOSEndFS = () => {
      setIsFullscreen(false);
      isPseudoFullscreenRef.current = false;
      document.body.style.overflow = '';
      recordEvent('ios_end_fullscreen');
    };

    document.addEventListener('fullscreenchange', handleFSChange);
    document.addEventListener('webkitfullscreenchange', handleFSChange);

    if (video) {
      video.addEventListener('webkitbeginfullscreen', handleIOSBeginFS);
      video.addEventListener('webkitendfullscreen', handleIOSEndFS);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange);
      document.removeEventListener('webkitfullscreenchange', handleFSChange);
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', handleIOSBeginFS);
        video.removeEventListener('webkitendfullscreen', handleIOSEndFS);
      }
    };
  }, [getIsNativeFullscreen, recordEvent]);

  const toggleMute = useCallback(() => setMuted(prev => !prev), []);

  const handleVideoTap = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const pct = (clientX - rect.left) / rect.width;
    const zone = pct < 0.3 ? 'left' : pct > 0.7 ? 'right' : 'center';
    tapCountRef.current += 1;
    if (tapCountRef.current === 1) {
      tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; togglePlay(); }, 250);
    } else if (tapCountRef.current === 2) {
      clearTimeout(tapTimerRef.current);
      tapCountRef.current = 0;
      if (zone === 'left') skipBy(-10);
      else if (zone === 'right') skipBy(10);
      else toggleFullscreen();
    }
  }, [togglePlay, toggleFullscreen, skipBy]);

  const handleTouchStart = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video || video.paused) return;
      longPressActiveRef.current = true;
      savedRateRef.current = video.playbackRate;
      video.playbackRate = 2;
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimerRef.current);
    if (longPressActiveRef.current) {
      longPressActiveRef.current = false;
      if (videoRef.current) videoRef.current.playbackRate = savedRateRef.current;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(tapTimerRef.current);
      clearTimeout(skipRippleTimerRef.current);
      clearTimeout(longPressTimerRef.current);
      if (rebuildTimeoutRef.current) clearTimeout(rebuildTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!videoRef.current) return;
      if (['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase())) return;
      switch(e.key.toLowerCase()) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'f': e.preventDefault(); toggleFullscreen(); break;
        case 'm': e.preventDefault(); toggleMute(); break;
        case 'arrowright': e.preventDefault(); skipBy(10); break;
        case 'arrowleft': e.preventDefault(); skipBy(-10); break;
        case 'arrowup': e.preventDefault(); setVolume(v => Math.min(1, v + 0.1)); break;
        case 'arrowdown': e.preventDefault(); setVolume(v => Math.max(0, v - 0.1)); break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen, toggleMute, togglePlay, skipBy]);

  useEffect(() => {
    let timeout;
    const resetHideTimer = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (playing && !showSettings) setShowControls(false);
      }, 3000);
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', resetHideTimer);
      container.addEventListener('touchstart', resetHideTimer, { passive: true });
    }
    return () => {
      if (container) {
        container.removeEventListener('mousemove', resetHideTimer);
        container.removeEventListener('touchstart', resetHideTimer);
      }
      clearTimeout(timeout);
    };
  }, [playing, showSettings]);

  // ── FAST MICRO-STALL WATCHDOG (2.5 SECONDS) ──
  useEffect(() => {
    if (isBuffering && playing && !playbackError) {
      stallWatchdogRef.current = setTimeout(() => {
        if (!videoRef.current || playbackErrorRef.current) return;
        recordEvent('stall_watchdog_fired');
        logRecoveryTelemetry('STALL_WATCHDOG_FIRED');
        executeRecovery('stall-watchdog');
      }, 2500); // 2.5s fast detection
    }
    return () => {
      if (stallWatchdogRef.current) {
        clearTimeout(stallWatchdogRef.current);
        stallWatchdogRef.current = null;
      }
    };
  }, [isBuffering, playing, playbackError, executeRecovery, recordEvent, logRecoveryTelemetry]);

  // ── NETWORK RESILIENCE: OFFLINE / ONLINE AUTO-RESUME ──
  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      recordEvent('network_offline');
      logRecoveryTelemetry('NETWORK_OFFLINE');
    };
    const handleOnline = async () => {
      setIsOffline(false);
      recordEvent('network_online');
      logRecoveryTelemetry('NETWORK_ONLINE_RESTORED');
      if (playbackErrorRef.current && errorTypeRef.current === 'network') {
        setPlaybackError(false);
        setErrorType('unknown');
        executeRecovery('network-restored', { forceLevel: 3, resetAttempt: true });
      } else if (hlsRef.current) {
        try { hlsRef.current.startLoad(); } catch (e) {}
      }
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [executeRecovery, recordEvent, logRecoveryTelemetry]);

  // ── VISIBILITY RECOVERY: TAB SWITCH RESTORATION ──
  useEffect(() => {
    const handleVisibilityChange = () => {
      recordEvent(`visibility_${document.visibilityState}`);
      if (document.visibilityState !== 'visible' || !videoRef.current || playbackErrorRef.current) return;
      if (!videoRef.current.paused && (videoRef.current.readyState < 3 || isBuffering)) {
        logRecoveryTelemetry('TAB_RESTORED_STALLED');
        executeRecovery('visibility-return', { forceLevel: 1 });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [executeRecovery, recordEvent, logRecoveryTelemetry, isBuffering]);

  // ── INITIAL MEDIA PIPELINE SETUP ──
  useEffect(() => {
    setPlaybackError(false);
    setErrorType('unknown');
    setAutoRetryCountdown(null);
    setPlaying(false);
    setPlayerStateSync(PLAYER_STATES.IDLE);
    recoveryLevelRef.current = 0;
    recoveryAttemptRef.current = 0;
    isRecoveringRef.current = false;
    activeSrcRef.current = src;

    if (!src || !videoRef.current) return;
    const video = videoRef.current;

    if (hlsRef.current) {
      try { hlsRef.current.detachMedia(); hlsRef.current.destroy(); } catch (e) {}
      hlsRef.current = null;
    }

    if (Hls.isSupported() && src.endsWith('.m3u8')) {
      const hls = new Hls(createHlsConfig());
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const r = initialTimeRef.current;
        if (r > 0) try { video.currentTime = r; } catch (e) {}
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        let fragUrl = null;
        if (data.frag?.url) fragUrl = data.frag.url.split('?')[0];
        else if (data.response?.url) fragUrl = data.response.url.split('?')[0];

        lastHlsErrorRef.current = {
          timestamp: new Date().toISOString(),
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          url: fragUrl,
          reason: data.reason || null,
          error: data.error ? (data.error.message || String(data.error)) : null,
        };

        recordEvent('hls_error', { type: data.type, details: data.details, fatal: data.fatal, fragUrl });

        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            logRecoveryTelemetry('HLS_FATAL_NETWORK_ERROR', { details: data.details });
            executeRecovery('hls-fatal-network-error', { forceLevel: 1 });
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            logRecoveryTelemetry('HLS_FATAL_MEDIA_ERROR', { details: data.details });
            executeRecovery('hls-fatal-media-error', { forceLevel: 2 });
          } else {
            logRecoveryTelemetry('HLS_FATAL_UNKNOWN_ERROR', { type: data.type, details: data.details });
            executeRecovery('hls-fatal-unknown-error', { forceLevel: 3 });
          }
        } else if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR && !video.paused) {
          executeRecovery('hls-buffer-stalled', { forceLevel: 1 });
        }
      });
    } else {
      const token = storage.getAccessToken();
      let nativeSrc = src;
      if (src && src.includes('.m3u8') && token && !src.includes('token=')) {
        const separator = src.includes('?') ? '&' : '?';
        nativeSrc = `${src}${separator}token=${encodeURIComponent(token)}`;
      }
      video.src = nativeSrc;
    }

    return () => {
      if (hlsRef.current) {
        try { hlsRef.current.detachMedia(); hlsRef.current.destroy(); } catch (e) {}
        hlsRef.current = null;
      }
    };
  }, [src, recordEvent, logRecoveryTelemetry, executeRecovery, setPlayerStateSync]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

  // ── PROGRESS & BUFFER TRACKING ──
  const updateProgress = () => {
    const video = videoRef.current;
    if (!video) return;
    const { currentTime: cTime, duration: dur, buffered: buf } = video;
    setCurrentTime(cTime);
    setDuration(dur);

    // Calculate maximum buffered end point ahead of current playback
    if (buf && buf.length > 0) {
      let maxBuf = 0;
      for (let i = 0; i < buf.length; i++) {
        if (buf.start(i) <= cTime + 1 && buf.end(i) > maxBuf) {
          maxBuf = buf.end(i);
        }
      }
      setBuffered(maxBuf || buf.end(buf.length - 1));
    }

    if (!video.paused && !isBuffering && playerStateRef.current !== PLAYER_STATES.SEEKING && !playerStateRef.current.startsWith('RECOVERING') && playerStateRef.current !== PLAYER_STATES.REBUILDING && playerStateRef.current !== PLAYER_STATES.FATAL) {
      setPlayerStateSync(PLAYER_STATES.PLAYING);
    }

    if (!video.paused && !isBuffering && video.readyState >= 2 && !video.error && !playbackErrorRef.current) {
      const now = Date.now();
      if (verificationStartPosRef.current == null || Math.abs(cTime - lastSuccessfulTimeRef.current) > 2) {
        verificationStartPosRef.current = cTime;
        verificationStartTimeRef.current = now;
      } else {
        const advancedSecs = cTime - verificationStartPosRef.current;
        const elapsedMs = now - verificationStartTimeRef.current;
        if (advancedSecs >= 1.0 && elapsedMs >= 1000) {
          if (recoveryAttemptRef.current > 0 || isRecoveringRef.current || playerStateRef.current.startsWith('RECOVERING') || playerStateRef.current === PLAYER_STATES.REBUILDING) {
            logRecoveryTelemetry('RECOVERY_SUCCESS_VERIFIED', { restoredTime: cTime, advancedSecs });
            if (rebuildTimeoutRef.current) { clearTimeout(rebuildTimeoutRef.current); rebuildTimeoutRef.current = null; }
            recoveryAttemptRef.current = 0;
            recoveryLevelRef.current = 0;
            isRecoveringRef.current = false;
            setPlayerStateSync(PLAYER_STATES.PLAYING);
          }
        }
      }
      lastSuccessfulTimeRef.current = cTime;
    } else {
      verificationStartPosRef.current = null;
    }

    if (onProgress) onProgress({ currentTime: cTime, duration: dur });
  };

  const handleVideoError = useCallback(() => {
    const video = videoRef.current;
    const error = video?.error;
    if (!error || error.code === 1) return;

    const nowMs = Date.now();
    const timeSinceLastNative = lastNativeErrorTimeRef.current ? Number(((nowMs - lastNativeErrorTimeRef.current) / 1000).toFixed(1)) : null;
    const timeSinceLastRecovery = lastRecoveryTimeRef.current ? Number(((nowMs - lastRecoveryTimeRef.current) / 1000).toFixed(1)) : null;
    lastNativeErrorTimeRef.current = nowMs;

    recentErrorTimestampsRef.current = recentErrorTimestampsRef.current.filter(ts => (nowMs - ts) < 300000);
    recentErrorTimestampsRef.current.push(nowMs);

    const errorPayload = {
      mediaErrorCode: error.code,
      mediaErrorMessage: error.message,
      currentSrc: video.currentSrc ? video.currentSrc.split('?')[0] : null,
      currentTime: Number(video.currentTime.toFixed(2)),
      duration: Number(video.duration.toFixed(2)),
      readyState: video.readyState,
      networkState: video.networkState,
      paused: video.paused,
      seeking: video.seeking,
      buffered: eventTimelineRef.current.slice(-1)[0]?.buffered || [],
      playbackRate: video.playbackRate,
      visibilityState: document.visibilityState,
      timeSinceLastNativeError: timeSinceLastNative,
      timeSinceLastRecovery: timeSinceLastRecovery,
    };

    recordEvent('native_video_error', errorPayload);
    logRecoveryTelemetry('NATIVE_VIDEO_ERROR', errorPayload);

    // Automatically trigger level 3 recovery with fresh signed URL
    executeRecovery('native-video-error', { forceLevel: 3 });
  }, [recordEvent, logRecoveryTelemetry, executeRecovery]);

  const handleRetry = useCallback(() => {
    setPlaybackError(false);
    setErrorType('unknown');
    setAutoRetryCountdown(null);
    recoveryLevelRef.current = 0;
    recoveryAttemptRef.current = 0;
    isRecoveringRef.current = false;
    executeRecovery('manual-user-retry', { forceLevel: 3, targetTime: requestedTimeRef.current || currentTime || initialTimeRef.current || 0, wasPlaying: true, resetAttempt: true });
  }, [currentTime, executeRecovery]);

  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleDevTools = (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key))) {
        e.preventDefault();
        setIsDevToolsOpen(true);
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleDevTools);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleDevTools);
    };
  }, []);

  const showVolumeControl = !IS_IOS;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden select-none group font-sans ${isFullscreen ? 'fixed inset-0 z-[9999] bg-black' : ''}`}
      onDoubleClick={IS_TOUCH ? undefined : toggleFullscreen}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={updateProgress}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onLoadedData={() => setIsBuffering(false)}
        onLoadedMetadata={updateProgress}
        onError={handleVideoError}
        onClick={IS_TOUCH ? handleVideoTap : togglePlay}
        onTouchStart={IS_TOUCH ? handleTouchStart : undefined}
        onTouchEnd={IS_TOUCH ? handleTouchEnd : undefined}
        onTouchCancel={IS_TOUCH ? handleTouchEnd : undefined}
      />

      {/* ── Skip Ripple Animation Overlay ── */}
      <AnimatePresence>
        {skipRipple && (
          <motion.div
            key={skipRipple.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className={`absolute top-0 bottom-0 ${skipRipple.side === 'right' ? 'right-0' : 'left-0'} w-[30%] flex items-center justify-center pointer-events-none`}
          >
            <div className="flex flex-col items-center gap-1">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg"
              >
                {skipRipple.side === 'right'
                  ? <SkipForward className="w-6 h-6 text-white" />
                  : <SkipBack className="w-6 h-6 text-white" />
                }
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white text-xs font-bold"
              >
                {skipRipple.seconds}s
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Buffering Spinner ── */}
      {isBuffering && !playbackError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10 backdrop-blur-[1px]">
          <Loader2 className="w-12 h-12 text-brand-mint animate-spin drop-shadow" />
        </div>
      )}

      {/* ── Network Offline Banner ── */}
      <AnimatePresence>
        {isOffline && !playbackError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center gap-2 bg-danger/90 backdrop-blur-md px-4 py-2 text-white text-xs font-semibold shadow-md"
          >
            <WifiOff className="w-4 h-4" />
            Internet disconnected — stream will resume automatically
          </motion.div>
        )}
      </AnimatePresence>

      {watermarkData && <VideoWatermark user={watermarkData} />}

      {/* ── Custom Video Controls ── */}
      <AnimatePresence>
        {(showControls || !playing) && !playbackError && !isDevToolsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 flex flex-col justify-end pointer-events-none"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
            
            <div className="relative z-10 px-4 sm:px-6 py-3 sm:py-4 pointer-events-auto">
              {/* Progress & Buffer Bar */}
              <div 
                className="relative h-2 sm:h-1.5 w-full bg-white/20 rounded-full mb-3 sm:mb-4 cursor-pointer sm:hover:h-2 transition-all group/progress"
                onClick={handleSeek}
                onTouchStart={handleSeek}
              >
                {/* Buffered Range Bar */}
                <div 
                  className="absolute h-full bg-white/40 rounded-full pointer-events-none transition-all duration-300"
                  style={{ width: `${duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0}%` }}
                />
                {/* Current Playback Bar */}
                <div 
                  className="absolute h-full bg-brand-mint rounded-full pointer-events-none"
                  style={{ width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-3 sm:h-3 bg-white rounded-full sm:scale-0 sm:group-hover/progress:scale-100 transition-transform shadow-md" />
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Skip backward 10s */}
                  <button
                    onClick={() => skipBy(-10)}
                    className="hover:text-brand-mint transition-colors p-1 hidden sm:block"
                    title="Rewind 10s"
                  >
                    <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <button onClick={togglePlay} className="hover:text-brand-mint transition-colors p-1" title={playing ? "Pause" : "Play"}>
                    {playing ? <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />}
                  </button>

                  {/* Skip forward 10s */}
                  <button
                    onClick={() => skipBy(10)}
                    className="hover:text-brand-mint transition-colors p-1 hidden sm:block"
                    title="Forward 10s"
                  >
                    <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  
                  {showVolumeControl && (
                    <div className="flex items-center gap-2 group/volume">
                      <button onClick={toggleMute} className="hover:text-brand-mint transition-colors" title={muted ? "Unmute" : "Mute"}>
                        {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={muted ? 0 : volume}
                        onChange={(e) => {
                          setVolume(parseFloat(e.target.value));
                          setMuted(false);
                        }}
                        className={
                          IS_TOUCH
                            ? "w-16 accent-brand-mint h-1"
                            : "w-0 scale-x-0 group-hover/volume:w-20 group-hover/volume:scale-x-100 transition-all origin-left accent-brand-mint h-1"
                        }
                      />
                    </div>
                  )}
                  
                  <span className="text-[10px] sm:text-xs font-medium tracking-wide">
                    {formatTime(currentTime)} <span className="text-white/50 mx-0.5 sm:mx-1">/</span> {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative">
                    <button 
                      onClick={() => setShowSettings(!showSettings)}
                      className={`hover:text-brand-mint transition-colors ${showSettings ? 'text-brand-mint' : ''}`}
                      title="Playback Speed"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    
                    <AnimatePresence>
                      {showSettings && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-4 bg-black/90 backdrop-blur-md rounded-xl border border-white/10 p-2 min-w-[120px] shadow-2xl z-50"
                        >
                          <div className="text-xs font-semibold text-white/50 px-3 py-1 mb-1">Speed</div>
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                            <button
                              key={rate}
                              onClick={() => {
                                setPlaybackRate(rate);
                                if (videoRef.current) videoRef.current.playbackRate = rate;
                                setShowSettings(false);
                              }}
                              className={`block w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 transition-colors ${playbackRate === rate ? 'text-brand-mint font-bold' : 'text-white'}`}
                            >
                              {rate}x
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <button onClick={toggleFullscreen} className="hover:text-brand-mint transition-colors" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error Overlay with Auto-Recovery ── */}
      {playbackError && (
        <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 shadow-lg ${
            errorType === 'network' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'
          }`}>
            {errorType === 'network' ? (
              <WifiOff className="w-6 h-6" />
            ) : (
              <span className="text-xl font-bold">!</span>
            )}
          </div>
          <h3 className="text-lg font-bold mb-2">
            {errorType === 'network' ? 'Connection Interrupted' : errorType === 'media' ? 'Media Decoding Issue' : 'Stream Session Stalled'}
          </h3>
          <p className="text-sm text-white/60 text-center max-w-sm mb-5">
            {errorType === 'network'
              ? 'The video stream was interrupted. Reconnecting with a fresh secure stream...'
              : 'The video stream encountered a temporary playback issue. Click retry to reconnect seamlessly.'}
          </p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-mint text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-brand-mint/90 transition-all active:scale-[0.97] shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect Stream
            </button>
            {autoRetryCountdown !== null && autoRetryCountdown > 0 && (
              <span className="text-[11px] text-white/40 font-medium">
                Auto-reconnecting in {autoRetryCountdown}s…
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── DevTools / Protection Warning ── */}
      {isDevToolsOpen && (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center text-white p-6">
          <h3 className="text-2xl font-bold text-danger mb-2">Protected Content</h3>
          <p className="text-sm text-white/60 text-center mb-4">Screen recording and developer tools are not permitted during playback.</p>
          <button 
            onClick={() => setIsDevToolsOpen(false)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Dismiss Warning
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
