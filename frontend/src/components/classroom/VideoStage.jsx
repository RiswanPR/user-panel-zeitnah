import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, Loader2, Lock, Compass, ExternalLink, Copy, Check, Play } from 'lucide-react';
import VideoPlayer from '../player/VideoPlayer';
import VideoWatermark from '../player/VideoWatermark';
import FeatureErrorBoundary from '../common/FeatureErrorBoundary';
import { isIOSAppOrWebView, isZeitnahNativeApp } from '../../utils/courseUi';

export default function VideoStage({
  isS3Video,
  videoData,
  videoUrl,
  vdoCipher,
  classTitle,
  classProgress,
  isClassCompleted,
  classProgressPercent,
  user,
  iframeRef,
  vdoPlayerError,
  onVdoReload,
  onRefreshPlaybackUrl,
  onProgressUpdate,
}) {
  const [showEmbeddedAnyway, setShowEmbeddedAnyway] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nativeError, setNativeError] = useState(null);
  const isIOSRestricted = useMemo(() => isIOSAppOrWebView(), []);
  const [isNativeApp, setIsNativeApp] = useState(() => isZeitnahNativeApp());

  // Continuously verify if bridge attaches after initial render tick (prevents race conditions)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isZeitnahNativeApp()) {
      setIsNativeApp(true);
      return;
    }
    const checkBridge = () => {
      if (isZeitnahNativeApp()) {
        setIsNativeApp(true);
      }
    };
    const interval = setInterval(checkBridge, 100);
    const timer = setTimeout(() => clearInterval(interval), 2000);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const handlePlayNative = useCallback(() => {
    setNativeError(null);
    if (typeof window === 'undefined') return false;

    const bridge = window.ReactNativeWebView;
    if (!bridge || typeof bridge.postMessage !== 'function') {
      setNativeError('Native app bridge is connecting. Please try again in a moment or watch in Safari Browser.');
      return false;
    }

    if (!vdoCipher?.otp || !vdoCipher?.playbackInfo) {
      setNativeError('Secure video credentials could not be loaded. Please reload player or watch in Safari Browser.');
      return false;
    }

    bridge.postMessage(
      JSON.stringify({
        type: 'PLAY_VDOCIPHER_NATIVE',
        payload: {
          otp: vdoCipher.otp,
          playbackInfo: vdoCipher.playbackInfo,
          classId: classProgress?.classId,
          title: classTitle || 'Lesson Video',
        },
      })
    );
    return true;
  }, [vdoCipher, classProgress, classTitle]);

  useEffect(() => {
    window.__onNativeVdoProgress = (event) => {
      if (typeof event?.currentTime === 'number' && onProgressUpdate) {
        onProgressUpdate({ currentTime: event.currentTime });
      }
    };
    window.__onNativeVdoError = (errorMsg) => {
      setNativeError(typeof errorMsg === 'string' ? errorMsg : 'Native player encountered an error');
    };
    return () => {
      delete window.__onNativeVdoProgress;
      delete window.__onNativeVdoError;
    };
  }, [onProgressUpdate]);

  const getCleanLessonUrl = () => {
    try {
      const parsed = new URL(window.location.href);
      parsed.searchParams.delete('open_external');
      parsed.searchParams.delete('target');
      parsed.searchParams.delete('fallback');
      return parsed.toString();
    } catch {
      return window.location.origin + window.location.pathname;
    }
  };

  const handleOpenInSafari = () => {
    const cleanUrl = getCleanLessonUrl();

    // 1. Send clean URL through native React Native bridge if inside ZeitnahMobile app
    if (
      typeof window !== 'undefined' &&
      window.ReactNativeWebView &&
      typeof window.ReactNativeWebView.postMessage === 'function'
    ) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'OPEN_IN_SAFARI',
          url: cleanUrl,
        })
      );
      return;
    }

    // 2. Standard web fallback for third-party iOS browsers
    try {
      window.open(cleanUrl, '_blank');
    } catch {
      window.location.href = cleanUrl;
    }
  };

  const handleCopyLink = async () => {
    const cleanUrl = getCleanLessonUrl();
    try {
      await navigator.clipboard.writeText(cleanUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-border bg-black shadow-2xl shadow-black/80 transition-all">
      {/* Top subtle ambient glow line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-mint/40 to-transparent z-10" />

      {/* Video Box with strict 16:9 Aspect Ratio (preserved dark stage) */}
      <FeatureErrorBoundary featureName="Video Player">
        <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
          {/* Dynamic Floating Watermark for non-S3/VdoCipher videos */}
          {!isS3Video && <VideoWatermark user={user} />}

          {isS3Video ? (
            videoData?.playbackUrl ? (
              <VideoPlayer
                src={videoData.playbackUrl}
                refreshUrl={onRefreshPlaybackUrl}
                watermarkData={videoData.watermarkData}
                initialTime={Number(classProgress?.lastPositionSeconds || 0)}
                onProgress={onProgressUpdate}
              />
            ) : videoData?.error ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <WifiOff className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold">Failed to load secure video stream</h4>
                <p className="text-xs text-text-muted max-w-sm">
                  We could not verify your playback session. Please check your network connection and retry.
                </p>
                <button
                  type="button"
                  onClick={onRefreshPlaybackUrl}
                  className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl bg-brand-mint text-brand-navy font-bold text-xs uppercase tracking-wider hover:bg-brand-mint/90 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Playback
                </button>
              </div>
            ) : (
              /* Shimmering Loading Skeleton */
              <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-brand-mint animate-spin" />
                <span className="text-xs font-medium text-white/60 tracking-wider">
                  Initializing secure stream...
                </span>
              </div>
            )
          ) : videoUrl ? (
            isIOSRestricted && !showEmbeddedAnyway ? (
              /* Dedicated Apple FairPlay DRM Stage for iOS In-App WebViews (Prevents initializing broken iframe) */
              <div className="absolute inset-0 z-20 bg-[#070B14] flex flex-col items-center justify-center p-6 text-center text-white select-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-36 bg-brand-mint/10 rounded-full blur-3xl pointer-events-none" />

                <div className="w-14 h-14 rounded-2xl bg-brand-mint/10 border border-brand-mint/30 flex items-center justify-center text-brand-mint mb-4 shadow-lg shadow-brand-mint/10 relative z-10">
                  {isNativeApp ? (
                    <Play className="w-7 h-7 text-brand-mint fill-brand-mint/20" />
                  ) : (
                    <Compass className="w-7 h-7 text-brand-mint" />
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-heading font-extrabold text-white mb-2 relative z-10 tracking-tight">
                  {isNativeApp ? 'Watch with Native Player' : 'Play in Safari Browser'}
                </h3>

                <p className="text-xs sm:text-sm text-text-muted max-w-sm mb-5 relative z-10 leading-relaxed">
                  {isNativeApp
                    ? 'Watch this lesson in full HD using the native hardware player with Apple FairPlay DRM acceleration.'
                    : 'Apple FairPlay DRM requires the official Safari browser on iOS devices. Tap below to watch this lesson in full HD.'}
                </p>

                {nativeError && (
                  <div className="mb-4 px-3.5 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center max-w-sm relative z-10">
                    {nativeError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10">
                  {isNativeApp && (
                    <button
                      type="button"
                      onClick={handlePlayNative}
                      className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] bg-brand-mint text-brand-navy font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-brand-mint/90 active:scale-95 transition-all cursor-pointer shadow-lg shadow-brand-mint/20"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Play in App
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleOpenInSafari}
                    className={`inline-flex items-center gap-2 px-6 py-3 min-h-[44px] ${
                      isNativeApp
                        ? 'rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold uppercase tracking-wider'
                        : 'bg-brand-mint text-brand-navy font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-brand-mint/90 shadow-lg shadow-brand-mint/20'
                    } active:scale-95 transition-all cursor-pointer`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Watch in Safari Browser
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-brand-mint" />}
                    <span>{copied ? 'Link Copied' : 'Copy Lesson Link'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEmbeddedAnyway(true)}
                  className="mt-4 text-[11px] text-text-muted hover:text-white transition-colors underline decoration-white/20 underline-offset-4 cursor-pointer relative z-10"
                >
                  Try In-App Player
                </button>
              </div>
            ) : (
              <>
                <iframe
                  ref={iframeRef}
                  src={videoUrl}
                  className="h-full w-full block border-0"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  title={classTitle || 'Video Lecture'}
                />
                {vdoPlayerError && (
                  <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center text-white p-6">
                    <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center text-warning mb-4">
                      <WifiOff className="w-6 h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold mb-2">
                      {typeof vdoPlayerError === 'object' && vdoPlayerError?.title
                        ? vdoPlayerError.title
                        : 'Video Stream Notice'}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/60 text-center max-w-sm mb-5">
                      {typeof vdoPlayerError === 'string'
                        ? vdoPlayerError
                        : vdoPlayerError?.message ||
                          'Stream interrupted by network jitter. Click below to fetch a fresh authenticated session.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={onVdoReload}
                        className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-brand-mint text-brand-navy font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-brand-mint/90 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reload Player
                      </button>
                      {isNativeApp && (
                        <button
                          type="button"
                          onClick={handlePlayNative}
                          className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-brand-mint text-brand-navy font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-brand-mint/90 transition-all cursor-pointer shadow-lg shadow-brand-mint/20"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          Play in App
                        </button>
                      )}
                      {(typeof vdoPlayerError === 'object'
                        ? vdoPlayerError?.showSafariFallback
                        : isIOSRestricted) && (
                        <button
                          type="button"
                          onClick={handleOpenInSafari}
                          className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-white/20"
                        >
                          <Compass className="w-4 h-4 text-brand-mint" />
                          Open in Safari
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-text-muted space-y-2">
              <Lock className="w-8 h-8 text-white/20" />
              <p className="text-sm font-medium">Video is not available for this lesson.</p>
            </div>
          )}
        </div>
      </FeatureErrorBoundary>

      {/* Persistent Micro-Progress Strip below player (Semantic Progressbar A11Y-001) */}
      <div
        role="progressbar"
        aria-label="Lesson video completion progress"
        aria-valuenow={classProgressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1 w-full bg-border/60 relative overflow-hidden"
      >
        <div
          className={`h-full transition-all duration-300 ${
            isClassCompleted
              ? 'bg-emerald-400'
              : 'bg-gradient-to-r from-brand-mint to-brand-yellow'
          }`}
          style={{ width: `${classProgressPercent}%` }}
        />
      </div>
    </div>
  );
}
