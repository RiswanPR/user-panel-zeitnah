import { useRef, useCallback, memo } from 'react';
import { Scissors, Clock, Music2, Layers } from 'lucide-react';

const formatSeconds = (sec) => {
  if (!sec && sec !== 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * ReelTimeline — Precision video scrubber and trim timeline for Zeitnah Reel Studio:
 * - High-precision seeking playhead
 * - Interactive non-destructive trim window (trimStart to trimEnd)
 * - Boundary enforcement (trimStart >= 0, trimEnd <= duration, min 1s, max 90s)
 * - Lightweight audio layer track visualization (Phase 3C)
 * - Visual overlay layers track visualization and selection (Phase 3D)
 * - Accessible keyboard seek and ARIA slider semantics
 * - Lightweight DOM-friendly rendering to prevent expensive re-renders
 */
function ReelTimeline({
  duration = 0,
  currentTime = 0,
  trimStart = 0,
  trimEnd = 0,
  onSeek,
  onTrimStartChange,
  onTrimEndChange,
  selectedMusic = null,
  audioMode = 'ORIGINAL_ONLY',
  musicStart = 0,
  musicEnd = 30,
  layers = [],
  activeLayerId = null,
  onSelectLayer,
}) {
  const trackRef = useRef(null);
  const safeDuration = duration > 0 ? duration : 1;

  const effectiveTrimEnd = trimEnd > 0 ? trimEnd : safeDuration;
  const leftPercent = Math.max(0, Math.min(100, (trimStart / safeDuration) * 100));
  const rightPercent = Math.max(0, Math.min(100, (effectiveTrimEnd / safeDuration) * 100));
  const playheadPercent = Math.max(0, Math.min(100, (currentTime / safeDuration) * 100));
  const selectedDuration = Math.max(0, effectiveTrimEnd - trimStart);

  const handleTrackClick = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percent * safeDuration;
    onSeek(targetTime);
  };

  const handleStartTrimDrag = useCallback(
    (e) => {
      const val = parseFloat(e.target.value);
      if (val >= 0 && val <= effectiveTrimEnd - 1.0) {
        onTrimStartChange(val);
        onSeek(val);
      }
    },
    [effectiveTrimEnd, onTrimStartChange, onSeek]
  );

  const handleEndTrimDrag = useCallback(
    (e) => {
      const val = parseFloat(e.target.value);
      if (val <= safeDuration && val >= trimStart + 1.0) {
        onTrimEndChange(val);
        onSeek(val);
      }
    },
    [safeDuration, trimStart, onTrimEndChange, onSeek]
  );

  return (
    <div className="w-full space-y-2 select-none" role="region" aria-label="Video Timeline and Trim">
      {/* Time & Duration Info Header */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span className="text-white font-medium">{formatSeconds(currentTime)}</span>
          <span className="text-text-faint">/</span>
          <span>{formatSeconds(safeDuration)}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-mint/10 border border-brand-mint/20 text-brand-mint text-[11px] font-semibold">
          <Scissors className="w-3 h-3" />
          <span>Clip: {formatSeconds(selectedDuration)}</span>
        </div>

        <div className="font-mono text-[11px] text-text-muted">
          Range: {formatSeconds(trimStart)} – {formatSeconds(effectiveTrimEnd)}
        </div>
      </div>

      {/* Interactive Timeline Track */}
      <div className="relative h-11 sm:h-12 w-full rounded-xl bg-[#060D18] border border-white/[0.08] overflow-hidden flex items-center">
        {/* Track Clickable Area */}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="absolute inset-0 cursor-pointer"
          title="Click to seek"
        />

        {/* Dimmed Inactive Head (0 to trimStart) */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-black/70 pointer-events-none"
          style={{ width: `${leftPercent}%` }}
        />

        {/* Active Highlighted Trim Window */}
        <div
          className="absolute top-0 bottom-0 border-y-2 border-brand-mint/80 bg-brand-mint/[0.08] pointer-events-none transition-colors"
          style={{
            left: `${leftPercent}%`,
            width: `${Math.max(0, rightPercent - leftPercent)}%`,
          }}
        />

        {/* Dimmed Inactive Tail (trimEnd to duration) */}
        <div
          className="absolute top-0 bottom-0 right-0 bg-black/70 pointer-events-none"
          style={{ width: `${Math.max(0, 100 - rightPercent)}%` }}
        />

        {/* Playhead Marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] pointer-events-none z-20"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-white -ml-1 -mt-0.5 shadow-md" />
        </div>

        {/* Invisible Range Input for Trim Start Handle */}
        <input
          type="range"
          min="0"
          max={safeDuration}
          step="0.1"
          value={trimStart}
          onChange={handleStartTrimDrag}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30 pointer-events-auto"
          aria-label="Trim clip start"
          aria-valuemin="0"
          aria-valuemax={effectiveTrimEnd - 1.0}
          aria-valuenow={trimStart}
        />

        {/* Visible Trim Start Handle Anchor */}
        <div
          className="absolute top-0 bottom-0 w-3 bg-brand-mint rounded-l-md flex items-center justify-center pointer-events-none shadow-md z-25"
          style={{ left: `calc(${leftPercent}% - 3px)` }}
        >
          <div className="w-0.5 h-4 bg-[#070B14] rounded-full" />
        </div>

        {/* Visible Trim End Handle Anchor */}
        <div
          className="absolute top-0 bottom-0 w-3 bg-brand-mint rounded-r-md flex items-center justify-center pointer-events-none shadow-md z-25"
          style={{ left: `calc(${rightPercent}% - 9px)` }}
        >
          <div className="w-0.5 h-4 bg-[#070B14] rounded-full" />
        </div>
      </div>

      {/* Lightweight Soundtrack Indicator Bar (Section 15) */}
      {selectedMusic && audioMode !== 'ORIGINAL_ONLY' && (
        <div className="pt-1.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span className="flex items-center gap-1.5 text-brand-yellow font-medium truncate max-w-[240px]">
              <Music2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{selectedMusic.title}</span>
            </span>
            <span className="font-mono text-[10px] text-text-faint">
              Audio: {formatSeconds(musicStart)} – {formatSeconds(musicEnd)}
            </span>
          </div>
          <div className="relative h-2 w-full rounded-full bg-[#060D18] border border-brand-yellow/20 overflow-hidden">
            <div
              className="absolute top-0 bottom-0 bg-brand-yellow/80 rounded-full"
              style={{
                left: `${leftPercent}%`,
                width: `${Math.max(0, rightPercent - leftPercent)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Visual Overlay Layers Track (Phase 3D) */}
      {layers && layers.length > 0 && (
        <div className="pt-1 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span className="flex items-center gap-1.5 text-brand-mint font-medium">
              <Layers className="w-3 h-3 shrink-0" />
              <span>Layers ({layers.length})</span>
            </span>
            <span className="text-[10px] text-text-faint">Click layer to seek</span>
          </div>
          <div className="relative h-3 w-full rounded-md bg-[#060D18] border border-white/[0.08] overflow-hidden">
            {layers.map((layer) => {
              const layerStart = Math.max(0, Number(layer.start ?? 0));
              const layerEnd = Math.min(safeDuration, Number(layer.end ?? safeDuration));
              const lLeft = Math.max(0, Math.min(100, (layerStart / safeDuration) * 100));
              const lWidth = Math.max(1, Math.min(100 - lLeft, ((layerEnd - layerStart) / safeDuration) * 100));
              const isSelected = activeLayerId === layer.id;

              return (
                <div
                  key={layer.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLayer?.(layer.id);
                    onSeek?.(layerStart);
                  }}
                  title={`${layer.type}: ${formatSeconds(layerStart)} - ${formatSeconds(layerEnd)}`}
                  className={`absolute top-0 bottom-0 rounded-xs cursor-pointer transition-all ${
                    layer.type === 'TEXT'
                      ? 'bg-brand-mint/80 hover:bg-brand-mint'
                      : layer.type === 'STICKER'
                      ? 'bg-brand-yellow/80 hover:bg-brand-yellow'
                      : layer.type === 'CAPTION'
                      ? 'bg-sky-400/80 hover:bg-sky-400'
                      : 'bg-indigo-400/80 hover:bg-indigo-400'
                  } ${isSelected ? 'ring-1 ring-white shadow-xs z-10' : 'opacity-85'}`}
                  style={{
                    left: `${lLeft}%`,
                    width: `${lWidth}%`,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ReelTimeline);
