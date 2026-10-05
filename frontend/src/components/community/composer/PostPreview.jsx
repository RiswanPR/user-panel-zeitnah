import { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Repeat,
  Bookmark,
  Share2,
  ChevronLeft,
  ChevronRight,
  Globe,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { getUploadUrl } from '../../../utils/courseUi';

function renderPreviewText(text) {
  if (!text) return null;
  const tokens = text.split(/(\s+)/);
  return tokens.map((token, i) => {
    if (token.startsWith('#') && token.length > 1) {
      return (
        <span key={i} className="text-brand-mint font-medium">
          {token}
        </span>
      );
    }
    if (token.startsWith('@') && token.length > 1) {
      return (
        <span key={i} className="text-sky-400 font-medium">
          {token}
        </span>
      );
    }
    if (token.match(/^https?:\/\//)) {
      return (
        <span key={i} className="text-brand-mint underline break-all">
          {token}
        </span>
      );
    }
    return token;
  });
}

/**
 * PostPreview — High-fidelity local preview of the post:
 * Reuses the visual grammar of Community PostCard (Author, Content, Media/Carousel, Poll, Engagement)
 * without triggering real API mutations, network metrics, or view tracking.
 */
export default function PostPreview({
  user,
  content,
  files,
  tags,
  audience,
  pollQuestion,
  pollOptions,
  pollDurationDays,
  aspectRatio,
  rotation,
}) {
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [selectedPollOption, setSelectedPollOption] = useState(null);

  const authorName = user?.name || 'You';
  const authorHandle = user?.username ? `@${user.username}` : '@creator';
  const avatarUrl = user?.avatar ? getUploadUrl(user.avatar) : null;
  const userInitials = authorName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'Z';

  const validPollOptions = (pollOptions || []).filter((o) => o && o.trim());
  const hasPoll = Boolean(pollQuestion && pollQuestion.trim() && validPollOptions.length >= 2);
  const hasMedia = Array.isArray(files) && files.length > 0;
  const currentMedia = hasMedia ? files[activeMediaIdx] || files[0] : null;

  return (
    <div className="max-w-[560px] mx-auto bg-[#070B14] border border-white/[0.1] rounded-3xl overflow-hidden shadow-2xl text-white">
      {/* 1. AUTHOR HEADER */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/[0.1] overflow-hidden flex items-center justify-center font-bold text-xs text-brand-mint shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={authorName} className="w-full h-full object-cover" />
            ) : (
              userInitials
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white">{authorName}</span>
              <span className="text-[10px] text-brand-mint px-1.5 py-0.2 rounded bg-brand-mint/10 border border-brand-mint/20 font-medium">
                {audience || 'PUBLIC'}
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              {authorHandle} · <span className="text-text-faint">Just now</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. MEDIA PREVIEW (If media attached) */}
      {hasMedia && currentMedia && (
        <div className="relative bg-black/80 flex items-center justify-center overflow-hidden border-b border-white/[0.06] max-h-[460px]">
          {currentMedia.type === 'image' && (
            <img
              src={currentMedia.previewUrl}
              alt="Preview"
              style={{ transform: `rotate(${rotation || 0}deg)` }}
              className="w-full max-h-[440px] object-contain"
            />
          )}

          {currentMedia.type === 'video' && (
            <video
              src={currentMedia.previewUrl}
              controls
              playsInline
              className="w-full max-h-[440px] object-contain"
            />
          )}

          {currentMedia.type === 'document' && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <FileText className="w-16 h-16 text-brand-mint mb-3" />
              <p className="text-sm font-semibold text-white truncate max-w-xs">{currentMedia.name}</p>
              <p className="text-xs text-text-muted mt-1">PDF Document preview</p>
            </div>
          )}

          {/* Carousel Navigation Arrows */}
          {files.length > 1 && (
            <>
              {activeMediaIdx > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveMediaIdx((prev) => Math.max(0, prev - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {activeMediaIdx < files.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveMediaIdx((prev) => Math.min(files.length - 1, prev + 1))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Indicator dots */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md">
                {files.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === activeMediaIdx ? 'bg-brand-mint w-3' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>

              {/* Indicator counter */}
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/75 text-[10px] font-semibold text-white">
                {activeMediaIdx + 1} / {files.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. CAPTION & TEXT CONTENT */}
      {content && (
        <div className="p-4 space-y-2">
          <p className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-wrap break-words">
            {renderPreviewText(content)}
          </p>

          {/* Hashtag pills */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[12px] font-normal text-brand-mint/80 select-none"
                >
                  #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. POLL PREVIEW (If poll configured) */}
      {hasPoll && (
        <div className="p-4 mx-4 mb-3 rounded-2xl bg-[#0B1524] border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <HelpCircle className="w-4 h-4 text-brand-mint" />
            <span>{pollQuestion}</span>
          </div>

          <div className="space-y-2">
            {validPollOptions.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedPollOption(idx)}
                className={`w-full relative overflow-hidden rounded-xl border p-2.5 text-left text-xs transition-colors cursor-pointer flex items-center justify-between ${
                  selectedPollOption === idx
                    ? 'border-brand-mint bg-brand-mint/10 text-white font-medium'
                    : 'border-white/[0.08] hover:border-white/[0.2] bg-white/[0.02] text-text-secondary'
                }`}
              >
                <span>{opt}</span>
                <span className="text-[10px] text-text-muted">0%</span>
              </button>
            ))}
          </div>

          <p className="text-[10px] text-text-muted">
            Poll ends in {pollDurationDays || 7} days · 0 votes
          </p>
        </div>
      )}

      {/* 5. MOCK INTERACTION BAR */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] text-text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs hover:text-rose-400 transition-colors select-none">
            <Heart className="w-4 h-4" />
            <span>0</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs hover:text-white transition-colors select-none">
            <MessageCircle className="w-4 h-4" />
            <span>0</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs hover:text-brand-mint transition-colors select-none">
            <Repeat className="w-4 h-4" />
            <span>0</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-text-muted select-none" />
          <Share2 className="w-4 h-4 text-text-muted select-none" />
        </div>
      </div>
    </div>
  );
}
