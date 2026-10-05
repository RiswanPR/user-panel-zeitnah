import { useState, useId } from 'react';
import { Plus, Trash2, Clock, HelpCircle, AlertCircle } from 'lucide-react';

const DURATION_OPTIONS = [
  { value: 1, label: '1 Day' },
  { value: 3, label: '3 Days' },
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
];

/**
 * PostPollBuilder — Creator-grade Poll Builder for Zeitnah Community:
 * Implements question input, options management (2-5 options), duration selection,
 * inline duplicate-option prevention, and maximum character enforcement based on backend schema.
 */
export default function PostPollBuilder({
  question,
  onQuestionChange,
  options,
  onOptionsChange,
  durationDays,
  onDurationChange,
  onRemovePoll,
}) {
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const questionId = useId();

  const handleOptionChange = (index, value) => {
    const next = [...options];
    next[index] = value;
    onOptionsChange(next);

    // Check for duplicates
    const trimmed = next.map((o) => o.trim().toLowerCase()).filter(Boolean);
    const hasDupes = new Set(trimmed).size !== trimmed.length;
    if (hasDupes) {
      setDuplicateWarning('Each option must be unique.');
    } else {
      setDuplicateWarning('');
    }
  };

  const handleAddOption = () => {
    if (options.length >= 5) return;
    onOptionsChange([...options, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    const next = options.filter((_, i) => i !== index);
    onOptionsChange(next);

    const trimmed = next.map((o) => o.trim().toLowerCase()).filter(Boolean);
    if (new Set(trimmed).size === trimmed.length) {
      setDuplicateWarning('');
    }
  };

  return (
    <div
      className="p-4 sm:p-5 rounded-2xl bg-[#0B1524] border border-white/[0.09] space-y-4"
      role="region"
      aria-label="Poll Builder"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white">Create a Poll</h4>
            <p className="text-[11px] text-text-muted">Engage the community with a question</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRemovePoll}
          className="text-xs text-rose-400/80 hover:text-rose-300 hover:underline transition-colors cursor-pointer px-2 py-1"
        >
          Remove poll
        </button>
      </div>

      {/* Poll Question Input */}
      <div>
        <label htmlFor={questionId} className="block text-[11px] font-medium text-text-secondary mb-1.5">
          Poll Question <span className="text-brand-mint">*</span>
        </label>
        <input
          id={questionId}
          type="text"
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          placeholder="e.g. Which design approach works best for this foundation?"
          maxLength={200}
          className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/50 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-text-faint focus:outline-none transition-colors"
        />
        <div className="flex justify-end text-[10px] text-text-faint mt-1">
          {question.length}/200
        </div>
      </div>

      {/* Poll Options List */}
      <div className="space-y-2.5">
        <label className="block text-[11px] font-medium text-text-secondary">
          Options (2 to 5) <span className="text-brand-mint">*</span>
        </label>

        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-5 text-center text-xs font-semibold text-text-muted select-none">
              {idx + 1}.
            </span>
            <input
              type="text"
              value={opt}
              onChange={(e) => handleOptionChange(idx, e.target.value)}
              placeholder={`Option ${idx + 1}`}
              maxLength={100}
              className="flex-1 bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/50 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-text-faint focus:outline-none transition-colors"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => handleRemoveOption(idx)}
                className="p-2 text-text-muted hover:text-rose-400 hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer"
                aria-label={`Remove option ${idx + 1}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {duplicateWarning && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 pt-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {options.length < 5 && (
          <button
            type="button"
            onClick={handleAddOption}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-mint hover:text-brand-mint/80 py-1.5 px-2 rounded-lg hover:bg-brand-mint/10 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add option</span>
          </button>
        )}
      </div>

      {/* Poll Duration */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Clock className="w-3.5 h-3.5" />
          <span>Poll duration:</span>
        </div>
        <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
          {DURATION_OPTIONS.map((dur) => (
            <button
              key={dur.value}
              type="button"
              onClick={() => onDurationChange(dur.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                durationDays === dur.value
                  ? 'bg-brand-mint text-[#070B14] font-semibold shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              {dur.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
