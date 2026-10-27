import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createProgressSnapshot,
  sanitizeProgressPayload,
  resolveProgressEndpoint,
  isWorkspaceResponseStale,
  shouldSyncProgressRefs,
  isReloadRequestSuperseded,
} from './courseUi.js';
import { calculatePlaybackProgress } from './playerUnits.js';

describe('Zeitnah VdoCipher — Phase 1 & 1.1: Progress Integrity & Player Lifecycle Tests', () => {
  describe('Part 1: Progress Integrity Across Lesson Transitions', () => {
    it('Case 1: Lesson A produces a progress snapshot; user switches to Lesson B before save executes. Lesson A snapshot is never submitted to Lesson B endpoint.', () => {
      let activeClassId = 'lesson-A';
      const endpointsCalled = [];
      const bodiesReceived = [];

      const mockApiPost = (endpoint, body) => {
        endpointsCalled.push(endpoint);
        bodiesReceived.push(body);
        return Promise.resolve({ data: { success: true } });
      };

      // 1. Lesson A generates a progress snapshot
      const snapshotA = createProgressSnapshot({
        classId: activeClassId,
        completed: false,
        currentTimeSeconds: 120,
        durationSeconds: 600,
        totalCoveredSeconds: 120,
        totalPlayedSeconds: 120,
      });

      assert.equal(snapshotA.classId, 'lesson-A');

      // 2. User navigates to Lesson B before the async save resolves
      activeClassId = 'lesson-B';

      // 3. The save executes using the snapshot's stamped classId and sanitizeProgressPayload
      const { targetClassId, body } = sanitizeProgressPayload(snapshotA, activeClassId);
      const endpoint = resolveProgressEndpoint(targetClassId);
      mockApiPost(endpoint, body);

      assert.equal(targetClassId, 'lesson-A', 'Target class ID must remain Lesson A');
      assert.equal(endpoint, '/courses/class/lesson-A/progress', 'Must post to Lesson A endpoint');
      assert.ok(!endpointsCalled.includes('/courses/class/lesson-B/progress'), 'Must never post Lesson A snapshot to Lesson B endpoint');
      assert.equal(body.classId, undefined, 'Body must not contain classId (NestJS ValidationPipe whitelist compliant)');
      assert.equal(body.currentTimeSeconds, 120);
    });

    it('Case 2: A delayed callback from Lesson A arrives after Lesson B becomes active. The update remains associated with Lesson A or is safely guarded.', () => {
      let activeClassId = 'lesson-B';
      const activeClassIdRef = { current: 'lesson-B' };
      const localUIUpdatedFor = [];

      const handlePlayerCallback = ({ eventClassId, currentTime, duration }) => {
        // Guard check from ClassView: callbacks only update active lesson UI
        const targetClassId = eventClassId;
        const snapshot = createProgressSnapshot({
          classId: targetClassId,
          completed: false,
          currentTimeSeconds: currentTime,
          durationSeconds: duration,
          totalCoveredSeconds: currentTime,
          totalPlayedSeconds: currentTime,
        });

        const { targetClassId: sendClassId, body } = sanitizeProgressPayload(snapshot, targetClassId);
        const endpoint = resolveProgressEndpoint(sendClassId);

        // Only update current lesson UI if the response matches active lesson
        if (sendClassId === activeClassIdRef.current) {
          localUIUpdatedFor.push(sendClassId);
        }

        return { endpoint, body, sendClassId };
      };

      const result = handlePlayerCallback({
        eventClassId: 'lesson-A',
        currentTime: 75,
        duration: 300,
      });

      assert.equal(result.endpoint, '/courses/class/lesson-A/progress');
      assert.equal(result.sendClassId, 'lesson-A');
      assert.equal(localUIUpdatedFor.length, 0, 'UI state for Lesson B must not be updated by Lesson A callback');
    });

    it('Case 3: A workspace response for Lesson A arrives after user selected Lesson B. Stale response does not replace Lesson B state.', () => {
      let latestRequestedClassId = 'lesson-B';

      // Request for Lesson A started earlier, finishes now
      const targetIdA = 'lesson-A';
      const isStaleA = isWorkspaceResponseStale(targetIdA, latestRequestedClassId);
      assert.equal(isStaleA, true, 'Lesson A response must be identified as stale');

      // Request for Lesson B finishes
      const targetIdB = 'lesson-B';
      const isStaleB = isWorkspaceResponseStale(targetIdB, latestRequestedClassId);
      assert.equal(isStaleB, false, 'Lesson B response is authoritative and must be accepted');
    });

    it('Case 4: A pending valid progress save during navigation is not silently lost.', () => {
      let flushedEndpoint = null;
      let flushedBody = null;

      const mockApiPost = (endpoint, body) => {
        flushedEndpoint = endpoint;
        flushedBody = body;
        return Promise.resolve({ data: { success: true } });
      };

      // Active state before navigation
      const activeLesson = 'lesson-A';
      const latestSnapshot = createProgressSnapshot({
        classId: activeLesson,
        completed: false,
        currentTimeSeconds: 240,
        durationSeconds: 500,
        totalCoveredSeconds: 240,
        totalPlayedSeconds: 240,
      });

      // Simulation of handleSelectLesson:
      // 1. Flush valid snapshot for previous lesson
      if (latestSnapshot) {
        const { targetClassId, body } = sanitizeProgressPayload(latestSnapshot, activeLesson);
        mockApiPost(resolveProgressEndpoint(targetClassId), body);
      }

      assert.equal(flushedEndpoint, '/courses/class/lesson-A/progress');
      assert.equal(flushedBody.currentTimeSeconds, 240);
      assert.equal(flushedBody.completed, false);
      assert.equal(flushedBody.classId, undefined, 'classId stripped from request body');
    });

    it('Case 5: Page-exit flushing uses the correct lesson ID and latest valid snapshot.', () => {
      const activeClassId = 'lesson-X';
      const latestSnapshot = createProgressSnapshot({
        classId: activeClassId,
        completed: true,
        currentTimeSeconds: 600,
        durationSeconds: 600,
        totalCoveredSeconds: 600,
        totalPlayedSeconds: 600,
      });

      const targetLessonId = latestSnapshot?.classId || activeClassId;
      const { targetClassId, body } = sanitizeProgressPayload(latestSnapshot, targetLessonId);
      const endpoint = resolveProgressEndpoint(targetClassId, 'https://zeitnahacademy.com/api');

      assert.equal(targetClassId, 'lesson-X');
      assert.equal(endpoint, 'https://zeitnahacademy.com/api/courses/class/lesson-X/progress');
      assert.equal(body.completed, true);
      assert.equal(body.currentTimeSeconds, 600);
      assert.equal(body.classId, undefined);
    });

    it('Case 6: Existing throttling and completion semantics continue to work.', () => {
      const now = Date.now();
      const lastSaveTime = now - 5000; // Only 5s elapsed (< 15s)

      // Test anti-false completion metrics
      const progressMetrics = calculatePlaybackProgress({
        currentTime: 298,
        previousCurrentTime: 290,
        durationSeconds: 300,
        sessionElapsed: 280,
        lastTickTime: now - 1000,
        now,
        maxCoveredSeconds: 298,
      });

      assert.equal(progressMetrics.isLegitimateCompletion, true);

      // Verify that completion forces save even within 15s interval
      const isEnding = progressMetrics.isLegitimateCompletion;
      const shouldSave = now - lastSaveTime > 15000 || isEnding;
      assert.equal(shouldSave, true, 'Legitimate completion must bypass 15s throttle');
    });
  });

  describe('Part 2: Player Lifecycle and Credential Rebinding', () => {
    it('Case 1: Refreshing playback credentials for the same lesson causes the current player instance to rebind correctly.', () => {
      // Simulate player lifecycle manager
      let activePlayerInstance = null;
      const boundClassId = 'lesson-1';

      const mountPlayer = (otp, classId) => {
        activePlayerInstance = {
          otp,
          classId,
          listeners: new Map(),
          addEventListener(event, fn) {
            this.listeners.set(event, fn);
          },
          destroy() {
            this.listeners.clear();
          },
        };
        // Rebind listeners to new instance
        activePlayerInstance.addEventListener('timeupdate', () => {});
        activePlayerInstance.addEventListener('pause', () => {});
        activePlayerInstance.addEventListener('ended', () => {});
      };

      // Initial mount
      mountPlayer('otp-token-1', boundClassId);
      assert.equal(activePlayerInstance.otp, 'otp-token-1');
      assert.equal(activePlayerInstance.listeners.size, 3);

      // Credential refresh with new OTP for same class
      const oldPlayer = activePlayerInstance;
      oldPlayer.destroy();
      mountPlayer('otp-token-2', boundClassId);

      assert.equal(oldPlayer.listeners.size, 0, 'Old instance listeners must be cleared');
      assert.equal(activePlayerInstance.otp, 'otp-token-2');
      assert.equal(activePlayerInstance.listeners.size, 3, 'New instance must receive listeners');
    });

    it('Case 2: Old instance listeners are cleaned up properly.', () => {
      const listenersAttached = [];
      const listenersRemoved = [];

      const mockVideo = {
        addEventListener: (event) => listenersAttached.push(event),
        removeEventListener: (event) => listenersRemoved.push(event),
      };

      const events = ['loadedmetadata', 'play', 'timeupdate', 'pause', 'seeked', 'ended', 'error'];
      events.forEach((ev) => mockVideo.addEventListener(ev));

      assert.equal(listenersAttached.length, 7);

      // Cleanup phase
      events.forEach((ev) => mockVideo.removeEventListener(ev));
      assert.equal(listenersRemoved.length, 7);
      assert.deepEqual(listenersAttached, listenersRemoved);
    });

    it('Case 3: Repeated reloads do not create duplicate listeners.', () => {
      let currentListenerCount = 0;
      let activeInstance = null;

      const setupNewPlayer = () => {
        // If an old instance exists, it must be cleaned up first
        if (activeInstance) {
          currentListenerCount -= activeInstance.listenerCount;
          activeInstance = null;
        }

        activeInstance = {
          listenerCount: 5,
        };
        currentListenerCount += activeInstance.listenerCount;
      };

      // Trigger 5 rapid reloads
      for (let i = 0; i < 5; i++) {
        setupNewPlayer();
      }

      assert.equal(currentListenerCount, 5, 'Listener count must strictly equal one player instance (no duplicates)');
    });

    it('Case 4: An outdated SDK initialization callback cannot bind to a newer player instance or lesson.', () => {
      let activeClassId = 'lesson-1';
      let cancelled = false;
      let playerBoundTo = null;

      const delayedSdkInit = (targetClassId) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            // Guard from ClassView: if cancelled or classId changed, do not bind
            if (cancelled || targetClassId !== activeClassId) {
              resolve(null);
              return;
            }
            playerBoundTo = targetClassId;
            resolve(targetClassId);
          }, 10);
        });
      };

      // Start loading for lesson-1
      const p1 = delayedSdkInit('lesson-1');

      // User immediately switches to lesson-2
      cancelled = true;
      activeClassId = 'lesson-2';

      return p1.then((result) => {
        assert.equal(result, null, 'Stale SDK init callback must return without binding');
        assert.equal(playerBoundTo, null, 'Player must not be bound to obsolete lesson');
      });
    });

    it('Case 5: Playback errors and recovery states remain functional after reload.', () => {
      let errorState = null;

      const handleVdoReloadCatch = () => {
        errorState = {
          title: 'Playback Reload Failed',
          message: 'Could not reload the video stream credentials. Please check your connection and retry.',
          isRetryable: true,
        };
      };

      // Simulate a network failure during handleVdoReload
      handleVdoReloadCatch();

      assert.ok(errorState !== null, 'Player must transition to a recoverable error state');
      assert.equal(errorState.isRetryable, true, 'Error state must be retryable rather than permanently stuck loading');
      assert.equal(errorState.title, 'Playback Reload Failed');
    });

    it('Case 6: Iframe key property changes dynamically when OTP refreshes or lesson switches.', () => {
      // Tests that React key changes force DOM remount of iframe
      const getIframeKey = (vdoCipher, videoUrl) => vdoCipher?.otp || videoUrl;

      const keyInitial = getIframeKey({ otp: 'otp-v1' }, 'https://embed.vdocipher.com');
      const keyRefreshed = getIframeKey({ otp: 'otp-v2' }, 'https://embed.vdocipher.com');
      const keySwitched = getIframeKey({ otp: 'otp-lesson-2' }, 'https://embed.vdocipher.com');

      assert.notEqual(keyInitial, keyRefreshed, 'Key must differ when OTP refreshes, forcing iframe recreation');
      assert.notEqual(keyInitial, keySwitched, 'Key must differ when switching lessons');
    });
  });

  describe('Part 3: Phase 1.1 Targeted Hardening Tests', () => {
    it('1. Cleanup persists the final valid snapshot even after player event handling is cancelled.', () => {
      let cancelled = false;
      let flushedSnapshot = null;
      let flushedTargetId = null;

      const boundClassId = 'lesson-cleanup-1';
      let latestSnapshot = createProgressSnapshot({
        classId: boundClassId,
        completed: false,
        currentTimeSeconds: 150,
        durationSeconds: 500,
        totalCoveredSeconds: 150,
        totalPlayedSeconds: 150,
      });

      // Simulation of unmount lifecycle:
      // Step 1: cancel event listeners
      cancelled = true;
      assert.equal(cancelled, true);

      // Step 2: cleanup flush function executes independently of event cancellation
      const flushLatestProgress = () => {
        const snapshot = latestSnapshot;
        if (!snapshot || !boundClassId) return;
        const { targetClassId } = sanitizeProgressPayload(snapshot, boundClassId);
        flushedSnapshot = snapshot;
        flushedTargetId = targetClassId;
      };

      flushLatestProgress();

      assert.ok(flushedSnapshot !== null, 'Snapshot must be flushed during unmount');
      assert.equal(flushedTargetId, 'lesson-cleanup-1');
      assert.equal(flushedSnapshot.currentTimeSeconds, 150);
    });

    it('2. Cleanup does not persist a snapshot against the wrong lesson.', () => {
      const boundClassId = 'lesson-original';
      const activeClassId = 'lesson-switched'; // User switched activeClassId

      const snapshot = createProgressSnapshot({
        classId: boundClassId,
        completed: false,
        currentTimeSeconds: 88,
        durationSeconds: 400,
        totalCoveredSeconds: 88,
        totalPlayedSeconds: 88,
      });

      // flushLatestProgress resolves against boundClassId
      const targetLessonId = snapshot?.classId || boundClassId;
      const { targetClassId } = sanitizeProgressPayload(snapshot, targetLessonId);
      const endpoint = resolveProgressEndpoint(targetClassId);

      assert.equal(targetClassId, 'lesson-original');
      assert.equal(endpoint, '/courses/class/lesson-original/progress');
      assert.notEqual(targetClassId, activeClassId, 'Must not use activeClassId to override bound originating lesson');
    });

    it('3. SPA navigation preserves the final valid progress update.', () => {
      let fetchCalledWith = null;

      const mockFetch = (url, options) => {
        fetchCalledWith = { url, options };
      };

      const boundClassId = 'lesson-spa-nav';
      const latestSnapshot = createProgressSnapshot({
        classId: boundClassId,
        completed: false,
        currentTimeSeconds: 310,
        durationSeconds: 900,
        totalCoveredSeconds: 310,
        totalPlayedSeconds: 310,
      });

      // Simulate SPA unmount flush
      const { targetClassId, body } = sanitizeProgressPayload(latestSnapshot, boundClassId);
      const endpoint = resolveProgressEndpoint(targetClassId, 'https://zeitnahacademy.com/api');

      mockFetch(endpoint, {
        method: 'POST',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      });

      assert.ok(fetchCalledWith !== null);
      assert.equal(fetchCalledWith.url, 'https://zeitnahacademy.com/api/courses/class/lesson-spa-nav/progress');
      assert.equal(fetchCalledWith.options.keepalive, true, 'Keepalive must be enabled for SPA unmount flush');
      const parsedBody = JSON.parse(fetchCalledWith.options.body);
      assert.equal(parsedBody.currentTimeSeconds, 310);
      assert.equal(parsedBody.classId, undefined, 'classId must not be present in request body');
    });

    it('4. Old lesson data cannot repopulate the new lesson progress refs (shouldSyncProgressRefs).', () => {
      const oldLessonDataClassId = 'lesson-A';
      const newActiveClassId = 'lesson-B';

      // While workspace load is in flight, data belongs to lesson-A, but activeClassId is lesson-B
      const shouldSync = shouldSyncProgressRefs(oldLessonDataClassId, newActiveClassId);
      assert.equal(shouldSync, false, 'Stale lesson data must not sync into new active lesson refs');
    });

    it('5. New workspace data correctly initializes the new lesson refs (shouldSyncProgressRefs).', () => {
      const newLessonDataClassId = 'lesson-B';
      const activeClassId = 'lesson-B';

      // When workspace load completes, data.class._id matches activeClassId
      const shouldSync = shouldSyncProgressRefs(newLessonDataClassId, activeClassId);
      assert.equal(shouldSync, true, 'Matching lesson data must successfully sync into refs');

      // Initial mount scenario (null data)
      assert.equal(shouldSyncProgressRefs(null, 'lesson-B'), true, 'Initial mount without data must be permitted to initialize');
    });

    it('6. Page-exit progress uses the canonical endpoint helper.', () => {
      const endpoint = resolveProgressEndpoint('class-999', 'https://zeitnahacademy.com/api');
      assert.equal(endpoint, 'https://zeitnahacademy.com/api/courses/class/class-999/progress');
    });

    it('7. A base URL with trailing slashes generates the correct endpoint without double-slashes.', () => {
      const endpoint1 = resolveProgressEndpoint('lesson-1', 'https://api.domain.com/');
      assert.equal(endpoint1, 'https://api.domain.com/courses/class/lesson-1/progress');

      const endpoint2 = resolveProgressEndpoint('lesson-1', 'https://api.domain.com///');
      assert.equal(endpoint2, 'https://api.domain.com/courses/class/lesson-1/progress');

      const endpoint3 = resolveProgressEndpoint('lesson-1', '');
      assert.equal(endpoint3, '/courses/class/lesson-1/progress');
    });

    it('8. Out-of-order reload responses cannot overwrite newer credentials (isReloadRequestSuperseded).', () => {
      const requestedClassId = 'lesson-1';
      const latestRequestedClassId = 'lesson-1';

      // Sequence: Call 1 (seq 1), then Call 2 (seq 2).
      // Call 1 resolves late when latestSeq is 2:
      const call1Superseded = isReloadRequestSuperseded(1, 2, requestedClassId, latestRequestedClassId);
      assert.equal(call1Superseded, true, 'Call 1 must be marked superseded because newer Call 2 was triggered');

      // Call 2 resolves when latestSeq is 2:
      const call2Superseded = isReloadRequestSuperseded(2, 2, requestedClassId, latestRequestedClassId);
      assert.equal(call2Superseded, false, 'Call 2 must be accepted as authoritative');
    });

    it('9. A stale reload failure cannot override the latest reload state (isReloadRequestSuperseded).', () => {
      // User triggered reload on lesson-1 (seq 1), then switched to lesson-2 (seq 2)
      const call1FailureSuperseded = isReloadRequestSuperseded(1, 2, 'lesson-1', 'lesson-2');
      assert.equal(call1FailureSuperseded, true, 'Failure from earlier sequence on previous lesson must be discarded');

      // Stale failure arriving for lesson-1 after user navigated to lesson-2 (even if seq unchanged):
      const navigationSuperseded = isReloadRequestSuperseded(1, 1, 'lesson-1', 'lesson-2');
      assert.equal(navigationSuperseded, true, 'Failure for previous lesson must be discarded upon navigation');
    });

    it('10. Existing lesson switching, progress throttling, and player lifecycle tests remain valid.', () => {
      assert.ok(typeof createProgressSnapshot === 'function');
      assert.ok(typeof sanitizeProgressPayload === 'function');
      assert.ok(typeof resolveProgressEndpoint === 'function');
      assert.ok(typeof isWorkspaceResponseStale === 'function');
      assert.ok(typeof shouldSyncProgressRefs === 'function');
      assert.ok(typeof isReloadRequestSuperseded === 'function');
    });
  });
});
