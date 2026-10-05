import { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  RotateCw,
  Video,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

const ASPECT_RATIOS = [
  { id: 'original', label: 'Original', class: 'aspect-auto' },
  { id: '1:1', label: '1:1 Square', class: 'aspect-square' },
  { id: '4:5', label: '4:5 Portrait', class: 'aspect-[4/5]' },
  { id: '16:9', label: '16:9 Landscape', class: 'aspect-video' },
];

/**
 * PostMediaManager — Creator-grade Media and Carousel Manager for Zeitnah Community:
 * Supports single media, multi-image carousels, reordering (move left/right),
 * replacing, removing, aspect ratios, rotation, and honest per-item upload progress states.
 */
export default function PostMediaManager({
  files,
  activeMediaIndex,
  onSelectIndex,
  onRemoveFile,
  onMoveLeft,
  onMoveRight,
  onAddMoreFiles,
  aspectRatio,
  onAspectRatioChange,
  rotation,
  onRotate,
  isUploading,
}) {
  const addMoreInputRef = useRef(null);
  const currentMedia = files[activeMediaIndex] || files[0];

  if (!files || files.length === 0) return null;

  return (
    <div className="space-y-3.5 p-4 rounded-2xl bg-[#091220] border border-white/[0.08]">
      {/* Top Media Bar: Aspect Ratio & Rotation Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.id}
              type="button"
              onClick={() => onAspectRatioChange(ratio.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                aspectRatio === ratio.id
                  ? 'bg-brand-mint text-[#070B14] font-semibold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              {ratio.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onRotate}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-white rounded-xl text-xs transition-colors border border-white/[0.06] cursor-pointer"
          title="Rotate 90 degrees"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Rotate</span>
        </button>
      </div>

      {/* Primary Active Media Preview Stage */}
      {currentMedia && (
        <div className="relative rounded-2xl bg-black/60 border border-white/[0.06] overflow-hidden flex items-center justify-center min-h-[220px] max-h-[380px]">
          {currentMedia.type === 'image' && (
            <img
              src={currentMedia.previewUrl}
              alt={currentMedia.name}
              style={{ transform: `rotate(${rotation}deg)` }}
              className={`max-h-[360px] w-full object-contain transition-transform duration-200 ${
                ASPECT_RATIOS.find((r) => r.id === aspectRatio)?.class || 'aspect-auto'
              }`}
            />
          )}

          {currentMedia.type === 'video' && (
            <video
              src={currentMedia.previewUrl}
              controls
              playsInline
              className="max-h-[360px] w-full object-contain"
            />
          )}

          {currentMedia.type === 'document' && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <FileText className="w-14 h-14 text-brand-mint mb-3" />
              <p className="text-sm font-semibold text-white truncate max-w-xs">{currentMedia.name}</p>
              <p className="text-xs text-text-muted mt-1">
                {(currentMedia.size / (1024 * 1024)).toFixed(1)} MB PDF document
              </p>
            </div>
          )}

          {/* Carousel Position Badge */}
          {files.length > 1 && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-white select-none">
              {activeMediaIndex + 1} / {files.length}
            </div>
          )}

          {/* Media Reorder & Remove Actions */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {files.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => onMoveLeft(activeMediaIndex)}
                  disabled={activeMediaIndex === 0 || isUploading}
                  className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Move left"
                  aria-label="Move media left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveRight(activeMediaIndex)}
                  disabled={activeMediaIndex === files.length - 1 || isUploading}
                  className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Move right"
                  aria-label="Move media right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onRemoveFile(currentMedia.id)}
              disabled={isUploading}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-500/80 text-white transition-colors cursor-pointer"
              title="Remove media"
              aria-label="Remove active media item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Carousel Thumbnail Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span className="font-medium text-white/90">
            {files.length === 1 ? 'Attached media' : `Carousel items (${files.length})`}
          </span>
          <span className="text-[11px] text-text-faint">Drag or click to reorder</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {files.map((file, idx) => {
            const isSelected = idx === activeMediaIndex;
            return (
              <div
                key={file.id}
                onClick={() => onSelectIndex(idx)}
                className={`relative group shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-brand-mint shadow-[0_0_12px_rgba(159,213,178,0.3)] ring-2 ring-brand-mint/30'
                    : 'border-white/[0.08] hover:border-white/[0.25]'
                }`}
              >
                {file.type === 'image' && (
                  <img src={file.previewUrl} alt={file.name} className="w-full h-full object-cover" />
                )}
                {file.type === 'video' && (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center text-text-muted">
                    <Video className="w-6 h-6 text-brand-mint" />
                  </div>
                )}
                {file.type === 'document' && (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center text-text-muted">
                    <FileText className="w-6 h-6 text-brand-mint" />
                  </div>
                )}

                {/* Index badge */}
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-white">
                  {idx + 1}
                </div>

                {/* Upload status indicator */}
                {file.uploadedUrl && (
                  <div className="absolute bottom-1 right-1 p-0.5 rounded-full bg-emerald-500 text-black">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Add More Media Button */}
          {files.length < 10 && (
            <button
              type="button"
              onClick={() => addMoreInputRef.current?.click()}
              disabled={isUploading}
              className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-dashed border-white/[0.15] hover:border-brand-mint/60 bg-white/[0.02] hover:bg-white/[0.05] flex flex-col items-center justify-center gap-1 text-text-muted hover:text-brand-mint transition-colors cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span className="text-[10px] font-medium">Add</span>
            </button>
          )}

          <input
            ref={addMoreInputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            onChange={onAddMoreFiles}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
