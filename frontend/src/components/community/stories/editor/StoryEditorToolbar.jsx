import {
  Type,
  Pencil,
  Smile,
  Wand2,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';

/**
 * StoryEditorToolbar — Main interactive tools bar positioned at the bottom of the editor.
 */
export default function StoryEditorToolbar({
  isVideo,
  isMuted,
  onToggleMute,
  activeTool,
  onSelectTool,
  isPreviewMode,
  onTogglePreview,
  hasEdits,
  onResetEdits,
  disabled,
}) {
  return (
    <div
      className="p-3 bg-gradient-to-t from-black via-black/90 to-transparent border-t border-white/[0.08] flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none"
      role="toolbar"
      aria-label="Story editing tools"
    >
      {/* Primary Creation Tools (Images & Videos) */}
      <div className="flex items-center gap-1.5">
        {/* Text Tool */}
        <button
          type="button"
          disabled={disabled || isPreviewMode}
          onClick={() => onSelectTool(activeTool === 'text' ? null : 'text')}
          className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
            activeTool === 'text'
              ? 'bg-brand-mint text-[#070B14] shadow-md shadow-brand-mint/20'
              : 'bg-white/[0.05] hover:bg-white/[0.1] text-text-muted hover:text-white'
          } disabled:opacity-30 disabled:cursor-not-allowed`}
          aria-label="Add text overlay"
          title="Text Overlay"
        >
          <Type className="w-4 h-4" />
        </button>

        {/* Drawing Pen (Images only, or caption markup) */}
        {!isVideo && (
          <button
            type="button"
            disabled={disabled || isPreviewMode}
            onClick={() => onSelectTool(activeTool === 'draw' ? null : 'draw')}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
              activeTool === 'draw'
                ? 'bg-brand-mint text-[#070B14] shadow-md shadow-brand-mint/20'
                : 'bg-white/[0.05] hover:bg-white/[0.1] text-text-muted hover:text-white'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            aria-label="Draw on photo"
            title="Pen / Drawing"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}

        {/* Stickers Tool */}
        {!isVideo && (
          <button
            type="button"
            disabled={disabled || isPreviewMode}
            onClick={() => onSelectTool(activeTool === 'sticker' ? null : 'sticker')}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
              activeTool === 'sticker'
                ? 'bg-brand-mint text-[#070B14] shadow-md shadow-brand-mint/20'
                : 'bg-white/[0.05] hover:bg-white/[0.1] text-text-muted hover:text-white'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            aria-label="Add sticker"
            title="Stickers & Emojis"
          >
            <Smile className="w-4 h-4" />
          </button>
        )}

        {/* Filters Tool (Images only) */}
        {!isVideo && (
          <button
            type="button"
            disabled={disabled || isPreviewMode}
            onClick={() => onSelectTool(activeTool === 'filter' ? null : 'filter')}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
              activeTool === 'filter'
                ? 'bg-brand-mint text-[#070B14] shadow-md shadow-brand-mint/20'
                : 'bg-white/[0.05] hover:bg-white/[0.1] text-text-muted hover:text-white'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            aria-label="Photo filters"
            title="Filters & Moods"
          >
            <Wand2 className="w-4 h-4" />
          </button>
        )}

        {/* Video Audio Mute Toggle */}
        {isVideo && (
          <button
            type="button"
            disabled={disabled}
            onClick={onToggleMute}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-text-muted hover:text-white transition-all flex items-center justify-center cursor-pointer disabled:opacity-30"
            aria-label={isMuted ? 'Unmute video story' : 'Mute video story'}
            title={isMuted ? 'Muted' : 'Sound On'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-brand-mint" />}
          </button>
        )}
      </div>

      {/* Right Utility Actions: Reset & Preview */}
      <div className="flex items-center gap-1.5">
        {/* Reset Edits */}
        {hasEdits && !isPreviewMode && (
          <button
            type="button"
            disabled={disabled}
            onClick={onResetEdits}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 text-text-muted hover:text-rose-400 transition-all flex items-center justify-center cursor-pointer disabled:opacity-30"
            title="Reset all edits"
            aria-label="Reset all edits"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {/* Preview Mode Toggle */}
        <button
          type="button"
          disabled={disabled}
          onClick={onTogglePreview}
          className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            isPreviewMode
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'bg-white/[0.05] hover:bg-white/[0.1] text-text-muted hover:text-white'
          }`}
          aria-label={isPreviewMode ? 'Exit preview' : 'Preview final story'}
          title="Preview Mode"
        >
          {isPreviewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="hidden sm:inline">{isPreviewMode ? 'Edit' : 'Preview'}</span>
        </button>
      </div>
    </div>
  );
}
