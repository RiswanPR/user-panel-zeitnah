import { useState, useEffect } from 'react';
import { X, Check, Subtitles } from 'lucide-react';

const CAPTION_STYLES = [
  { id: 'CLASSIC', name: 'Classic', desc: 'Dark pill with crisp white text' },
  { id: 'BOLD', name: 'Bold Gold', desc: 'Yellow text with subtle shadow' },
  { id: 'HIGHLIGHT', name: 'Highlight', desc: 'Zeitnah Mint accent card' },
  { id: 'MINIMAL', name: 'Minimal', desc: 'Soft backdrop with clean font' },
];

export default function ReelCaptionEditor({
  isOpen,
  initialLayer = null,
  duration = 30,
  currentTime = 0,
  onSave,
  onClose,
}) {
  const [content, setContent] = useState('');
  const [style, setStyle] = useState('CLASSIC');
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(4);

  useEffect(() => {
    if (isOpen) {
      if (initialLayer) {
        setContent(initialLayer.content || '');
        setStyle(initialLayer.style || 'CLASSIC');
        setStart(Number(initialLayer.start ?? 0));
        setEnd(Number(initialLayer.end ?? Math.min(duration, 4)));
      } else {
        setContent('');
        setStyle('CLASSIC');
        const initialStart = Math.min(currentTime, Math.max(0, duration - 3));
        setStart(Number(initialStart.toFixed(1)));
        setEnd(Number(Math.min(duration, initialStart + 3.5).toFixed(1)));
      }
    }
  }, [isOpen, initialLayer, duration, currentTime]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    onSave?.({
      id: initialLayer?.id || `caption-${Date.now()}`,
      type: 'CAPTION',
      content: trimmed.slice(0, 300),
      style,
      start: Math.max(0, Number(start)),
      end: Math.min(duration, Math.max(Number(start) + 0.5, Number(end))),
      x: initialLayer?.x ?? 0.5,
      y: initialLayer?.y ?? 0.85, // Positioned at bottom safe zone by default
      scale: 1.0,
      opacity: 1.0,
    });
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Caption layer editor"
    >
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-[#090F1C] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-yellow/15 border border-brand-yellow/30 flex items-center justify-center text-brand-yellow">
              <Subtitles className="w-4 h-4" />
            </div>
            <h3 className="text-white font-semibold text-base">
              {initialLayer ? 'Edit Caption Segment' : 'Add Caption Segment'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close caption editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Caption text */}
          <div>
            <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
              <span>Caption Text</span>
              <span className="font-mono">{content.length}/300</span>
            </div>
            <input
              autoFocus
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 300))}
              placeholder="e.g. Building the future of structural engineering..."
              className="w-full rounded-xl bg-[#050912] border border-white/10 px-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-brand-mint text-sm transition-colors"
            />
          </div>

          {/* Style Presets */}
          <div>
            <label className="text-xs text-text-muted mb-2 block">Caption Style</label>
            <div className="grid grid-cols-2 gap-2">
              {CAPTION_STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStyle(st.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    style === st.id
                      ? 'border-brand-mint bg-brand-mint/10'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white">{st.name}</span>
                    {style === st.id && <Check className="w-3.5 h-3.5 text-brand-mint" />}
                  </div>
                  <span className="text-[10px] text-text-muted block leading-tight">{st.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Timing Controls */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Segment Timing</span>
              <span className="font-mono text-white">
                {start.toFixed(1)}s – {end.toFixed(1)}s ({(end - start).toFixed(1)}s)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-text-faint mb-1 block">Start (s)</label>
                <input
                  type="number"
                  min="0"
                  max={Math.max(0, end - 0.5)}
                  step="0.1"
                  value={start}
                  onChange={(e) => setStart(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg bg-[#050912] border border-white/10 px-3 py-1.5 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-text-faint mb-1 block">End (s)</label>
                <input
                  type="number"
                  min={start + 0.5}
                  max={duration}
                  step="0.1"
                  value={end}
                  onChange={(e) => setEnd(Math.min(duration, Math.max(start + 0.5, Number(e.target.value))))}
                  className="w-full rounded-lg bg-[#050912] border border-white/10 px-3 py-1.5 text-white text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10 bg-[#060D18]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!content.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-brand-mint text-[#070B14] font-semibold text-sm hover:bg-brand-mint/90 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-md"
          >
            <Check className="w-4 h-4" />
            <span>Save Caption</span>
          </button>
        </div>
      </div>
    </div>
  );
}
