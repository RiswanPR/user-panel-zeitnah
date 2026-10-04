import { useRef, useEffect, useCallback, useState } from 'react';
import { X, Play } from 'lucide-react';
import { STORY_FILTERS } from './storyEditorConstants';

/**
 * StoryEditorCanvas — The 9:16 composition viewport housing media,
 * interactive drawing canvas, draggable text overlays, and draggable stickers.
 */
export default function StoryEditorCanvas({
  previewUrl,
  isVideo,
  filter = 'none',
  isMuted = true,
  drawingPaths = [],
  onAddDrawingPath,
  isDrawingMode,
  drawingColor,
  drawingStrokeWidth,
  textOverlays = [],
  onUpdateTextOverlay,
  onRemoveTextOverlay,
  onEditTextOverlay,
  stickers = [],
  onUpdateSticker,
  onRemoveSticker,
  isPreviewMode,
}) {
  const containerRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const videoRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [activeDragItem, setActiveDragItem] = useState(null); // { type: 'text' | 'sticker', id }

  const isDrawingRef = useRef(false);
  const currentPathRef = useRef([]);

  // Video play/pause toggle
  const toggleVideoPlayback = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // ── DRAWING CANVAS INTERACTION ──
  const redrawDrawingCanvas = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved paths
    drawingPaths.forEach((path) => {
      if (!path.points || path.points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(path.points[0].x * canvas.width, path.points[0].y * canvas.height);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x * canvas.width, path.points[i].y * canvas.height);
      }
      ctx.stroke();
      ctx.restore();
    });

    // Draw active path
    if (currentPathRef.current && currentPathRef.current.length > 1) {
      ctx.save();
      ctx.strokeStyle = drawingColor;
      ctx.lineWidth = drawingStrokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(currentPathRef.current[0].x * canvas.width, currentPathRef.current[0].y * canvas.height);
      for (let i = 1; i < currentPathRef.current.length; i++) {
        ctx.lineTo(currentPathRef.current[i].x * canvas.width, currentPathRef.current[i].y * canvas.height);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [drawingPaths, drawingColor, drawingStrokeWidth]);

  // Synchronize canvas resolution with display geometry
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width && rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        redrawDrawingCanvas();
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [redrawDrawingCanvas]);

  const handlePointerDownDraw = (e) => {
    if (!isDrawingMode) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const pt = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
    currentPathRef.current = [pt];
    redrawDrawingCanvas();
  };

  const handlePointerMoveDraw = (e) => {
    if (!isDrawingRef.current || !isDrawingMode) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pt = {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
    currentPathRef.current.push(pt);
    redrawDrawingCanvas();
  };

  const handlePointerUpDraw = () => {
    if (!isDrawingRef.current || !isDrawingMode) return;
    isDrawingRef.current = false;
    if (currentPathRef.current.length > 1) {
      onAddDrawingPath({
        points: currentPathRef.current,
        color: drawingColor,
        width: drawingStrokeWidth,
      });
    }
    currentPathRef.current = [];
  };

  // ── DRAG INTERACTION FOR TEXT & STICKERS ──
  const handleDragStart = (e, type, id) => {
    if (isDrawingMode || isPreviewMode) return;
    e.stopPropagation();
    setActiveDragItem({ type, id });
  };

  const handleCanvasPointerMove = (e) => {
    if (!activeDragItem || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nextX = Math.max(0.08, Math.min(0.92, (e.clientX - rect.left) / rect.width));
    const nextY = Math.max(0.08, Math.min(0.92, (e.clientY - rect.top) / rect.height));

    if (activeDragItem.type === 'text') {
      onUpdateTextOverlay(activeDragItem.id, { x: nextX, y: nextY });
    } else if (activeDragItem.type === 'sticker') {
      onUpdateSticker(activeDragItem.id, { x: nextX, y: nextY });
    }
  };

  const handleCanvasPointerUp = () => {
    if (activeDragItem) {
      setActiveDragItem(null);
    }
  };

  const activeFilterCss = STORY_FILTERS.find((f) => f.id === filter)?.css || '';

  return (
    <div
      ref={containerRef}
      onPointerMove={(e) => {
        if (isDrawingMode) handlePointerMoveDraw(e);
        handleCanvasPointerMove(e);
      }}
      onPointerUp={() => {
        if (isDrawingMode) handlePointerUpDraw();
        handleCanvasPointerUp();
      }}
      className="relative aspect-[9/16] w-full max-h-[76vh] sm:max-h-[82vh] rounded-2xl overflow-hidden bg-black border border-white/[0.1] shadow-2xl flex items-center justify-center select-none touch-none"
    >
      {/* ── Visual Media: Image or Video ── */}
      {isVideo ? (
        <div className="relative w-full h-full flex items-center justify-center" onClick={toggleVideoPlayback}>
          <video
            ref={videoRef}
            src={previewUrl}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            loop
            muted={isMuted}
          />
          {/* Subtle pause badge overlay */}
          {!isPlaying && !isPreviewMode && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none z-10">
              <div className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                <Play className="w-6 h-6 fill-white ml-0.5" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <img
          src={previewUrl}
          alt="Story content preview"
          className={`w-full h-full object-cover transition-all duration-300 ${activeFilterCss}`}
        />
      )}

      {/* ── Interactive Drawing Layer Canvas ── */}
      <canvas
        ref={drawingCanvasRef}
        onPointerDown={handlePointerDownDraw}
        className={`absolute inset-0 w-full h-full pointer-events-none z-20 ${
          isDrawingMode ? 'pointer-events-auto cursor-crosshair' : ''
        }`}
      />

      {/* ── Rendered Text Overlays ── */}
      {textOverlays.map((overlay) => (
        <div
          key={overlay.id}
          onPointerDown={(e) => handleDragStart(e, 'text', overlay.id)}
          onClick={(e) => {
            e.stopPropagation();
            if (!isPreviewMode && !isDrawingMode) {
              onEditTextOverlay(overlay);
            }
          }}
          style={{
            left: `${(overlay.x ?? 0.5) * 100}%`,
            top: `${(overlay.y ?? 0.5) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
          className={`absolute z-25 max-w-[85%] cursor-grab active:cursor-grabbing transition-transform ${
            activeDragItem?.id === overlay.id ? 'scale-105 ring-1 ring-brand-mint/50 rounded-xl' : ''
          }`}
        >
          <div
            className={`px-3.5 py-1.5 rounded-2xl shadow-lg relative group ${
              overlay.bgStyle === 'dark'
                ? 'bg-black/70 backdrop-blur-md'
                : overlay.bgStyle === 'light'
                ? 'bg-white/95'
                : 'bg-transparent'
            }`}
          >
            <p
              style={{
                color: overlay.bgStyle === 'light' ? '#070B14' : overlay.color,
                textAlign: overlay.align || 'center',
                fontSize: `${overlay.size || 20}px`,
                textShadow: overlay.bgStyle === 'none' ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
              }}
              className="font-bold leading-snug whitespace-pre-wrap select-none"
            >
              {overlay.text}
            </p>

            {/* Remove badge (hidden in preview mode) */}
            {!isPreviewMode && !isDrawingMode && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTextOverlay(overlay.id);
                }}
                className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                aria-label="Remove text overlay"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* ── Rendered Stickers ── */}
      {stickers.map((stk) => (
        <div
          key={stk.id}
          onPointerDown={(e) => handleDragStart(e, 'sticker', stk.id)}
          style={{
            left: `${(stk.x ?? 0.5) * 100}%`,
            top: `${(stk.y ?? 0.5) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
          className={`absolute z-25 cursor-grab active:cursor-grabbing text-4xl select-none group drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-transform ${
            activeDragItem?.id === stk.id ? 'scale-115' : ''
          }`}
        >
          <span>{stk.emoji}</span>

          {/* Remove sticker button */}
          {!isPreviewMode && !isDrawingMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveSticker(stk.id);
              }}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md text-xs"
              aria-label="Remove sticker"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
