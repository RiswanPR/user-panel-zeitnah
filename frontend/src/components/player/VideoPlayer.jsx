import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import VideoWatermark from './VideoWatermark';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Detect iOS — volume control is hardware-only on iOS Safari
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Detect any touch device
const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ── Shared HLS configuration ──
// Single source of truth for all HLS instances (initial load + retry)
function createHlsConfig() {
  return {
    xhrSetup: (xhr, url) => {
      const currentToken = localStorage.getItem('token');
      if (url.includes('/api/courses/video/') && currentToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${currentToken}`);
      }
    },
    // ── Buffer management ──
    maxBufferLength: 30,           // Buffer up to 30s ahead
    maxMaxBufferLength: 600,       // Allow up to 10 min max buffer
    maxBufferSize: 120 * 1000000,  // 120MB memory cap for buffer
    maxBufferHole: 0.5,            // Tolerate 0.5s gaps in buffer
    backBufferLength: 30,          // Keep only 30s of played-back buffer

    // ── ABR (Adaptive Bitrate) ──
    startLevel: -1,                        // Auto-detect best starting quality
    abrEwmaDefaultEstimate: 500000,        // 500kbps conservative initial estimate
    abrEwmaDefaultEstimateMax: 5000000,    // 5Mbps max estimate
    abrBandWidthFactor: 0.95,              // Use 95% of measured bandwidth
    abrBandWidthUpFactor: 0.7,             // Be cautious upgrading quality
    testBandwidth: true,                   // Measure bandwidth actively

    // ── Stall recovery ──
    maxStarvationDelay: 2,   // Downgrade quality after 2s stall (default 4s)
    maxLoadingDelay: 4,      // Timeout slow segments after 4s
    lowLatencyMode: false,   // VOD, not live

    // ── Segment loading resilience ──
    fragLoadingTimeOut: 20000,     // 20s timeout per segment
    fragLoadingMaxRetry: 6,        // Retry failed segments 6 times
    fragLoadingRetryDelay: 1000,   // 1s delay between retries
    levelLoadingTimeOut: 10000,    // 10s timeout for level playlists
    levelLoadingMaxRetry: 4,       // Retry level playlists 4 times

    // ── Performance ──
    enableWorker: true,     // Parse segments off main thread
    progressive: true,      // Start playback before full segment download
  };
}

export const VideoPlayer = ({ src, watermarkData, onProgress, initialTime }) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const initialTimeRef = useRef(initialTime);

  // Single-tap / double-tap disambiguation refs
  const tapTimerRef = useRef(null);
  const tapCountRef = useRef(0);

  // HLS recovery retry counters
  const networkRetryRef = useRef(0);
  const mediaRetryRef = useRef(0);
  const MAX_NETWORK_RETRIES = 3;
  const MAX_MEDIA_RETRIES = 2;

  // Stall watchdog refs
  const stallWatchdogRef = useRef(null);
  const stallRecoveryCountRef = useRef(0);
  const MAX_STALL_RECOVERIES = 2;

  // Native HLS (Safari) retry refs
  const nativeRetryRef = useRef(0);
  const MAX_NATIVE_RETRIES = 2;

  // Keep ref in sync but don't trigger re-renders
  useEffect(() => {
    initialTimeRef.current = initialTime;
  }, [initialTime]);

  
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
  // Tracks error type for differentiated UI messages
  const [errorType, setErrorType] = useState('unknown'); // 'network' | 'media' | 'unknown'
  // Auto-retry countdown (seconds remaining); null = no countdown active
  const [autoRetryCountdown, setAutoRetryCountdown] = useState(null);
  // Network offline indicator
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Refs mirroring state for use inside event handlers (avoids stale closures)
  const playbackErrorRef = useRef(false);
  const errorTypeRef = useRef('unknown');
  useEffect(() => { playbackErrorRef.current = playbackError; }, [playbackError]);
  useEffect(() => { errorTypeRef.current = errorType; }, [errorType]);

  // Keep playbackRate in a ref so the HLS callback can read the latest value
  const playbackRateRef = useRef(playbackRate);
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Play was interrupted by a call to pause() or auto-play was prevented.
          console.log('Playback interrupted:', error);
        });
      }
    } else {
      videoRef.current.pause();
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const isFullscreenNow =
      document.fullscreenElement ||
      document.webkitFullscreenElement;

    if (!isFullscreenNow) {
      // Try standard API first, then webkit prefix (Safari/iOS)
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }, []);

  const toggleMute = useCallback(() => setMuted(prev => !prev), []);

  // ── Single-tap vs double-tap disambiguation ──
  // On touch: single tap = play/pause, double tap = fullscreen
  // Prevents both from firing on a double-tap
  const handleVideoTap = useCallback(() => {
    tapCountRef.current += 1;

    if (tapCountRef.current === 1) {
      // Wait to see if another tap comes within 300ms
      tapTimerRef.current = setTimeout(() => {
        // Single tap confirmed — toggle play/pause
        tapCountRef.current = 0;
        togglePlay();
      }, 300);
    } else if (tapCountRef.current === 2) {
      // Double tap — cancel the pending single-tap action
      clearTimeout(tapTimerRef.current);
      tapCountRef.current = 0;
      toggleFullscreen();
    }
  }, [togglePlay, toggleFullscreen]);

  // Cleanup tap timer on unmount
  useEffect(() => {
    return () => { clearTimeout(tapTimerRef.current); };
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!videoRef.current) return;
      
      switch(e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowright':
          e.preventDefault();
          videoRef.current.currentTime += 10;
          break;
        case 'arrowleft':
          e.preventDefault();
          videoRef.current.currentTime -= 10;
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen, toggleMute, togglePlay]);

  // Controls Hide Timer — supports both mouse and touch
  useEffect(() => {
    let timeout;
    const resetHideTimer = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (playing && !showSettings) setShowControls(false);
      }, 3000);
    };
    const handleMouseLeave = () => {
      if (playing && !showSettings) setShowControls(false);
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', resetHideTimer);
      container.addEventListener('mouseleave', handleMouseLeave);
      // Touch devices: reset timer on any touch interaction
      container.addEventListener('touchstart', resetHideTimer, { passive: true });
    }
    return () => {
      if (container) {
        container.removeEventListener('mousemove', resetHideTimer);
        container.removeEventListener('mouseleave', handleMouseLeave);
        container.removeEventListener('touchstart', resetHideTimer);
      }
      clearTimeout(timeout);
    };
  }, [playing, showSettings]);

  // ── Stall watchdog ──
  // Detects when the video is stuck in a "waiting" state for too long and
  // attempts recovery (seek-nudge, HLS recoverMediaError, or full reload).
  // This directly addresses the FFmpegDemuxer stuck-spinner scenario.
  useEffect(() => {
    // Start watchdog when buffering begins during active playback
    if (isBuffering && playing && !playbackError) {
      stallWatchdogRef.current = setTimeout(() => {
        const video = videoRef.current;
        const hls = hlsRef.current;
        if (!video || playbackErrorRef.current) return;

        stallRecoveryCountRef.current += 1;
        const attempt = stallRecoveryCountRef.current;
        console.warn(`Stall watchdog fired (attempt ${attempt}/${MAX_STALL_RECOVERIES})`);

        if (attempt <= MAX_STALL_RECOVERIES) {
          // Try graduated recovery strategies
          if (hls) {
            if (attempt === 1) {
              // First attempt: seek nudge + restart loading
              console.warn('Stall recovery: seek nudge + startLoad');
              const nudge = video.currentTime + 0.2;
              if (Number.isFinite(nudge) && nudge < (video.duration || Infinity)) {
                video.currentTime = nudge;
              }
              hls.startLoad();
            } else {
              // Second attempt: full media error recovery
              console.warn('Stall recovery: recoverMediaError');
              hls.recoverMediaError();
            }
          } else {
            // Native HLS or direct source — reload
            const resumeTime = video.currentTime;
            video.load();
            video.addEventListener('loadedmetadata', () => {
              video.currentTime = resumeTime;
              video.play().catch(() => {});
            }, { once: true });
          }
        } else {
          // Max recoveries exhausted — show error with auto-retry
          console.error('Stall watchdog: max recoveries exhausted, showing error overlay');
          setErrorType('network');
          setPlaybackError(true);
        }
      }, 15000); // 15-second stall threshold
    }

    return () => {
      // Clear watchdog when buffering ends or component re-renders
      if (stallWatchdogRef.current) {
        clearTimeout(stallWatchdogRef.current);
        stallWatchdogRef.current = null;
      }
    };
  }, [isBuffering, playing, playbackError]);

  // Reset stall recovery counter when playback resumes normally
  useEffect(() => {
    if (playing && !isBuffering) {
      stallRecoveryCountRef.current = 0;
    }
  }, [playing, isBuffering]);

  // ── Network online/offline listener ──
  // Auto-restarts HLS loading when connectivity is restored (common on mobile).
  // Uses refs (playbackErrorRef, errorTypeRef) to avoid stale closures.
  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      console.warn('Network offline detected');
    };

    const handleOnline = () => {
      setIsOffline(false);
      console.log('Network online restored');

      const hls = hlsRef.current;
      const video = videoRef.current;

      // Reset retry counters — the connection is back
      networkRetryRef.current = 0;
      mediaRetryRef.current = 0;
      stallRecoveryCountRef.current = 0;

      if (hls) {
        // HLS instance still alive — just restart loading
        hls.startLoad();
        console.log('HLS loading restarted after network recovery');
      } else if (playbackErrorRef.current && errorTypeRef.current === 'network' && video && src) {
        // HLS was destroyed after max retries — need to re-create it
        console.log('HLS was destroyed, re-initializing after network recovery');
        if (Hls.isSupported() && src.endsWith('.m3u8')) {
          const newHls = new Hls(createHlsConfig());
          hlsRef.current = newHls;
          newHls.loadSource(src);
          newHls.attachMedia(video);
          newHls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
          });
          newHls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              const type = data.type === Hls.ErrorTypes.NETWORK_ERROR ? 'network'
                : data.type === Hls.ErrorTypes.MEDIA_ERROR ? 'media' : 'unknown';
              setErrorType(type);
              setPlaybackError(true);
              newHls.destroy();
              hlsRef.current = null;
            }
          });
        }
      }

      // If we were showing an error overlay from a network failure, auto-clear it
      if (playbackErrorRef.current && errorTypeRef.current === 'network') {
        setPlaybackError(false);
        setErrorType('unknown');
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [src]); // src is the only stable dependency needed

  // ── Visibility change recovery ──
  // On Android Chrome, backgrounding a tab can stall the media pipeline.
  // When the tab becomes visible again, check if playback is stalled and recover.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      const video = videoRef.current;
      const hls = hlsRef.current;
      if (!video || playbackError) return;

      // If the video was supposed to be playing but is now stalled
      const isStalled = !video.paused && (video.readyState < 3 || isBuffering);
      if (isStalled) {
        console.warn('Tab restored — playback appears stalled, attempting recovery');

        if (hls) {
          // Restart HLS loading to re-fetch segments
          hls.startLoad();
        }

        // Seek nudge to kick the media pipeline
        const nudge = video.currentTime + 0.1;
        if (Number.isFinite(nudge) && nudge < (video.duration || Infinity)) {
          video.currentTime = nudge;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [playbackError, isBuffering]);

  // HLS Setup — only depends on `src`, NOT initialTime (uses ref to avoid recreation)
  useEffect(() => {
    Promise.resolve().then(() => {
      setPlaybackError(false);
      setErrorType('unknown');
      setAutoRetryCountdown(null);
      setPlaying(false);
    });

    // Reset all retry counters on new source
    networkRetryRef.current = 0;
    mediaRetryRef.current = 0;
    stallRecoveryCountRef.current = 0;
    nativeRetryRef.current = 0;

    if (!src || !videoRef.current) return;
    const video = videoRef.current;
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported() && src.endsWith('.m3u8')) {
      const hls = new Hls(createHlsConfig());

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const resumeAt = initialTimeRef.current;
        if (resumeAt && resumeAt > 0) {
          video.currentTime = resumeAt;
        }
        // Re-apply playback rate after source change
        const rate = playbackRateRef.current;
        if (rate !== 1) {
          video.playbackRate = rate;
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkRetryRef.current += 1;
              if (networkRetryRef.current <= MAX_NETWORK_RETRIES) {
                console.warn(`HLS fatal network error, recovery attempt ${networkRetryRef.current}/${MAX_NETWORK_RETRIES}...`);
                hls.startLoad();
              } else {
                console.error('HLS fatal network error — max retries exceeded.');
                setErrorType('network');
                setPlaybackError(true);
                hls.destroy();
                hlsRef.current = null;
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              mediaRetryRef.current += 1;
              if (mediaRetryRef.current <= MAX_MEDIA_RETRIES) {
                console.warn(`HLS fatal media error, recovery attempt ${mediaRetryRef.current}/${MAX_MEDIA_RETRIES}...`);
                hls.recoverMediaError();
              } else {
                console.error('HLS fatal media error — max retries exceeded.');
                setErrorType('media');
                setPlaybackError(true);
                hls.destroy();
                hlsRef.current = null;
              }
              break;
            default:
              setErrorType('unknown');
              setPlaybackError(true);
              hls.destroy();
              hlsRef.current = null;
              break;
          }
        } else {
          // Non-fatal error recovery — prevents silent freezes from buffer stalls
          if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
            console.warn('HLS buffer stalled, nudging playback...');
            if (video.paused) return;
            // Small seek nudge to unstick the buffer
            const nudge = video.currentTime + 0.1;
            if (Number.isFinite(nudge) && nudge < (video.duration || Infinity)) {
              video.currentTime = nudge;
            }
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari / iOS)
      nativeRetryRef.current = 0;
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        const resumeAt = initialTimeRef.current;
        if (resumeAt && resumeAt > 0) video.currentTime = resumeAt;
        // Re-apply playback rate for native HLS too
        const rate = playbackRateRef.current;
        if (rate !== 1) {
          video.playbackRate = rate;
        }
      });
    } else {
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);



  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(document.fullscreenElement || document.webkitFullscreenElement)
      );
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);



  // Format time — supports hours for long videos
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return "00:00";
    const totalSeconds = Math.floor(timeInSeconds);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    // Only show hours if the video is longer than 60 minutes
    if (h > 0 || duration >= 3600) {
      return `${h}:${m}:${s}`;
    }
    return `${m}:${s}`;
  };

  // Seek handler — supports both mouse click and touch
  const handleSeek = (e) => {
    if (!videoRef.current || !duration || isNaN(duration) || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Use touch position if available, otherwise mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    if (Number.isFinite(targetTime)) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const updateProgress = () => {
    if (!videoRef.current) return;
    const { currentTime, duration, buffered } = videoRef.current;
    setCurrentTime(currentTime);
    setDuration(duration);
    
    if (buffered.length > 0) {
      setBuffered(buffered.end(buffered.length - 1));
    }

    if (onProgress) {
      onProgress({ currentTime, duration });
    }
  };

  // Handle native video element errors (e.g. 403, corrupt segment on Safari native HLS)
  // Includes retry logic for native HLS — attempts reload before giving up
  const handleVideoError = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const error = video.error;
    // MediaError.MEDIA_ERR_ABORTED (1) is usually user-initiated, ignore it
    if (!error || error.code === 1) return;

    console.error('Video element error:', error.code, error.message);

    // If using HLS.js, let the HLS error handler deal with it
    if (hlsRef.current) return;

    // Native HLS (Safari) or direct source — attempt retries
    nativeRetryRef.current += 1;
    if (nativeRetryRef.current <= MAX_NATIVE_RETRIES) {
      console.warn(`Native video error, retry attempt ${nativeRetryRef.current}/${MAX_NATIVE_RETRIES}`);
      const resumeTime = video.currentTime;
      video.load();
      video.addEventListener('loadedmetadata', () => {
        if (resumeTime > 0) video.currentTime = resumeTime;
        video.play().catch(() => {});
      }, { once: true });
    } else {
      // Determine error type from MediaError code
      const type = error.code === 2 ? 'network' : error.code === 3 ? 'media' : 'unknown';
      setErrorType(type);
      setPlaybackError(true);
    }
  }, []);

  // Retry handler for the error overlay — uses shared HLS config for full resilience
  const handleRetry = useCallback(() => {
    setPlaybackError(false);
    setErrorType('unknown');
    setAutoRetryCountdown(null);
    networkRetryRef.current = 0;
    mediaRetryRef.current = 0;
    stallRecoveryCountRef.current = 0;
    nativeRetryRef.current = 0;

    // Force HLS re-initialization
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported() && src.endsWith('.m3u8')) {
      const hls = new Hls(createHlsConfig());
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          const type = data.type === Hls.ErrorTypes.NETWORK_ERROR ? 'network'
            : data.type === Hls.ErrorTypes.MEDIA_ERROR ? 'media' : 'unknown';
          setErrorType(type);
          setPlaybackError(true);
          hls.destroy();
          hlsRef.current = null;
        }
      });
    } else {
      video.src = src;
      video.load();
    }
  }, [src]);

  // ── Auto-retry countdown ──
  // When a recoverable error occurs, start a 10-second countdown then auto-retry
  useEffect(() => {
    if (!playbackError) {
      setAutoRetryCountdown(null);
      return;
    }

    // Only auto-retry for network errors (most likely to be transient)
    if (errorType !== 'network') return;

    let seconds = 10;
    setAutoRetryCountdown(seconds);

    const interval = setInterval(() => {
      seconds -= 1;
      setAutoRetryCountdown(seconds);
      if (seconds <= 0) {
        clearInterval(interval);
        handleRetry();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [playbackError, errorType, handleRetry]);

  // Anti-Piracy — context menu + devtools blocked; visibility pause removed to prevent unexpected freezes
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

  // Determine if we should show volume controls
  // iOS doesn't support programmatic volume — hide entirely
  const showVolumeControl = !IS_IOS;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden select-none group font-sans ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
      // Desktop: double-click for fullscreen (no conflict since click is on <video>)
      // Touch: handled by handleVideoTap disambiguation
      onDoubleClick={IS_TOUCH ? undefined : toggleFullscreen}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
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
        // Touch: use tap disambiguation; Desktop: direct click
        onClick={IS_TOUCH ? handleVideoTap : togglePlay}
      />

      {isBuffering && !playbackError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-12 h-12 text-brand-mint animate-spin" />
        </div>
      )}

      {/* Network offline indicator — subtle top banner */}
      <AnimatePresence>
        {isOffline && !playbackError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center gap-2 bg-danger/90 backdrop-blur-sm px-4 py-2 text-white text-xs font-semibold"
          >
            <WifiOff className="w-3.5 h-3.5" />
            No internet connection — will reconnect automatically
          </motion.div>
        )}
      </AnimatePresence>

      {watermarkData && <VideoWatermark user={watermarkData} />}

      {/* Custom Controls */}
      <AnimatePresence>
        {(showControls || !playing) && !playbackError && !isDevToolsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col justify-end pointer-events-none"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            
            <div className="relative z-10 px-4 sm:px-6 py-3 sm:py-4 pointer-events-auto">
              {/* Progress Bar — supports both click and touch */}
              <div 
                className="relative h-2 sm:h-1.5 w-full bg-white/20 rounded-full mb-3 sm:mb-4 cursor-pointer sm:hover:h-2 transition-all group/progress"
                onClick={handleSeek}
                onTouchStart={handleSeek}
              >
                <div 
                  className="absolute h-full bg-white/40 rounded-full pointer-events-none"
                  style={{ width: `${duration > 0 ? (buffered / duration) * 100 : 0}%` }}
                />
                <div 
                  className="absolute h-full bg-brand-mint rounded-full pointer-events-none"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-3 sm:h-3 bg-white rounded-full sm:scale-0 sm:group-hover/progress:scale-100 transition-transform shadow" />
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3 sm:gap-4">
                  <button onClick={togglePlay} className="hover:text-brand-mint transition-colors p-1">
                    {playing ? <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />}
                  </button>
                  
                  {showVolumeControl && (
                    <div className="flex items-center gap-2 group/volume">
                      <button onClick={toggleMute} className="hover:text-brand-mint transition-colors">
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
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    
                    <AnimatePresence>
                      {showSettings && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-4 bg-black/80 backdrop-blur-md rounded-xl border border-white/10 p-2 min-w-[120px]"
                        >
                          <div className="text-xs font-semibold text-white/50 px-3 py-1 mb-1">Speed</div>
                          {[0.5, 1, 1.25, 1.5, 2].map(rate => (
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
                  
                  <button onClick={toggleFullscreen} className="hover:text-brand-mint transition-colors">
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error overlay with differentiated messages + auto-retry countdown ── */}
      {playbackError && (
        <div className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center text-white p-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            errorType === 'network' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'
          }`}>
            {errorType === 'network' ? (
              <WifiOff className="w-6 h-6" />
            ) : (
              <span className="text-xl font-bold">!</span>
            )}
          </div>
          <h3 className="text-lg font-bold mb-2">
            {errorType === 'network' ? 'Connection Lost' : errorType === 'media' ? 'Video Decode Error' : 'Playback Error'}
          </h3>
          <p className="text-sm text-white/60 text-center max-w-sm mb-5">
            {errorType === 'network'
              ? 'The video stream was interrupted due to a network issue. Please check your internet connection.'
              : errorType === 'media'
                ? 'The video data could not be decoded. This is usually a temporary issue.'
                : 'The video stream was interrupted. This may be due to a network issue or an expired session.'}
          </p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-mint text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-brand-mint/90 transition-all active:scale-[0.97]"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Playback
            </button>
            {autoRetryCountdown !== null && autoRetryCountdown > 0 && (
              <span className="text-[11px] text-white/40 font-medium">
                Auto-retrying in {autoRetryCountdown}s…
              </span>
            )}
          </div>
        </div>
      )}

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
