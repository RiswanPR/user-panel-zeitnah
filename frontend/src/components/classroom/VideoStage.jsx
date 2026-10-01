import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, Loader2, Lock } from 'lucide-react';
import VideoPlayer from '../player/VideoPlayer';
import VideoWatermark from '../player/VideoWatermark';
import FeatureErrorBoundary from '../common/FeatureErrorBoundary';

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
  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.08] bg-black shadow-2xl shadow-black/80 transition-all">
      {/* Top subtle ambient glow line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-mint/40 to-transparent z-10" />

      {/* Video Box with strict 16:9 Aspect Ratio */}
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-mint text-bg-base font-bold text-xs uppercase tracking-wider hover:bg-brand-mint/90 transition-all cursor-pointer"
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
            <>
              <iframe
                ref={iframeRef}
                src={videoUrl}
                className="h-full w-full block border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                title={classTitle || 'Video Lecture'}
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
                    onClick={onVdoReload}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-mint text-bg-base font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-brand-mint/90 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reload Player
                  </button>
                </div>
              )}
            </>
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
        className="h-1 w-full bg-white/[0.06] relative overflow-hidden"
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
