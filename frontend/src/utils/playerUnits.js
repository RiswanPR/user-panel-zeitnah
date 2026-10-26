/**
 * Zeitnah Premium Player — Unit Conversion & Playback Utilities
 *
 * Defines explicit boundaries between native SDK milliseconds and web seconds.
 * Guarantees that playback position, progress calculation, seek targets, and resume
 * timestamps are never corrupted by mismatched time units.
 */

export const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
export const DEFAULT_SPEED = 1.0;
export const SEEK_DELTA_SECONDS = 10;
export const COMPLETION_THRESHOLD_SECONDS = 2;

/**
 * Normalizes any timestamp input to integer or float seconds.
 * Explicitly guards against millisecond values (e.g. 15,000ms -> 15s).
 *
 * @param {number|unknown} value - Timestamp in seconds or milliseconds
 * @returns {number} Timestamp in seconds (>= 0)
 */
export function normalizeToSeconds(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return 0;
  }
  // If the value is unmistakably in milliseconds (e.g., > 1000 for realistic lesson durations),
  // convert to seconds.
  if (num >= 1000) {
    return Math.round((num / 1000) * 100) / 100;
  }
  return Math.round(num * 100) / 100;
}

/**
 * Converts seconds to whole milliseconds for native SDK calls (e.g. seek, resumeTimeMs).
 *
 * @param {number|unknown} seconds - Position in seconds
 * @returns {number} Position in integer milliseconds (>= 0)
 */
export function toMilliseconds(seconds) {
  const num = Number(seconds);
  if (!Number.isFinite(num) || num <= 0) {
    return 0;
  }
  return Math.round(num * 1000);
}

/**
 * Calculates clamped target position for seeking gestures (e.g. +/- 10 seconds).
 *
 * @param {Object} params
 * @param {number} params.currentSeconds - Current playback position in seconds
 * @param {number} params.deltaSeconds - Seek offset (+10 or -10)
 * @param {number} [params.durationSeconds] - Total media duration in seconds
 * @returns {{ targetSeconds: number, targetMs: number }}
 */
export function calculateSeekTarget({ currentSeconds, deltaSeconds, durationSeconds }) {
  const current = normalizeToSeconds(currentSeconds);
  const delta = Number(deltaSeconds) || 0;
  const maxDuration = Number.isFinite(Number(durationSeconds)) && Number(durationSeconds) > 0
    ? normalizeToSeconds(durationSeconds)
    : Infinity;

  const targetSeconds = Math.max(0, Math.min(maxDuration, Math.round(current + delta)));
  const targetMs = toMilliseconds(targetSeconds);

  return {
    targetSeconds,
    targetMs,
  };
}

/**
 * Determines whether playback has reached completion based on media duration.
 *
 * @param {Object} params
 * @param {number} params.currentTimeSeconds
 * @param {number} params.durationSeconds
 * @param {number} [params.thresholdSeconds=2]
 * @returns {boolean}
 */
export function isPlaybackCompleted({
  currentTimeSeconds,
  durationSeconds,
  thresholdSeconds = COMPLETION_THRESHOLD_SECONDS,
}) {
  const current = normalizeToSeconds(currentTimeSeconds);
  const duration = normalizeToSeconds(durationSeconds);

  if (duration <= 0) {
    return false;
  }

  return current >= Math.max(0, duration - thresholdSeconds);
}

/**
 * Validates playback speed against supported presets.
 *
 * @param {number|unknown} speed
 * @returns {number} Valid speed preset (defaults to 1.0)
 */
