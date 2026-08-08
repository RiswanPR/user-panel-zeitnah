import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import VideoWatermark from './VideoWatermark';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Detect iOS — volume control is hardware-only on iOS Safari
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Detect any touch device
const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

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

  // HLS Setup — only depends on `src`, NOT initialTime (uses ref to avoid recreation)
  useEffect(() => {
    Promise.resolve().then(() => {
      setPlaybackError(false);
      setPlaying(false);
    });

    // Reset retry counters on new source
    networkRetryRef.current = 0;
    mediaRetryRef.current = 0;

    if (!src || !videoRef.current) return;
    const video = videoRef.current;
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported() && src.endsWith('.m3u8')) {
      const hls = new Hls({
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
      });

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
                setPlaybackError(true);
                hls.destroy();
                hlsRef.current = null;
              }
              break;
            default:
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
  const handleVideoError = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const error = video.error;
    // MediaError.MEDIA_ERR_ABORTED (1) is usually user-initiated, ignore it
    if (error && error.code !== 1) {
      console.error('Video element error:', error.code, error.message);
      setPlaybackError(true);
    }
  }, []);

  // Retry handler for the error overlay
  const handleRetry = useCallback(() => {
    setPlaybackError(false);
    networkRetryRef.current = 0;
    mediaRetryRef.current = 0;
    // Force HLS re-initialization by re-setting the same src
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported() && src.endsWith('.m3u8')) {
      // Re-trigger the HLS effect by destroying + setting a micro state change
      // Simplest approach: reload from scratch
      const hls = new Hls({
        xhrSetup: (xhr, url) => {
          const currentToken = localStorage.getItem('token');
          if (url.includes('/api/courses/video/') && currentToken) {
            xhr.setRequestHeader('Authorization', `Bearer ${currentToken}`);
          }
        },
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 120 * 1000000,
        maxBufferHole: 0.5,
        backBufferLength: 30,
        startLevel: -1,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        enableWorker: true,
        progressive: true,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
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

      {playbackError && (
        <div className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center text-white p-6">
          <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center text-danger mb-4">
            <span className="text-xl font-bold">!</span>
          </div>
          <h3 className="text-lg font-bold mb-2">Playback Error</h3>
          <p className="text-sm text-white/60 text-center max-w-sm mb-5">
            The video stream was interrupted. This may be due to a network issue or an expired session.
          </p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-mint text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-brand-mint/90 transition-all active:scale-[0.97]"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Playback
          </button>
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
