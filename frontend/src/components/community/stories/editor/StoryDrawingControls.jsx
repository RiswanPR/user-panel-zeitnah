import { Check, RotateCcw, Undo2 } from 'lucide-react';
import { DRAWING_COLORS, STROKE_WIDTHS } from './storyEditorConstants';

/**
 * StoryDrawingControls — Sub-bar that slides up when pen mode is active.
 */
export default function StoryDrawingControls({
  color,
  strokeWidth,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onClear,
  onDone,
}) {
  return (
    <div
      className="absolute bottom-20 inset-x-3 sm:inset-x-6 z-30 p-3 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col gap-2.5"
      role="toolbar"
      aria-label="Drawing tools"
    >
      {/* Top: Colors and Action buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {DRAWING_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              style={{ backgroundColor: c }}
              className={`min-w-[36px] min-h-[36px] rounded-full transition-all cursor-pointer flex items-center justify-center ${
                color === c
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110'
                  : 'opacity-85 hover:opacity-100 hover:scale-105'
              }`}
              aria-label={`Drawing color ${c}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onUndo}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Undo stroke"
            aria-label="Undo last drawing stroke"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClear}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
            title="Clear all drawings"
            aria-label="Clear all drawing strokes"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDone}
            className="min-h-[44px] px-3.5 rounded-xl bg-brand-mint text-[#070B14] font-bold text-xs flex items-center gap-1 hover:opacity-90 transition-all cursor-pointer shadow-md"
            aria-label="Done drawing"
          >
            <Check className="w-4 h-4" />
            <span>Done</span>
          </button>
        </div>
      </div>

      {/* Bottom: Stroke widths */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/[0.08]">
        <span className="text-[11px] font-medium text-text-muted">Stroke:</span>
        <div className="flex items-center gap-2">
          {STROKE_WIDTHS.map((sw) => (
            <button
              key={sw.id}
              type="button"
              onClick={() => onStrokeWidthChange(sw.size)}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                strokeWidth === sw.size
                  ? 'bg-brand-mint text-[#070B14]'
                  : 'bg-white/[0.06] text-text-muted hover:text-white'
              }`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: `${sw.size}px`, height: `${sw.size}px` }}
              />
              <span>{sw.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
