import { useState, useEffect } from 'react';
import { X, Check, AlignLeft, AlignCenter, AlignRight, Type, Sparkles } from 'lucide-react';

const FONTS = [
  { id: 'Inter', name: 'Inter' },
  { id: 'System Sans', name: 'Sans' },
  { id: 'Serif', name: 'Serif' },
  { id: 'Mono', name: 'Mono' },
];

const PRESET_COLORS = [
  '#FFFFFF',
  '#10B981', // Mint
  '#FBBF24', // Yellow
  '#38BDF8', // Sky
  '#F97316', // Orange
  '#EC4899', // Pink
  '#070B14', // Dark
];

export default function ReelTextEditor({
  isOpen,
  initialLayer = null,
  duration = 30,
  currentTime = 0,
  onSave,
  onClose,
}) {
  const [content, setContent] = useState('');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState(24);
  const [fontWeight, setFontWeight] = useState('bold');
  const [textAlign, setTextAlign] = useState('center');
  const [color, setColor] = useState('#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState('#070B14');
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.75);
  const [shadow, setShadow] = useState(true);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(5);

  useEffect(() => {
    if (isOpen) {
      if (initialLayer) {
        setContent(initialLayer.content || '');
        setFontFamily(initialLayer.fontFamily || 'Inter');
        setFontSize(initialLayer.fontSize || 24);
        setFontWeight(initialLayer.fontWeight || 'bold');
        setTextAlign(initialLayer.textAlign || 'center');
        setColor(initialLayer.color || '#FFFFFF');
        setBackgroundColor(initialLayer.backgroundColor || '#070B14');
        setBackgroundOpacity(initialLayer.backgroundOpacity ?? 0.75);
        setShadow(Boolean(initialLayer.shadow));
        setStart(Number(initialLayer.start ?? 0));
        setEnd(Number(initialLayer.end ?? Math.min(duration, 5)));
      } else {
        setContent('');
        setFontFamily('Inter');
        setFontSize(24);
        setFontWeight('bold');
        setTextAlign('center');
        setColor('#FFFFFF');
        setBackgroundColor('#070B14');
        setBackgroundOpacity(0.75);
        setShadow(true);
        const initialStart = Math.min(currentTime, Math.max(0, duration - 3));
        setStart(Number(initialStart.toFixed(1)));
        setEnd(Number(Math.min(duration, initialStart + 4).toFixed(1)));
      }
    }
  }, [isOpen, initialLayer, duration, currentTime]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    onSave?.({
      id: initialLayer?.id || `text-${Date.now()}`,
      type: 'TEXT',
      content: trimmed.slice(0, 300),
      fontFamily,
      fontSize,
      fontWeight,
      textAlign,
      color,
      backgroundColor,
      backgroundOpacity,
      shadow,
      start: Math.max(0, Number(start)),
      end: Math.min(duration, Math.max(Number(start) + 0.5, Number(end))),
      x: initialLayer?.x ?? 0.5,
      y: initialLayer?.y ?? 0.35,
      scale: initialLayer?.scale ?? 1.0,
      rotation: initialLayer?.rotation ?? 0,
      opacity: initialLayer?.opacity ?? 1.0,
    });
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Text overlay editor"
    >
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-[#090F1C] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-mint/15 border border-brand-mint/30 flex items-center justify-center text-brand-mint">
              <Type className="w-4 h-4" />
            </div>
            <h3 className="text-white font-semibold text-base">
              {initialLayer ? 'Edit Text Overlay' : 'Add Text Overlay'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close text editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Text Area */}
          <div>
            <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
              <span>Text Content</span>
              <span className={content.length >= 280 ? 'text-amber-400 font-mono' : 'font-mono'}>
                {content.length}/300
              </span>
            </div>
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 300))}
              placeholder="Enter overlay text..."
              rows={3}
              className="w-full rounded-xl bg-[#050912] border border-white/10 px-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-brand-mint text-sm resize-none transition-colors"
            />
          </div>

          {/* Typography Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Font Family</span>
              <div className="flex gap-1.5">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFontFamily(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      fontFamily === f.id
                        ? 'bg-brand-mint text-[#070B14] shadow-sm font-semibold'
                        : 'bg-white/5 text-text-muted hover:text-white'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Alignment & Weight */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Alignment & Weight</span>
              <div className="flex items-center gap-2">
                <div className="flex p-0.5 rounded-lg bg-white/5 border border-white/5">
                  <button
                    type="button"
                    onClick={() => setTextAlign('left')}
                    className={`p-1.5 rounded-md ${textAlign === 'left' ? 'bg-white/20 text-white' : 'text-text-muted'}`}
                    aria-label="Align left"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextAlign('center')}
                    className={`p-1.5 rounded-md ${textAlign === 'center' ? 'bg-white/20 text-white' : 'text-text-muted'}`}
                    aria-label="Align center"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextAlign('right')}
                    className={`p-1.5 rounded-md ${textAlign === 'right' ? 'bg-white/20 text-white' : 'text-text-muted'}`}
                    aria-label="Align right"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setFontWeight((w) => (w === 'bold' ? 'normal' : 'bold'))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    fontWeight === 'bold' ? 'bg-white/20 text-white' : 'bg-white/5 text-text-muted'
                  }`}
                >
                  B
                </button>
              </div>
            </div>

            {/* Font Size Slider */}
            <div>
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Font Size</span>
                <span className="font-mono">{fontSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="44"
                step="2"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-brand-mint"
              />
            </div>
          </div>

          {/* Color Palettes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Text Color</span>
              <div className="flex items-center gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      color === c ? 'scale-110 border-white' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>

            {/* Background Card Opacity */}
            <div>
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Card Background Opacity</span>
                <span className="font-mono">{Math.round(backgroundOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={backgroundOpacity}
                onChange={(e) => setBackgroundOpacity(Number(e.target.value))}
                className="w-full accent-brand-mint"
              />
            </div>
          </div>

          {/* Timing Controls */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Display Timing</span>
              <span className="font-mono text-white">
                {start.toFixed(1)}s – {end.toFixed(1)}s ({(end - start).toFixed(1)}s duration)
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
            <span>Save Text</span>
          </button>
        </div>
      </div>
    </div>
  );
}
