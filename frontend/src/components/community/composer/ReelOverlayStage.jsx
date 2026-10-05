import { useRef, useCallback, memo } from 'react';
import { Trash2, Edit3 } from 'lucide-react';
import StickerIcon from './StickerIcon';

/**
 * ReelOverlayStage — Interactive visual stage overlay for Zeitnah Reel Editor (Phase 3D):
 * - Displays text cards, stickers, and captions positioned via normalized coordinates (0.0 to 1.0)
 * - Time-synchronized visibility (currentTime >= start && currentTime <= end)
 * - Safe area guidelines (10% top, 12% bottom, 6% sides)
 * - Performance optimized: direct pointer drag to eliminate React state churn during interaction
 * - Mobile touch friendly and accessible
 */
function ReelOverlayStage({
  layers = [],
  activeLayerId = null,
  currentTime = 0,
  duration = 30,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onEditLayer,
  isInteracting = false,
}) {
  const stageRef = useRef(null);
  const dragInfoRef = useRef(null);

  const handlePointerDown = useCallback(
    (e, layer) => {
      e.stopPropagation();
      onSelectLayer?.(layer.id);

      if (!stageRef.current) return;
      const stageRect = stageRef.current.getBoundingClientRect();
      const pointerId = e.pointerId;

      dragInfoRef.current = {
        layerId: layer.id,
        pointerId,
        startX: e.clientX,
        startY: e.clientY,
        initialNormX: Number(layer.x ?? 0.5),
        initialNormY: Number(layer.y ?? 0.5),
        stageWidth: stageRect.width,
        stageHeight: stageRect.height,
        hasMoved: false,
      };

      const handlePointerMove = (moveEvent) => {
        if (!dragInfoRef.current || moveEvent.pointerId !== pointerId) return;
        const dx = moveEvent.clientX - dragInfoRef.current.startX;
        const dy = moveEvent.clientY - dragInfoRef.current.startY;

        if (Math.hypot(dx, dy) > 4) {
          dragInfoRef.current.hasMoved = true;
        }

        const normDx = dx / dragInfoRef.current.stageWidth;
        const normDy = dy / dragInfoRef.current.stageHeight;

        const newX = Math.max(0.05, Math.min(0.95, dragInfoRef.current.initialNormX + normDx));
        const newY = Math.max(0.08, Math.min(0.92, dragInfoRef.current.initialNormY + normDy));

        // Direct DOM update on active layer element to preserve 60fps responsiveness
        const el = document.getElementById(`reel-layer-el-${layer.id}`);
        if (el) {
          el.style.left = `${(newX * 100).toFixed(2)}%`;
          el.style.top = `${(newY * 100).toFixed(2)}%`;
        }
      };

      const handlePointerUp = (upEvent) => {
        if (!dragInfoRef.current || upEvent.pointerId !== pointerId) return;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);

        if (dragInfoRef.current.hasMoved) {
          const dx = upEvent.clientX - dragInfoRef.current.startX;
          const dy = upEvent.clientY - dragInfoRef.current.startY;
          const normDx = dx / dragInfoRef.current.stageWidth;
          const normDy = dy / dragInfoRef.current.stageHeight;
          const finalX = Math.max(0.05, Math.min(0.95, Number((dragInfoRef.current.initialNormX + normDx).toFixed(3))));
          const finalY = Math.max(0.08, Math.min(0.92, Number((dragInfoRef.current.initialNormY + normDy).toFixed(3))));

          onUpdateLayer?.(layer.id, { x: finalX, y: finalY });
        }
        dragInfoRef.current = null;
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [onSelectLayer, onUpdateLayer]
  );

  return (
    <div
      ref={stageRef}
      className="absolute inset-0 pointer-events-auto select-none overflow-hidden z-20"
      onClick={() => onSelectLayer?.(null)}
      role="region"
      aria-label="Reel visual overlay stage"
    >
      {/* Safe Area Visual Guidelines (Visible when any layer is selected or user is interacting) */}
      {(activeLayerId || isInteracting) && (
        <div className="absolute inset-0 pointer-events-none transition-opacity duration-200">
          <div className="absolute inset-x-[6%] top-[10%] bottom-[14%] border border-dashed border-white/20 rounded-2xl flex items-start justify-center">
            <span className="text-[10px] text-white/40 bg-black/60 px-2 py-0.5 rounded-full mt-2 tracking-wide font-mono">
              Safe Zone
            </span>
          </div>
        </div>
      )}

      {/* Rendered Layers */}
      {layers.map((layer) => {
        const isSelected = activeLayerId === layer.id;
        const isTimeVisible = currentTime >= Number(layer.start ?? 0) && currentTime <= Number(layer.end ?? duration);

        if (!isTimeVisible && !isSelected) return null;

        const leftPercent = (Math.max(0, Math.min(1, Number(layer.x ?? 0.5))) * 100).toFixed(2);
        const topPercent = (Math.max(0, Math.min(1, Number(layer.y ?? 0.5))) * 100).toFixed(2);
        const scale = Math.max(0.4, Math.min(2.5, Number(layer.scale ?? 1.0)));
        const rotation = Number(layer.rotation ?? 0);
        const opacity = Math.max(0, Math.min(1, Number(layer.opacity ?? 1.0)));

        return (
          <div
            key={layer.id}
            id={`reel-layer-el-${layer.id}`}
            onPointerDown={(e) => handlePointerDown(e, layer)}
            className={`absolute cursor-move touch-none transition-shadow ${
              !isTimeVisible ? 'opacity-40 ring-1 ring-white/30' : ''
            }`}
            style={{
              left: `${leftPercent}%`,
              top: `${topPercent}%`,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
              opacity,
              zIndex: isSelected ? 40 : 25,
            }}
            tabIndex={0}
            role="button"
            aria-label={`${layer.type} overlay layer`}
            onKeyDown={(e) => {
              if (e.key === 'Delete' || e.key === 'Backspace') {
                onDeleteLayer?.(layer.id);
              }
            }}
          >
            {/* Selection Border & Controls */}
            {isSelected && (
              <div className="absolute -inset-2.5 rounded-xl border-2 border-brand-mint pointer-events-none shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                {/* Delete Shortcut Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLayer?.(layer.id);
                  }}
                  className="absolute -top-3.5 -right-3.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center pointer-events-auto hover:bg-red-600 transition-colors shadow-md"
                  title="Delete layer"
                  aria-label="Delete layer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {/* Edit Shortcut Button */}
                {onEditLayer && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditLayer?.(layer);
                    }}
                    className="absolute -top-3.5 -left-3.5 w-6 h-6 rounded-full bg-brand-mint text-[#070B14] flex items-center justify-center pointer-events-auto hover:bg-brand-mint/90 transition-colors shadow-md"
                    title="Edit layer"
                    aria-label="Edit layer"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Content Based on Layer Type */}
            {layer.type === 'TEXT' && (
              <div
                className="px-4 py-2 rounded-xl text-center font-medium max-w-[280px] break-words select-none shadow-md backdrop-blur-xs"
                style={{
                  fontFamily: layer.fontFamily || 'Inter, sans-serif',
                  fontSize: `${layer.fontSize || 22}px`,
                  fontWeight: layer.fontWeight || 'bold',
                  textAlign: layer.textAlign || 'center',
                  color: layer.color || '#FFFFFF',
                  backgroundColor: layer.backgroundColor || '#070B14',
                  opacity: layer.backgroundOpacity !== undefined ? layer.backgroundOpacity : 0.8,
                  textShadow: layer.shadow ? '0 2px 4px rgba(0,0,0,0.8)' : 'none',
                }}
              >
                {layer.content}
              </div>
            )}

            {layer.type === 'STICKER' && (
              <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center p-1 select-none filter drop-shadow-lg">
                <StickerIcon stickerId={layer.stickerId} />
              </div>
            )}

            {layer.type === 'CAPTION' && (
              <div
                className={`px-4 py-1.5 rounded-full text-center text-sm font-semibold max-w-[300px] break-words select-none shadow-lg ${
                  layer.style === 'BOLD'
                    ? 'bg-black/90 text-brand-yellow font-black border border-brand-yellow/30'
                    : layer.style === 'HIGHLIGHT'
                    ? 'bg-brand-mint text-[#070B14] font-bold'
                    : layer.style === 'MINIMAL'
                    ? 'bg-slate-900/60 text-white font-medium border border-white/10'
                    : 'bg-black/80 text-white border border-white/20'
                }`}
              >
                {layer.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(ReelOverlayStage);
