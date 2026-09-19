import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Check,
  Eye,
  Image as ImageIcon,
  Sparkles,
  AlertTriangle,
  User,
} from 'lucide-react';

/**
 * Banner export presets
 */
const BANNER_DIMENSIONS = [
  { id: 'recommended', label: 'Recommended', width: 1600, height: 500, desc: '1600 × 500 (Best for desktop & mobile)' },
  { id: 'balanced', label: 'Balanced', width: 1440, height: 480, desc: '1440 × 480 (Fast loading)' },
  { id: 'compact', label: 'Compact', width: 1200, height: 400, desc: '1200 × 400 (Ultra lightweight)' },
];

const QUALITY_PRESETS = [
  { id: 'high', label: 'High', quality: 0.90, desc: 'Highest visual detail' },
  { id: 'balanced', label: 'Balanced', quality: 0.80, desc: 'Optimal size & sharpness' },
  { id: 'compact', label: 'Compact', quality: 0.65, desc: 'Smallest file size' },
];

/**
 * Downscales an HTMLImageElement if it exceeds maxDimension,
 * returning a scaled offscreen canvas or the original image.
 */
function getSafeSource(img, maxDimension = 3200) {
  const { naturalWidth: w, naturalHeight: h } = img;
  if (w <= maxDimension && h <= maxDimension) {
    return img;
  }
  const ratio = Math.min(maxDimension / w, maxDimension / h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * ratio);
  canvas.height = Math.round(h * ratio);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
  return img;
}

/**
 * Format bytes into human-readable KB/MB
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  if (bytes < k * 1024) {
    return `${Math.round(bytes / k)} KB`;
  }
  return `${(bytes / (k * k)).toFixed(1)} MB`;
}

/**
 * Reusable Premium Image Editor Modal
 * 
 * Supports:
 * - Avatar: 1:1 aspect ratio, square crop with circular preview
 * - Banner: 3.2:1 / 3:1 wide crop, hero live preview overlay
 * - Interactive pan, zoom, 90° rotation, and reset
 * - Banner dimension & quality presets
 * - Real-time estimated file size display
 * - Client-side WebP/JPEG compression with 4MB hard limit guard
 * - Full responsive support (360px mobile to 1600px desktop)
 */
