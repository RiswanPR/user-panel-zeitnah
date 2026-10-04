import { useState } from 'react';
import { Check, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { TEXT_COLORS } from './storyEditorConstants';

/**
 * StoryTextEditorModal — Focused dialog for adding/editing a text overlay.
 */
export default function StoryTextEditorModal({ isOpen, initialData, onSave, onCancel }) {
  const [text, setText] = useState(initialData?.text || '');
  const [color, setColor] = useState(initialData?.color || '#FFFFFF');
  const [bgStyle, setBgStyle] = useState(initialData?.bgStyle || 'dark');
  const [align, setAlign] = useState(initialData?.align || 'center');
  const [size, setSize] = useState(initialData?.size || 24);

  if (!isOpen) return null;

  const handleDone = () => {
    if (!text.trim()) {
      onCancel();
      return;
    }
    onSave({
      id: initialData?.id || `text_${Date.now()}`,
      text: text.trim(),
      color,
      bgStyle,
      align,
      size,
      x: initialData?.x ?? 0.5,
      y: initialData?.y ?? 0.45,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-between p-4 bg-black/90 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Add text overlay"
    >
      {/* Top Header: Cancel & Done */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] min-w-[44px] px-3 text-sm font-semibold text-text-muted hover:text-white transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <div className="flex items-center gap-2">
          {/* Alignment toggle */}
          <button
            type="button"
            onClick={() => {
              const order = ['left', 'center', 'right'];
              const next = order[(order.indexOf(align) + 1) % order.length];
              setAlign(next);
            }}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label={`Alignment: currently ${align}`}
          >
            {align === 'left' && <AlignLeft className="w-4 h-4" />}
            {align === 'center' && <AlignCenter className="w-4 h-4" />}
            {align === 'right' && <AlignRight className="w-4 h-4" />}
          </button>

          {/* Background pill toggle */}
          <button
            type="button"
            onClick={() => {
              const order = ['none', 'dark', 'light'];
              const next = order[(order.indexOf(bgStyle) + 1) % order.length];
              setBgStyle(next);
            }}
            className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-xs font-bold text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label={`Background: currently ${bgStyle}`}
          >
            A
          </button>
        </div>
        <button
          type="button"
          onClick={handleDone}
          className="min-h-[44px] min-w-[44px] px-4 py-1.5 rounded-full bg-brand-mint text-[#070B14] text-sm font-bold hover:opacity-90 transition-all cursor-pointer shadow-md"
        >
          Done
        </button>
      </div>

      {/* Center Live Textarea */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div
          className={`w-full max-w-sm rounded-2xl p-4 transition-colors ${
            bgStyle === 'dark'
              ? 'bg-black/70 backdrop-blur-sm'
              : bgStyle === 'light'
              ? 'bg-white/95 text-[#070B14]'
              : 'bg-transparent'
          }`}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 160))}
            placeholder="Type your story text..."
            rows={3}
            autoFocus
            style={{
              color: bgStyle === 'light' ? '#070B14' : color,
              textAlign: align,
              fontSize: `${size}px`,
            }}
            className="w-full bg-transparent resize-none focus:outline-none font-bold placeholder-white/40 drop-shadow-md leading-relaxed"
          />
        </div>
      </div>

      {/* Bottom Color & Size Controls */}
      <div className="space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {/* Size Slider */}
        <div className="flex items-center gap-3 px-4 max-w-xs mx-auto">
          <span className="text-[11px] font-medium text-text-muted">A</span>
          <input
            type="range"
            min={16}
            max={36}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="flex-1 accent-brand-mint h-1.5 bg-white/20 rounded-lg cursor-pointer"
            aria-label="Text size"
          />
          <span className="text-sm font-bold text-white">A</span>
        </div>

        {/* Color Palette */}
        <div className="flex items-center justify-center gap-2">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`min-w-[44px] min-h-[44px] rounded-full transition-all cursor-pointer flex items-center justify-center ${
                color === c
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110'
                  : 'opacity-85 hover:opacity-100 hover:scale-105'
              }`}
              aria-label={`Color ${c}`}
            >
              {color === c && (
                <Check
                  className={`w-3.5 h-3.5 ${
                    c === '#FFFFFF' || c === '#F5D900' || c === '#00F5A0' || c === '#00D9F5'
                      ? 'text-black'
                      : 'text-white'
                  }`}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
