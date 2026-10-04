import { useState } from 'react';
import { Sparkles } from 'lucide-react';

const CHAR_LIMIT = 260;

function renderFormattedText(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-brand-mint hover:underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

/**
 * PostContent — Editorial caption and body typography for Zeitnah Community posts.
 * Implements line clamping, 'more' toggle, hashtags, and AI summaries.
 */
export default function PostContent({
  content,
  aiSummary,
  tags,
  author,
  isMediaPost = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const authorName = author?.name || author?.displayName || 'Member';
  const isLong = Boolean(content && (content.length > CHAR_LIMIT || content.split('\n').length > 3));
  const displayedContent = isLong && !isExpanded
    ? `${content.slice(0, CHAR_LIMIT).trim()}...`
    : content;

  return (
    <div className={isMediaPost ? 'mt-1.5 px-0.5' : 'my-2.5'}>
      {/* AI Summary Highlight if available */}
      {aiSummary && (
        <div className="mb-3 p-3 bg-brand-mint/10 border border-brand-mint/20 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1 text-brand-mint">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider">AI Summary</span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            {aiSummary}
          </p>
        </div>
      )}

      {/* Main Post Content */}
      {content && (
        <div className="leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-w-prose">
          {isMediaPost ? (
            <p className="text-[13px] sm:text-sm text-slate-200/90 leading-[1.6]">
              <span className="font-semibold text-white mr-1.5">{authorName}</span>
              <span className="font-normal">{renderFormattedText(displayedContent)}</span>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="text-xs font-normal text-text-muted/80 hover:text-white transition-colors ml-1.5 cursor-pointer focus:outline-none focus:underline"
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? 'less' : 'more'}
                </button>
              )}
            </p>
          ) : (
            <div>
              <p className="text-[14px] sm:text-[15px] text-slate-100 font-normal leading-[1.65] tracking-[-0.01em]">
                {renderFormattedText(displayedContent)}
              </p>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="text-xs font-normal text-text-muted hover:text-white transition-colors pt-1.5 cursor-pointer focus:outline-none focus:underline block"
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hashtag Badges */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {tags.map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              className="text-[12px] font-normal text-brand-mint/75 hover:text-brand-mint hover:underline transition-colors cursor-pointer select-none"
            >
              #{tag.replace(/^#/, '')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