export default function ImageEditorModal({
  isOpen,
  onClose,
  imageFile,
  type = 'avatar', // 'avatar' | 'banner'
  onSave,
  currentAvatarUrl = '',
  userName = 'Student',
  userRole = 'Student Developer',
  isUploading = false,
}) {
  const isBanner = type === 'banner';

  // Image load & source state
  const [loadedImage, setLoadedImage] = useState(null);
  const [loadingError, setLoadingError] = useState('');

  // Transform states
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Banner presets
  const [dimensionPreset, setDimensionPreset] = useState('recommended');
  const [qualityPreset, setQualityPreset] = useState('balanced');

  // Preview & export state
  const [activeTab, setActiveTab] = useState('crop'); // 'crop' | 'preview'
  const [estimatedSize, setEstimatedSize] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [livePreviewUrl, setLivePreviewUrl] = useState('');

  // Drag interaction refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const pinchStartDistanceRef = useRef(null);

  // ── 01. Load File into Image Object ──
  useEffect(() => {
    if (!imageFile || !isOpen) {
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const safeSrc = getSafeSource(img);
      setLoadedImage(safeSrc);
      setLoadingError('');
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setActiveTab('crop');
    };
    img.onerror = () => {
      setLoadingError('Failed to load the selected image. Please try a different file.');
    };
    img.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
      setLoadedImage(null);
      setEstimatedSize(null);
    };
  }, [imageFile, isOpen]);

  // Target aspect ratio
  const targetAspect = isBanner ? (16 / 5) : 1; // 3.2:1 for banner, 1:1 for avatar

  // ── 02. Draw Interactive Canvas ──
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Dark backdrop behind crop area
    ctx.fillStyle = '#06101c';
    ctx.fillRect(0, 0, width, height);

    ctx.save();

    // Center pivot point
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const imgW = loadedImage.width || loadedImage.naturalWidth;
    const imgH = loadedImage.height || loadedImage.naturalHeight;

    // Calculate base scale to fill canvas
    const isRotated90or270 = rotation % 180 !== 0;
    const effectiveW = isRotated90or270 ? imgH : imgW;
    const effectiveH = isRotated90or270 ? imgW : imgH;

    const scale = Math.max(width / effectiveW, height / effectiveH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(loadedImage, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();

    // Draw circular mask guide for avatar
    if (!isBanner) {
      ctx.save();
      ctx.fillStyle = 'rgba(7, 25, 42, 0.55)';
      ctx.beginPath();
      // Outer rect
      ctx.rect(0, 0, width, height);
      // Inner circle (counter-clockwise)
      const radius = Math.min(width, height) / 2 - 4;
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2, true);
      ctx.fill();

      // Delicate circle border
      ctx.strokeStyle = 'rgba(159, 213, 178, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    } else {
      // Delicate grid overlay guide for banner
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      // Rule of thirds
      ctx.beginPath();
      ctx.moveTo(width / 3, 0);
      ctx.lineTo(width / 3, height);
      ctx.moveTo((width / 3) * 2, 0);
      ctx.lineTo((width / 3) * 2, height);
      ctx.moveTo(0, height / 3);
      ctx.lineTo(width, height / 3);
      ctx.moveTo(0, (height / 3) * 2);
      ctx.lineTo(width, (height / 3) * 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [loadedImage, zoom, rotation, pan, isBanner]);

  // Re-draw when transform changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // ── 03. Pointer / Touch Event Handlers for Panning & Pinch ──
  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
    if (e.target && e.target.setPointerCapture) {
      e.target.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handlePointerUp = (e) => {
    isDraggingRef.current = false;
    if (e.target && e.target.releasePointerCapture) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.min(3, Math.max(1, +(prev + delta).toFixed(2))));
  };

  // Touch pinch-to-zoom
  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      if (pinchStartDistanceRef.current === null) {
        pinchStartDistanceRef.current = dist;
      } else {
        const factor = dist / pinchStartDistanceRef.current;
        setZoom((prev) => Math.min(3, Math.max(1, +(prev * factor).toFixed(2))));
        pinchStartDistanceRef.current = dist;
      }
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistanceRef.current = null;
  };

  // ── 04. Reset Controls ──
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // ── 05. High-Quality Export & Compression ──
  const generateExportBlob = useCallback(async () => {
    if (!loadedImage) return null;

    // Determine output dimensions
    let exportW, exportH;
    if (isBanner) {
      const selectedDim = BANNER_DIMENSIONS.find((d) => d.id === dimensionPreset) || BANNER_DIMENSIONS[0];
      exportW = selectedDim.width;
      exportH = selectedDim.height;
    } else {
      exportW = 800;
      exportH = 800;
    }

    const selectedQuality = QUALITY_PRESETS.find((q) => q.id === qualityPreset) || QUALITY_PRESETS[1];
    let quality = selectedQuality.quality;

    const offscreen = document.createElement('canvas');
    offscreen.width = exportW;
    offscreen.height = exportH;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return null;

    // Background fill (prevents transparent black on JPEG/WebP)
    ctx.fillStyle = '#07192A';
    ctx.fillRect(0, 0, exportW, exportH);

    ctx.save();

    // Scale from display canvas to export canvas
    const canvas = canvasRef.current;
    const displayW = canvas ? canvas.width : exportW;
    const displayH = canvas ? canvas.height : exportH;
    const scaleFactor = exportW / displayW;

    ctx.translate(exportW / 2 + pan.x * scaleFactor, exportH / 2 + pan.y * scaleFactor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom * scaleFactor, zoom * scaleFactor);

    const imgW = loadedImage.width || loadedImage.naturalWidth;
    const imgH = loadedImage.height || loadedImage.naturalHeight;

    const isRotated = rotation % 180 !== 0;
    const effW = isRotated ? imgH : imgW;
    const effH = isRotated ? imgW : imgH;

    const baseScale = Math.max(displayW / effW, displayH / effH);
    const drawW = imgW * baseScale;
    const drawH = imgH * baseScale;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(loadedImage, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();

    // Helper: export blob with format fallback
    const toBlobPromise = (mime, q) =>
      new Promise((resolve) => {
        offscreen.toBlob((blob) => resolve(blob), mime, q);
      });

    // Try WebP first, fall back to JPEG
    let blob = await toBlobPromise('image/webp', quality);
    if (!blob || blob.type !== 'image/webp') {
      blob = await toBlobPromise('image/jpeg', quality);
    }

    // Hard client-side 4MB protection: if blob exceeds 4MB, auto-compress
    if (blob && blob.size > 4 * 1024 * 1024) {
      blob = await toBlobPromise('image/webp', 0.65);
      if (!blob || blob.size > 4 * 1024 * 1024) {
        blob = await toBlobPromise('image/jpeg', 0.60);
      }
    }

    return {
      blob,
      width: exportW,
      height: exportH,
      format: blob?.type === 'image/webp' ? 'WebP' : 'JPEG',
    };
  }, [loadedImage, isBanner, dimensionPreset, qualityPreset, pan, rotation, zoom]);

  // Update live preview & estimated size on tab switch or transform
  useEffect(() => {
    let active = true;
    const updatePreview = async () => {
      if (!loadedImage) return;
      const result = await generateExportBlob();
      if (result && active) {
        setEstimatedSize(result.blob.size);
        const url = URL.createObjectURL(result.blob);
        setLivePreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      }
    };

    const timer = setTimeout(updatePreview, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [generateExportBlob, loadedImage, activeTab]);

  // ── 06. Save / Use Image ──
  const handleSave = async () => {
    if (isProcessing || isUploading) return;
    try {
      setIsProcessing(true);
      const result = await generateExportBlob();
      if (!result || !result.blob) {
        alert('Could not process image. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Convert Blob to File
      const extension = result.format === 'WebP' ? 'webp' : 'jpg';
      const fileName = `${type}-${Date.now()}.${extension}`;
      const processedFile = new File([result.blob], fileName, {
        type: result.blob.type,
        lastModified: Date.now(),
      });

      onSave(processedFile);
    } catch (err) {
      console.error('[ImageEditorModal] Processing failed:', err);
      alert('An error occurred while preparing your image.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
        {/* Backdrop dismiss */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isUploading && !isProcessing ? onClose : undefined}
          className="absolute inset-0"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-5xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl bg-bg-card border border-border-default shadow-2xl overflow-hidden"
          style={{ background: '#07192A' }}
        >
          {/* ── Modal Header ── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] bg-black/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint">
                {isBanner ? <ImageIcon className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {isBanner ? 'Position Your Profile Banner' : 'Adjust Your Profile Photo'}
                </h3>
                <p className="text-[11px] text-text-muted hidden sm:block">
                  {isBanner
                    ? 'Drag to set focal point. Choose quality and preview before uploading.'
                    : 'Drag and zoom to frame your face. Stored as optimized square avatar.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Tab Switch on Mobile/Desktop */}
              {isBanner && (
                <div className="flex p-0.5 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('crop')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'crop'
                        ? 'bg-brand-mint text-bg-primary font-bold shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Crop
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      activeTab === 'preview'
                        ? 'bg-brand-mint text-bg-primary font-bold shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    Preview
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                disabled={isUploading || isProcessing}
                className="p-1.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Modal Body (Responsive Split Layout) ── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* LEFT ZONE: Interactive Canvas / Live Hero (Columns 1-7 or 1-8) */}
            <div className={`${isBanner ? 'lg:col-span-8' : 'lg:col-span-7'} flex flex-col items-center justify-center`}>
              {loadingError ? (
                <div className="w-full h-64 sm:h-80 rounded-2xl border border-red-500/20 bg-red-500/[0.05] flex flex-col items-center justify-center p-6 text-center">
                  <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
                  <p className="text-sm font-semibold text-red-300">{loadingError}</p>
                </div>
              ) : activeTab === 'preview' && isBanner ? (
                /* LIVE PROFILE HERO PREVIEW */
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between text-xs text-text-muted px-1">
                    <span className="font-semibold uppercase tracking-wider text-brand-mint text-[10px]">
                      Live Profile Preview
                    </span>
                    <span>What students and mentors will see</span>
                  </div>

                  <div className="relative w-full rounded-2xl overflow-hidden border border-border-default shadow-lg bg-bg-card">
                    {/* Banner Image */}
                    <div className="relative h-44 sm:h-56 md:h-64 w-full overflow-hidden bg-black/40">
                      {livePreviewUrl ? (
                        <img
                          src={livePreviewUrl}
                          alt="Hero Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-white/40">
                          Rendering preview…
                        </div>
                      )}
                      {/* Gradient Overlay matching Profile.jsx */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#07192A] via-black/35 to-transparent pointer-events-none" />
                    </div>

                    {/* Overlaid Identity Badge */}
                    <div className="relative -mt-10 sm:-mt-12 px-4 sm:px-6 pb-4 flex items-end gap-3 sm:gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-brand-mint/40 bg-bg-elevated shadow-xl shrink-0">
                        {currentAvatarUrl ? (
                          <img src={currentAvatarUrl} alt={userName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-brand-mint/10 text-brand-mint font-bold text-lg">
                            {userName ? userName[0]?.toUpperCase() : 'Z'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 pb-1">
                        <h4 className="text-sm sm:text-base font-bold text-white leading-tight drop-shadow-sm">
                          {userName}
                        </h4>
                        <p className="text-xs text-brand-mint/90 font-medium">
                          {userRole}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* INTERACTIVE CROP CANVAS */
                <div className="w-full flex flex-col items-center">
                  <div
                    ref={containerRef}
                    className="relative w-full overflow-hidden rounded-2xl border border-white/[0.12] shadow-inner bg-black/40 flex items-center justify-center select-none touch-none cursor-grab active:cursor-grabbing"
                    style={{
                      aspectRatio: `${targetAspect}`,
                      maxHeight: isBanner ? '360px' : '380px',
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onWheel={handleWheel}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <canvas
                      ref={canvasRef}
                      width={isBanner ? 960 : 600}
                      height={isBanner ? 300 : 600}
                      className="w-full h-full object-contain pointer-events-none"
                    />

                    {/* Helper badge on canvas */}
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-white/70 pointer-events-none flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-brand-mint" />
                      <span>Drag to reposition • Scroll to zoom</span>
                    </div>
                  </div>

                  {/* Canvas Micro-Controls Bar */}
                  <div className="w-full flex items-center justify-between mt-3 px-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleRotate}
                        className="px-2.5 py-1.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.06] text-xs font-semibold text-white/80 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Rotate 90° clockwise"
                        aria-label="Rotate image"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-brand-mint" />
                        <span>Rotate</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-2.5 py-1.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.06] text-xs font-semibold text-white/60 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Reset crop and zoom"
                        aria-label="Reset crop"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    </div>

                    {/* Zoom Quick Step */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.max(1, +(z - 0.15).toFixed(2)))}
                        className="p-1.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.06] text-white/70 hover:text-white cursor-pointer"
                        aria-label="Zoom out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] font-mono text-white/70 w-10 text-center">
                        {Math.round(zoom * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))}
                        className="p-1.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.06] text-white/70 hover:text-white cursor-pointer"
                        aria-label="Zoom in"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT ZONE: Controls / Presets / Size Info (Columns 8-12 or 8-12) */}
            <div className={`${isBanner ? 'lg:col-span-4' : 'lg:col-span-5'} flex flex-col justify-between space-y-4`}>
              <div className="space-y-4">
                {/* Zoom Slider */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-white/60 text-[10px]">
                      Zoom Level
                    </span>
                    <span className="font-mono text-brand-mint text-xs font-semibold">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-[#9fd5b2] cursor-pointer"
                    aria-label="Zoom slider"
                  />
                </div>

                {/* Banner Presets */}
                {isBanner && (
                  <>
                    {/* Dimension Presets */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/60">
                        Export Dimensions
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {BANNER_DIMENSIONS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setDimensionPreset(preset.id)}
                            className={`p-2 rounded-xl text-center transition-all cursor-pointer border ${
                              dimensionPreset === preset.id
                                ? 'bg-brand-mint/15 border-brand-mint/40 text-white'
                                : 'bg-white/[0.02] border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="text-xs font-bold">{preset.label}</div>
                            <div className="text-[9px] font-mono text-white/40 mt-0.5">
                              {preset.width}×{preset.height}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quality Presets */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/60">
                        Image Quality & Compression
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {QUALITY_PRESETS.map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setQualityPreset(q.id)}
                            className={`p-2 rounded-xl text-center transition-all cursor-pointer border ${
                              qualityPreset === q.id
                                ? 'bg-brand-mint/15 border-brand-mint/40 text-white'
                                : 'bg-white/[0.02] border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="text-xs font-bold">{q.label}</div>
                            <div className="text-[9px] text-white/40 mt-0.5">
                              {q.id === 'high' ? 'Crisp' : q.id === 'balanced' ? 'Balanced' : 'Smallest'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Real-time File Output Card */}
                <div className="p-3.5 rounded-2xl bg-brand-mint/[0.04] border border-brand-mint/15 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/60 text-[11px]">Estimated upload size:</span>
                    <span className="font-mono font-bold text-brand-mint">
                      {formatBytes(estimatedSize)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
                    <span>
                      {isBanner
                        ? (BANNER_DIMENSIONS.find((d) => d.id === dimensionPreset)?.width || 1600) + ' × ' + (BANNER_DIMENSIONS.find((d) => d.id === dimensionPreset)?.height || 500)
                        : '800 × 800 (Square)'}
                    </span>
                    <span>Format: WebP / JPEG</span>
                  </div>
                  <div className="pt-1 flex items-center gap-1.5 text-[10px] text-brand-mint/80">
                    <Check className="w-3 h-3 shrink-0" />
                    <span>Optimized in browser • Guaranteed under 4 MB server limit</span>
                  </div>
                </div>
              </div>

              {/* ── Modal Footer Action Bar (Sticky on Mobile) ── */}
              <div className="pt-3 border-t border-white/[0.08] flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing || isUploading}
                  className="flex-1 py-3 px-4 rounded-xl border border-white/[0.12] hover:bg-white/[0.06] text-xs font-bold text-white/70 hover:text-white transition-all cursor-pointer text-center disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isProcessing || isUploading || Boolean(loadingError)}
                  className="flex-1 relative group overflow-hidden py-3 px-5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-lg"
                  style={{
                    background: '#f6ed4a',
                    color: '#07192a',
                  }}
                >
                  <span className="relative flex items-center justify-center gap-2">
                    {isProcessing || isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-bg-primary" />
                        <span>{isProcessing ? 'Optimizing…' : 'Uploading…'}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{isBanner ? 'Use Banner' : 'Use Photo'}</span>
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
