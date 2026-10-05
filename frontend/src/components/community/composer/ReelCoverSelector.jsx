import { useState, useRef, useEffect } from 'react';
import {
  Image,
  Upload,
  Check,
  X,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Loader2,
  Film,
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * ReelCoverSelector — Dedicated Cover & Poster Studio for Zeitnah Reels:
 * - Frame extraction from the active video at any seek position via HTML5 Canvas
 * - Generates high-quality JPEG blob (aspect-ratio preserved)
 * - Optional custom image cover upload (max 8MB, jpg/png/webp)
 * - Safe memory management and preview URL cleanup
 */
export default function ReelCoverSelector({
  isOpen,
  onClose,
  videoRef,
  videoDuration = 0,
  currentTime = 0,
  currentCoverPreview = null,
  onApplyCover,
}) {
  const [scrubTime, setScrubTime] = useState(currentTime || 0);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const customCoverInputRef = useRef(null);

  // Sync scrub time when opened
  useEffect(() => {
    if (isOpen) {
      setScrubTime(currentTime || 0);
    }
  }, [isOpen, currentTime]);

  // Cleanup object URLs generated locally
  useEffect(() => {
    return () => {
      if (capturedPreview && capturedPreview.startsWith('blob:')) {
        URL.revokeObjectURL(capturedPreview);
      }
    };
  }, [capturedPreview]);

  if (!isOpen) return null;

  const handleSliderChange = (e) => {
    const time = parseFloat(e.target.value);
    setScrubTime(time);
    if (videoRef?.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleCaptureCurrentFrame = () => {
    const video = videoRef?.current;
    if (!video) {
      toast.error('Video preview unavailable.');
      return;
    }

    setIsExtracting(true);
    try {
      const width = video.videoWidth || 720;
      const height = video.videoHeight || 1280;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          setIsExtracting(false);
          if (!blob) {
            toast.error("Couldn't generate a cover from this frame.");
            return;
          }
          if (capturedPreview && capturedPreview.startsWith('blob:')) {
            URL.revokeObjectURL(capturedPreview);
          }
          const blobUrl = URL.createObjectURL(blob);
          const file = new File([blob], `reel-poster-${Math.round(scrubTime)}s.jpg`, {
            type: 'image/jpeg',
          });
          setCapturedPreview(blobUrl);
          setCapturedFile(file);
          toast.success('Frame captured!');
        },
        'image/jpeg',
        0.88
      );
    } catch {
      setIsExtracting(false);
      toast.error("Couldn't generate a cover from this frame.");
    }
  };

  const handleCustomImageSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Cover image must be 8 MB or smaller.');
      if (customCoverInputRef.current) customCoverInputRef.current.value = '';
      return;
    }

    const ext = (file.name || '').split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      toast.error('Please upload a JPG, PNG, or WebP cover image.');
      if (customCoverInputRef.current) customCoverInputRef.current.value = '';
      return;
    }

    if (capturedPreview && capturedPreview.startsWith('blob:')) {
      URL.revokeObjectURL(capturedPreview);
    }
    const blobUrl = URL.createObjectURL(file);
    setCapturedPreview(blobUrl);
    setCapturedFile(file);
    toast.success('Custom cover image loaded');
  };

  const handleConfirm = () => {
    if (capturedFile && capturedPreview) {
      onApplyCover({
        file: capturedFile,
        previewUrl: capturedPreview,
        source: 'custom_frame',
        timestamp: scrubTime,
      });
    }
    onClose();
  };

  const handleResetToAuto = () => {
    if (capturedPreview && capturedPreview.startsWith('blob:')) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedPreview(null);
    setCapturedFile(null);
    onApplyCover(null);
    toast('Using auto-generated video poster.', { icon: 'ℹ️' });
    onClose();
  };

  const formatSecs = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const activeDisplayUrl = capturedPreview || currentCoverPreview;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-selector-title"
    >
      <div className="w-full max-w-md bg-[#09111F] border border-white/[0.1] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-brand-mint" />
            <h3 id="cover-selector-title" className="text-sm sm:text-base font-bold text-white">
              Choose Reel Cover
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close cover selector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Cover Preview Stage */}
        <div className="flex justify-center">
          <div className="relative w-36 sm:w-44 aspect-[9/16] rounded-2xl bg-black/70 border border-white/[0.1] overflow-hidden shadow-lg flex items-center justify-center">
            {activeDisplayUrl ? (
              <img
                src={activeDisplayUrl}
                alt="Selected cover preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-3 text-text-muted">
                <Image className="w-8 h-8 mx-auto mb-1 text-brand-mint/60" />
                <p className="text-[10px] leading-tight">Default poster at 1.0s</p>
              </div>
            )}

            {isExtracting && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-brand-mint" />
              </div>
            )}
          </div>
        </div>

        {/* Video Scrubber to pick frame */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium text-white/90">Scrub video for frame</span>
            <span className="font-mono text-brand-mint font-semibold">{formatSecs(scrubTime)}</span>
          </div>

          <input
            type="range"
            min="0"
            max={videoDuration || 90}
            step="0.1"
            value={scrubTime}
            onChange={handleSliderChange}
            className="w-full h-2 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-brand-mint"
            aria-label="Seek video frame for cover"
          />

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleCaptureCurrentFrame}
              disabled={isExtracting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-brand-mint border border-brand-mint/30 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Use this frame</span>
            </button>

            <button
              type="button"
              onClick={() => customCoverInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-text-muted hover:text-white border border-white/[0.06] transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload image</span>
            </button>
            <input
              ref={customCoverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCustomImageSelected}
              className="hidden"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={handleResetToAuto}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-text-muted hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs text-text-muted hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-brand-mint text-[#070B14] text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Cover</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