export function sanitizePlaybackSpeed(speed) {
  const num = Number(speed);
  if (SPEED_PRESETS.includes(num)) {
    return num;
  }
  return DEFAULT_SPEED;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS.
 *
 * @param {number|unknown} seconds
 * @returns {string} Formatted timestamp string (e.g. "04:12" or "1:05:30")
 */
export function formatTimestamp(seconds) {
  const num = Number(seconds);
  if (!Number.isFinite(num) || num <= 0) return '00:00';
  const total = Math.floor(num);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Parses timestamp string (e.g. "04:15", "1:20:00") or number into seconds.
 *
 * @param {string|number|unknown} input
 * @returns {number|null} Valid seconds or null if unparseable
 */
export function parseTimestamp(input) {
  if (typeof input === 'number') {
    return Number.isFinite(input) && input >= 0 ? Math.round(input) : null;
  }
  if (typeof input !== 'string') {
    return null;
  }
  const clean = input.trim().replace(/^\[|\]$/g, '');
  const parts = clean.split(':').map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) {
    return null;
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

/**
 * Validates, normalizes, sorts, and deduplicates in-video timestamped chapters.
 * Rejects chapters if input is not real chapter data. Does NOT fabricate timestamps.
 *
 * @param {Array<unknown>} chapters - Raw chapter array from video metadata
 * @param {number} [durationSeconds] - Video duration for boundary clamping
 * @returns {Array<{ title: string, timestampSeconds: number, formattedTime: string }>}
 */
export function sanitizeChapters(chapters, durationSeconds = Infinity) {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return [];
  }

  const maxDuration = Number.isFinite(Number(durationSeconds)) && Number(durationSeconds) > 0
    ? Number(durationSeconds)
    : Infinity;

  const valid = [];
  for (const ch of chapters) {
    if (!ch || typeof ch !== 'object') continue;
    const title = typeof ch.title === 'string' ? ch.title.trim() : '';
    let parsedTime = null;
    if (typeof ch.timestampSeconds === 'number') {
      parsedTime = ch.timestampSeconds;
    } else if (typeof ch.timeSeconds === 'number') {
      parsedTime = ch.timeSeconds;
    } else {
      const rawTime = ch.timestamp ?? ch.time;
      parsedTime = typeof rawTime === 'number'
        ? normalizeToSeconds(rawTime)
        : parseTimestamp(rawTime);
    }

    if (title && parsedTime !== null && parsedTime >= 0 && parsedTime <= maxDuration) {
      valid.push({
        title,
        timestampSeconds: Math.round(parsedTime),
        formattedTime: formatTimestamp(parsedTime),
      });
    }
  }

  // Sort ascending by timestamp
  valid.sort((a, b) => a.timestampSeconds - b.timestampSeconds);

  // Deduplicate timestamps within 1 second
  const deduplicated = [];
  for (const item of valid) {
    const prev = deduplicated[deduplicated.length - 1];
    if (!prev || Math.abs(prev.timestampSeconds - item.timestampSeconds) >= 1) {
      deduplicated.push(item);
    }
  }

  return deduplicated;
}

/**
 * Validates a bookmark creation request, guarding against rapid duplicate taps.
 *
 * @param {Object} params
 * @param {number} params.timestampSeconds - Current playback position
 * @param {Array<{ timestampSeconds: number }>} params.existingBookmarks
 * @param {number} [params.minIntervalSeconds=2] - Minimum separation between bookmarks
 * @param {number} [params.durationSeconds] - Total duration
 * @returns {{ valid: boolean, isValid: boolean, reason?: string, sanitizedTimestamp: number }}
 */
export function validateBookmark({
  timestampSeconds,
  existingBookmarks = [],
  minIntervalSeconds = 2,
  durationSeconds = Infinity,
}) {
  const rawTime = Number(timestampSeconds);
  const maxDur = Number.isFinite(Number(durationSeconds)) && Number(durationSeconds) > 0
    ? Number(durationSeconds)
    : Infinity;

  if (!Number.isFinite(rawTime) || rawTime < 0) {
    return {
      valid: false,
      isValid: false,
      reason: 'Invalid timestamp',
      sanitizedTimestamp: 0,
    };
  }

  if (rawTime > maxDur) {
    return {
      valid: false,
      isValid: false,
      reason: 'Bookmark cannot exceed video duration',
      sanitizedTimestamp: Math.round(maxDur),
    };
  }

  const sanitized = Math.round(rawTime);

  if (Array.isArray(existingBookmarks)) {
    const isDuplicate = existingBookmarks.some(
      (b) => Math.abs(Number(b?.timestampSeconds) - sanitized) < minIntervalSeconds
    );
    if (isDuplicate) {
      return {
        valid: false,
        isValid: false,
        reason: 'A bookmark already exists at this timestamp',
        sanitizedTimestamp: sanitized,
      };
    }
  }

  return {
    valid: true,
    isValid: true,
    sanitizedTimestamp: sanitized,
  };
}

/**
 * Sorts bookmarks by timestamp ascending.
 *
 * @param {Array<any>} bookmarks
 * @returns {Array<any>}
 */
export function sortBookmarks(bookmarks) {
  if (!Array.isArray(bookmarks)) return [];
  return [...bookmarks].sort(
    (a, b) => Number(a?.timestampSeconds || 0) - Number(b?.timestampSeconds || 0)
  );
}

/**
 * Sorts notes by timestamp ascending, then creation time.
 *
 * @param {Array<any>} notes
 * @returns {Array<any>}
 */
export function sortNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return [...notes].sort((a, b) => {
    const timeDiff = normalizeToSeconds(a?.timestampSeconds) - normalizeToSeconds(b?.timestampSeconds);
    if (timeDiff !== 0) return timeDiff;
    return (a?.createdAt || 0) - (b?.createdAt || 0);
  });
}

/**
 * Computes legitimate playback elapsed time and coverage, guarding against false completion from seek jumps.
 *
 * @param {Object} params
 * @param {number} params.currentTime - Current playback position in seconds
 * @param {number} params.previousCurrentTime - Previous playback position in seconds
 * @param {number} params.durationSeconds - Video duration in seconds
 * @param {number} params.sessionElapsed - Accumulated actual watched seconds in this session
 * @param {number} params.lastTickTime - Timestamp of last progress tick (ms)
 * @param {number} params.now - Current timestamp (ms)
 * @param {number} params.maxCoveredSeconds - Highest contiguous position covered
 * @returns {{
 *   sessionElapsed: number,
 *   maxCoveredSeconds: number,
 *   isSeekJump: boolean,
 *   isLegitimateCompletion: boolean
 * }}
 */
export function calculatePlaybackProgress({
  currentTime,
  previousCurrentTime,
  durationSeconds,
  sessionElapsed = 0,
  lastTickTime = 0,
  now = Date.now(),
  maxCoveredSeconds = 0,
}) {
  const current = normalizeToSeconds(currentTime);
  const prev = normalizeToSeconds(previousCurrentTime);
  const duration = normalizeToSeconds(durationSeconds);

  let updatedSessionElapsed = sessionElapsed;
  const isSeekJump = prev > 0 && Math.abs(current - prev) > 2.5;

  if (lastTickTime > 0 && !isSeekJump) {
    const deltaMs = now - lastTickTime;
    // Only accumulate if tick interval is realistic for 1x-2x playback (e.g. 50ms - 2500ms)
    if (deltaMs > 50 && deltaMs < 2500) {
      updatedSessionElapsed += deltaMs / 1000;
    }
  }

  // Coverage only increases smoothly; jumping forward does not claim covered seconds
  let updatedMaxCovered = maxCoveredSeconds;
  if (!isSeekJump && current > updatedMaxCovered) {
    updatedMaxCovered = Math.min(duration > 0 ? duration : Infinity, current);
  }

  // Anti-false-completion: must have legitimately covered near the end,
  // not just a solitary jump to the last 2 seconds.
  const reachedEnd = duration > 0 && current >= duration - 2;
  const hasCoveredEnough = duration > 0 && updatedMaxCovered >= duration - 3;
  const isLegitimateCompletion = reachedEnd && (hasCoveredEnough || updatedSessionElapsed >= duration * 0.8);

  return {
    sessionElapsed: Math.round(updatedSessionElapsed * 10) / 10,
    maxCoveredSeconds: Math.round(updatedMaxCovered * 10) / 10,
    isSeekJump,
    isLegitimateCompletion,
  };
}

