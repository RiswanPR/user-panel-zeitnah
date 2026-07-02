import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import VideoWatermark from './VideoWatermark';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Loader2, FastForward, Rewind } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const VideoPlayer = ({ src, watermarkData, onProgress, initialTime }) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const progressIntervalRef = useRef(null);
  
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);

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
  }, []);

  // Controls Hide Timer
  useEffect(() => {
    let timeout;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (playing && !showSettings) setShowControls(false);
      }, 3000);
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', () => {
        if (playing && !showSettings) setShowControls(false);
      });
    }
    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      clearTimeout(timeout);
    };
  }, [playing, showSettings]);

  // HLS Setup
  useEffect(() => {
    setPlaybackError(false);
    setPlaying(false);

    if (!src || !videoRef.current) return;
    const video = videoRef.current;
    if (hlsRef.current) hlsRef.current.destroy();

    if (Hls.isSupported() && src.endsWith('.m3u8')) {
      const token = localStorage.getItem('token');
      const hls = new Hls({
        xhrSetup: (xhr, url) => {
          if (url.includes('/api/courses/video/') && token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
        },
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (initialTime && initialTime > 0) {
          video.currentTime = initialTime;
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setPlaybackError(true);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        if (initialTime && initialTime > 0) video.currentTime = initialTime;
      });
    } else {
      video.src = src;
    }

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [src, initialTime]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleMute = () => setMuted(!muted);

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const m = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
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

  // Anti-Piracy
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (videoRef.current) videoRef.current.pause();
      }
    };
    
    const handleContextMenu = (e) => e.preventDefault();
    const handleDevTools = (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key))) {
        e.preventDefault();
        setIsDevToolsOpen(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleDevTools);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleDevTools);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden select-none group font-sans ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
      onDoubleClick={toggleFullscreen}
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
        onLoadedMetadata={updateProgress}
        onClick={togglePlay}
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
            
            <div className="relative z-10 px-6 py-4 pointer-events-auto">
              {/* Progress Bar */}
              <div 
                className="relative h-1.5 w-full bg-white/20 rounded-full mb-4 cursor-pointer hover:h-2 transition-all group/progress"
                onClick={handleSeek}
              >
                <div 
                  className="absolute h-full bg-white/40 rounded-full pointer-events-none"
                  style={{ width: \`\${(buffered / duration) * 100}%\` }}
                />
                <div 
                  className="absolute h-full bg-brand-mint rounded-full pointer-events-none"
                  style={{ width: \`\${(currentTime / duration) * 100}%\` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow" />
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                  <button onClick={togglePlay} className="hover:text-brand-mint transition-colors">
                    {playing ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                  </button>
                  
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
                      className="w-0 scale-x-0 group-hover/volume:w-20 group-hover/volume:scale-x-100 transition-all origin-left accent-brand-mint h-1"
                    />
                  </div>
                  
                  <span className="text-xs font-medium tracking-wide">
                    {formatTime(currentTime)} <span className="text-white/50 mx-1">/</span> {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    <button 
                      onClick={() => setShowSettings(!showSettings)}
                      className={`hover:text-brand-mint transition-colors \${showSettings ? 'text-brand-mint' : ''}`}
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
                                videoRef.current.playbackRate = rate;
                                setShowSettings(false);
                              }}
                              className={`block w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 transition-colors \${playbackRate === rate ? 'text-brand-mint font-bold' : 'text-white'}`}
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
          <p className="text-sm text-white/60 text-center max-w-sm">The video stream was interrupted. Please refresh the page to try again.</p>
        </div>
      )}

      {isDevToolsOpen && (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center text-white p-6">
          <h3 className="text-2xl font-bold text-danger mb-2">Protected Content</h3>
          <p className="text-sm text-white/60 text-center">Screen recording and developer tools are not permitted during playback.</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
