import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SPEED_PRESETS,
  DEFAULT_SPEED,
  normalizeToSeconds,
  toMilliseconds,
  calculateSeekTarget,
  isPlaybackCompleted,
  sanitizePlaybackSpeed,
} from './playerUnits.js';

describe('Zeitnah Premium Player — Phase 1 Core Unit Tests', () => {
  describe('1. Time Unit Normalization & Precision', () => {
    it('accurately normalizes millisecond callbacks to seconds (15,000ms -> 15s)', () => {
      const positionMs = 15000;
      const seconds = normalizeToSeconds(positionMs);
      assert.equal(seconds, 15);
      assert.notEqual(seconds, 15000, 'Must not treat 15,000ms as 15,000 seconds');
    });

    it('preserves seconds when value is already in seconds (< 1000)', () => {
      assert.equal(normalizeToSeconds(42), 42);
      assert.equal(normalizeToSeconds(0), 0);
      assert.equal(normalizeToSeconds(125.5), 125.5);
    });

    it('safely handles invalid, NaN, and negative inputs', () => {
      assert.equal(normalizeToSeconds(null), 0);
      assert.equal(normalizeToSeconds(undefined), 0);
      assert.equal(normalizeToSeconds('invalid'), 0);
      assert.equal(normalizeToSeconds(-50), 0);
      assert.equal(normalizeToSeconds(NaN), 0);
    });

    it('converts seconds to whole milliseconds for native SDK calls', () => {
      assert.equal(toMilliseconds(15), 15000);
      assert.equal(toMilliseconds(42.5), 42500);
      assert.equal(toMilliseconds(0), 0);
      assert.equal(toMilliseconds(-10), 0);
      assert.equal(toMilliseconds('invalid'), 0);
    });
  });

  describe('2. Double-Tap Seeking Target Calculation & Boundary Clamping', () => {
    it('calculates forward seek (+10s) clamped within duration', () => {
      const result = calculateSeekTarget({
        currentSeconds: 20,
        deltaSeconds: 10,
        durationSeconds: 100,
      });

      assert.equal(result.targetSeconds, 30);
      assert.equal(result.targetMs, 30000);
    });

    it('clamps forward seek to maximum media duration', () => {
      const result = calculateSeekTarget({
        currentSeconds: 95,
        deltaSeconds: 10,
        durationSeconds: 100,
      });

      assert.equal(result.targetSeconds, 100);
      assert.equal(result.targetMs, 100000);
    });

    it('calculates backward seek (-10s) clamped at zero', () => {
      const result = calculateSeekTarget({
        currentSeconds: 5,
        deltaSeconds: -10,
        durationSeconds: 100,
      });

      assert.equal(result.targetSeconds, 0);
      assert.equal(result.targetMs, 0);
    });

    it('handles seeking when duration is unknown or zero without negative values', () => {
      const result = calculateSeekTarget({
        currentSeconds: 12,
        deltaSeconds: 10,
        durationSeconds: 0,
      });

      assert.equal(result.targetSeconds, 22);
      assert.equal(result.targetMs, 22000);
    });
  });

  describe('3. Playback Completion Logic', () => {
    it('marks playback as completed when within threshold (duration - 2s)', () => {
      const durationSeconds = 300; // 5 minutes
      assert.equal(
        isPlaybackCompleted({ currentTimeSeconds: 298, durationSeconds }),
        true
      );
      assert.equal(
        isPlaybackCompleted({ currentTimeSeconds: 299, durationSeconds }),
        true
      );
      assert.equal(
        isPlaybackCompleted({ currentTimeSeconds: 300, durationSeconds }),
        true
      );
    });

    it('does not mark playback completed when before threshold', () => {
      const durationSeconds = 300;
      assert.equal(
        isPlaybackCompleted({ currentTimeSeconds: 297, durationSeconds }),
        false
      );
      assert.equal(
        isPlaybackCompleted({ currentTimeSeconds: 150, durationSeconds }),
        false
      );
    });

    it('rejects completion when duration is invalid or zero', () => {
      assert.equal(
        isPlaybackCompleted({ currentTimeSeconds: 50, durationSeconds: 0 }),
        false
      );
      assert.equal(
        isPlaybackCompleted({ currentTimeSeconds: 50, durationSeconds: -10 }),
        false
      );
    });
  });

  describe('4. Playback Speed Presets & Sanitization', () => {
    it('supports all required presets: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x', () => {
      assert.deepEqual(SPEED_PRESETS, [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]);
      SPEED_PRESETS.forEach((speed) => {
        assert.equal(sanitizePlaybackSpeed(speed), speed);
      });
    });

    it('falls back to default 1.0x for unsupported or invalid speed values', () => {
      assert.equal(sanitizePlaybackSpeed(3.0), DEFAULT_SPEED);
      assert.equal(sanitizePlaybackSpeed(0), DEFAULT_SPEED);
      assert.equal(sanitizePlaybackSpeed(-1), DEFAULT_SPEED);
      assert.equal(sanitizePlaybackSpeed('invalid'), DEFAULT_SPEED);
      assert.equal(sanitizePlaybackSpeed(null), DEFAULT_SPEED);
    });
  });

  describe('5. Resume Position Calculation', () => {
    it('converts saved position seconds to integer resumeTimeMs', () => {
      const savedPositionSeconds = 145; // 2m 25s
      const resumeTimeMs = toMilliseconds(savedPositionSeconds);
      assert.equal(resumeTimeMs, 145000);
      assert.equal(typeof resumeTimeMs, 'number');
    });

    it('returns zero for initial or unstarted lessons (no unwanted seek)', () => {
      assert.equal(toMilliseconds(0), 0);
      assert.equal(toMilliseconds(null), 0);
      assert.equal(toMilliseconds(undefined), 0);
    });
  });

  describe('6. Timestamp Formatting & Parsing', () => {
    it('formats seconds into MM:SS and HH:MM:SS', async () => {
      const { formatTimestamp } = await import('./playerUnits.js');
      assert.equal(formatTimestamp(0), '00:00');
      assert.equal(formatTimestamp(65), '01:05');
      assert.equal(formatTimestamp(3665), '1:01:05');
      assert.equal(formatTimestamp(7200), '2:00:00');
    });

    it('parses valid timestamp strings into integer seconds', async () => {
      const { parseTimestamp } = await import('./playerUnits.js');
      assert.equal(parseTimestamp('01:30'), 90);
      assert.equal(parseTimestamp('[02:15]'), 135);
      assert.equal(parseTimestamp('1:05:00'), 3900);
      assert.equal(parseTimestamp(120), 120);
    });

    it('returns null for invalid or non-numeric timestamp strings', async () => {
      const { parseTimestamp } = await import('./playerUnits.js');
      assert.equal(parseTimestamp('invalid'), null);
      assert.equal(parseTimestamp('12:xx'), null);
      assert.equal(parseTimestamp(null), null);
      assert.equal(parseTimestamp(undefined), null);
    });
  });

  describe('7. Timestamped Chapters Sanitization & Boundary Safety', () => {
    it('sanitizes chapters, removes duplicates, and filters out-of-range timestamps', async () => {
      const { sanitizeChapters } = await import('./playerUnits.js');
      const rawChapters = [
        { title: 'Intro', timestampSeconds: 0 },
        { title: 'Section 1', timestampSeconds: 120 },
        { title: 'Duplicate Section', timestampSeconds: 120 },
        { title: 'Beyond Duration', timestampSeconds: 9999 },
        { title: 'Negative Timestamp', timestampSeconds: -50 },
        { title: 'Malformed', timestampSeconds: 'not-a-number' },
      ];
      const durationSeconds = 600; // 10 minutes
      const result = sanitizeChapters(rawChapters, durationSeconds);

      assert.equal(result.length, 2);
      assert.equal(result[0].title, 'Intro');
      assert.equal(result[0].timestampSeconds, 0);
      assert.equal(result[1].title, 'Section 1');
      assert.equal(result[1].timestampSeconds, 120);
    });

    it('returns empty array when input is not an array or has no valid timestamps', async () => {
      const { sanitizeChapters } = await import('./playerUnits.js');
      assert.deepEqual(sanitizeChapters(null, 300), []);
      assert.deepEqual(sanitizeChapters(undefined, 300), []);
      assert.deepEqual(sanitizeChapters('not-array', 300), []);
      assert.deepEqual(sanitizeChapters([], 300), []);
    });
  });

  describe('8. Bookmarks Validation & Ordering', () => {
    it('prevents duplicate bookmarks within minIntervalSeconds (accidental double-taps)', async () => {
      const { validateBookmark } = await import('./playerUnits.js');
      const existing = [{ id: 'bm1', timestampSeconds: 45 }];

      const tooClose = validateBookmark({
        timestampSeconds: 46,
        existingBookmarks: existing,
        minIntervalSeconds: 2,
        durationSeconds: 300,
      });
      assert.equal(tooClose.isValid, false);
      assert.match(tooClose.reason, /already exists/i);

      const farEnough = validateBookmark({
        timestampSeconds: 50,
        existingBookmarks: existing,
        minIntervalSeconds: 2,
        durationSeconds: 300,
      });
      assert.equal(farEnough.isValid, true);
    });

    it('rejects bookmarks beyond video duration', async () => {
      const { validateBookmark } = await import('./playerUnits.js');
      const outOfRange = validateBookmark({
        timestampSeconds: 305,
        existingBookmarks: [],
        minIntervalSeconds: 2,
        durationSeconds: 300,
      });
      assert.equal(outOfRange.isValid, false);
      assert.match(outOfRange.reason, /cannot exceed video duration/i);
    });

    it('sorts bookmarks in ascending timestamp order', async () => {
      const { sortBookmarks } = await import('./playerUnits.js');
      const unsorted = [
        { id: '3', timestampSeconds: 150 },
        { id: '1', timestampSeconds: 20 },
        { id: '2', timestampSeconds: 65 },
      ];
      const sorted = sortBookmarks(unsorted);
      assert.deepEqual(
        sorted.map((b) => b.timestampSeconds),
        [20, 65, 150]
      );
    });
  });

  describe('9. Notes Sorting & Line-Break Preservation', () => {
    it('sorts notes by timestamp ascending', async () => {
      const { sortNotes } = await import('./playerUnits.js');
      const unsorted = [
        { id: 'b', timestampSeconds: 300, text: 'Note 2' },
        { id: 'a', timestampSeconds: 30, text: 'Note 1' },
      ];
      const sorted = sortNotes(unsorted);
      assert.equal(sorted[0].id, 'a');
      assert.equal(sorted[1].id, 'b');
    });

    it('preserves multiline text and special characters in notes safely', () => {
      const noteText = 'Point 1: React State\nPoint 2: Lifecycle\n<script>alert(1)</script>';
      assert.ok(noteText.includes('\n'), 'Preserves newlines');
      assert.ok(noteText.includes('<script>'), 'Preserves verbatim text without executing HTML');
    });
  });

  describe('10. Accurate Progress Accounting & Anti-False-Completion', () => {
    it('detects seek jumps and does NOT add jump distance to sessionElapsed', async () => {
      const { calculatePlaybackProgress } = await import('./playerUnits.js');
      // User jumped from 10s to 250s
      const result = calculatePlaybackProgress({
        currentTime: 250,
        previousCurrentTime: 10,
        durationSeconds: 300,
        sessionElapsed: 10,
        lastTickTime: Date.now() - 500,
        now: Date.now(),
        maxCoveredSeconds: 10,
      });

      assert.equal(result.isSeekJump, true);
      assert.equal(
        result.sessionElapsed,
        10,
        'sessionElapsed must NOT increase on seek jump'
      );
      assert.equal(
        result.isLegitimateCompletion,
        false,
        'Jumping to the end must NOT trigger completion'
      );
    });

    it('accumulates sessionElapsed and expands maxCoveredSeconds during legitimate playback', async () => {
      const { calculatePlaybackProgress } = await import('./playerUnits.js');
      const now = Date.now();
      const result = calculatePlaybackProgress({
        currentTime: 21,
        previousCurrentTime: 20,
        durationSeconds: 300,
        sessionElapsed: 20,
        lastTickTime: now - 1000, // 1 second tick
        now,
        maxCoveredSeconds: 20,
      });

      assert.equal(result.isSeekJump, false);
      assert.equal(result.sessionElapsed, 21);
      assert.equal(result.maxCoveredSeconds, 21);
    });

    it('grants legitimate completion when user watched through the end with sufficient coverage', async () => {
      const { calculatePlaybackProgress } = await import('./playerUnits.js');
      const now = Date.now();
      const durationSeconds = 300;
      const result = calculatePlaybackProgress({
        currentTime: 299,
        previousCurrentTime: 298,
        durationSeconds,
        sessionElapsed: 260,
        lastTickTime: now - 1000,
        now,
        maxCoveredSeconds: 298,
      });

      assert.equal(result.isLegitimateCompletion, true);
    });
  });
});
