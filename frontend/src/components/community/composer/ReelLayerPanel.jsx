import { X, Layers, Type, Smile, Subtitles, Trash2, Edit3, Plus } from 'lucide-react';

export default function ReelLayerPanel({
  isOpen,
  layers = [],
  activeLayerId = null,
  onSelectLayer,
  onEditLayer,
  onDeleteLayer,
  onOpenTextEditor,
  onOpenStickerPicker,
  onOpenCaptionEditor,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Editor layers manager"
    >
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-[#090F1C] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-mint/15 border border-brand-mint/30 flex items-center justify-center text-brand-mint">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">Editor Layers</h3>
              <p className="text-[11px] text-text-muted">{layers.length}/10 active layers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close layers panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Add Bar */}
        <div className="px-5 py-2.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-xs">
          <span className="text-text-muted">Add new:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onClose?.();
                onOpenTextEditor?.();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-brand-mint/20 text-white hover:text-brand-mint transition-colors text-[11px] font-medium"
            >
              <Type className="w-3 h-3" />
              <span>Text</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose?.();
                onOpenStickerPicker?.();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-brand-yellow/20 text-white hover:text-brand-yellow transition-colors text-[11px] font-medium"
            >
              <Smile className="w-3 h-3" />
              <span>Sticker</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose?.();
                onOpenCaptionEditor?.();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-sky-400/20 text-white hover:text-sky-400 transition-colors text-[11px] font-medium"
            >
              <Subtitles className="w-3 h-3" />
              <span>Caption</span>
            </button>
          </div>
        </div>

        {/* Layers List */}
        <div className="p-5 overflow-y-auto min-h-[200px] space-y-2">
          {layers.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="w-12 h-12 rounded-full bg-white/5 mx-auto flex items-center justify-center text-text-muted">
                <Layers className="w-6 h-6 opacity-40" />
              </div>
              <p className="text-white font-medium text-sm">No layers added yet</p>
              <p className="text-xs text-text-muted max-w-[220px] mx-auto">
                Add text cards, stickers, or captions to enhance your Reel.
              </p>
            </div>
          ) : (
            layers.map((layer, index) => {
              const isSelected = activeLayerId === layer.id;
              const timingText = `${Number(layer.start ?? 0).toFixed(1)}s – ${Number(layer.end ?? 0).toFixed(1)}s`;

              return (
                <div
                  key={layer.id}
                  onClick={() => onSelectLayer?.(layer.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-mint/10 border-brand-mint/60 shadow-xs'
                      : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        layer.type === 'TEXT'
                          ? 'bg-brand-mint/15 text-brand-mint'
                          : layer.type === 'STICKER'
                          ? 'bg-brand-yellow/15 text-brand-yellow'
                          : 'bg-sky-400/15 text-sky-400'
                      }`}
                    >
                      {layer.type === 'TEXT' && <Type className="w-4 h-4" />}
                      {layer.type === 'STICKER' && <Smile className="w-4 h-4" />}
                      {layer.type === 'CAPTION' && <Subtitles className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {layer.type === 'TEXT' && (layer.content || 'Text Layer')}
                        {layer.type === 'STICKER' && (layer.name || layer.stickerId || 'Sticker')}
                        {layer.type === 'CAPTION' && (layer.content || 'Caption Segment')}
                      </p>
                      <p className="text-[10px] text-text-muted font-mono">{timingText}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {onEditLayer && layer.type !== 'STICKER' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose?.();
                          onEditLayer?.(layer);
                        }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                        title="Edit layer"
                        aria-label="Edit layer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLayer?.(layer.id);
                      }}
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Delete layer"
                      aria-label="Delete layer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
