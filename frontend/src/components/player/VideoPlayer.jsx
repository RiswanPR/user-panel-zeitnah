import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import VideoWatermark from './VideoWatermark';

export const VideoPlayer = ({ src, watermarkData, onProgress, initialTime }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const restoredPositionRef = useRef(false);
  
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);

  useEffect(() => {
    restoredPositionRef.current = false;
    setPlaybackError(false);
    setPlaying(false);

    if (!src || !videoRef.current) return;

    const video = videoRef.current;
    
    // Destroy previous HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    if (Hls.isSupported() && src.endsWith('.m3u8')) {
      const token = localStorage.getItem('token'); // Get auth token for backend playlist proxy
      
      const hls = new Hls({
        xhrSetup: (xhr, url) => {
          // If the request is going to our backend API, attach the token
          if (url.includes('/api/courses/video/') && token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
        }
      });

      hlsRef.current = hls;
      
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (initialTime && initialTime > 0) {
          video.currentTime = initialTime;
          restoredPositionRef.current = true;
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
      // Native HLS support (Safari)
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        if (initialTime && initialTime > 0) {
          video.currentTime = initialTime;
          restoredPositionRef.current = true;
        }
      });
    } else {
      // Fallback for MP4 or non-HLS
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        if (initialTime && initialTime > 0) {
          video.currentTime = initialTime;
          restoredPositionRef.current = true;
        }
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [src, initialTime]);

  const handleTimeUpdate = (event) => {
    if (!onProgress) return;
    const media = event.currentTarget;
    onProgress({
      currentTime: Number(media?.currentTime) || 0,
      duration: Number(media?.duration) || 0,
    });
  };

  // Anti Screen-Recording (Visibility API)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (videoRef.current) videoRef.current.pause();
        setPlaying(false);
      }
    };
    const handleBlur = () => {
      if (videoRef.current) videoRef.current.pause();
      setPlaying(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Anti Screenshot & DevTools Deterrence
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'U') ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        setIsDevToolsOpen(true);
        if (videoRef.current) videoRef.current.pause();
        setPlaying(false);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    let devtoolsOpen = false;
    const threshold = 160;
    const checkDevTools = setInterval(() => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      if (widthThreshold || heightThreshold) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          setIsDevToolsOpen(true);
          if (videoRef.current) videoRef.current.pause();
          setPlaying(false);
        }
      } else {
        devtoolsOpen = false;
        setIsDevToolsOpen(false);
      }
    }, 1000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(checkDevTools);
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none" onDragStart={(e) => e.preventDefault()}>
      
      <div className="w-full h-full absolute inset-0">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls
          playsInline
          controlsList="nodownload noremoteplayback noplaybackrate"
          disablePictureInPicture
          disableRemotePlayback
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => {
            setPlaybackError(true);
            setPlaying(false);
          }}
        />
      </div>

      {watermarkData && (
        <VideoWatermark user={watermarkData} />
      )}

      {isDevToolsOpen && (
        <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center text-white text-xl font-bold">
          Protected Content
        </div>
      )}

      {playbackError && !isDevToolsOpen && (
        <div className="absolute inset-0 z-40 bg-black/85 flex items-center justify-center px-6 text-center text-white text-sm font-semibold">
          This video could not be loaded. Please refresh and try again.
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
