import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEvent, useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import Slider from '@react-native-community/slider';
import {
  AlertTriangle,
  FastForward,
  Gauge,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture,
  Play,
  RefreshCw,
  Rewind,
} from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';

type VideoContentType = 'auto' | 'progressive' | 'hls' | 'dash' | 'smoothStreaming';

export interface VideoProgressSnapshot {
  positionMillis: number;
  durationMillis: number;
  watchedDurationMillis: number;
  coveredDurationMillis: number;
  bufferedMillis: number;
  completionPercentage: number;
  isComplete: boolean;
}

interface PremiumVideoPlayerProps {
  videoUrl: string;
  title?: string;
  videoHeaders?: Record<string, string>;
  contentType?: VideoContentType;
  useCaching?: boolean;
  autoPlay?: boolean;
  autoSaveIntervalMillis?: number;
  initialPositionMillis?: number;
  initialDurationMillis?: number;
  initialWatchedDurationMillis?: number;
  initialCoveredDurationMillis?: number;
  initialCompletionPercentage?: number;
  onProgress?: (progress: number, snapshot: VideoProgressSnapshot) => void;
  onPositionSave?: (snapshot: VideoProgressSnapshot) => void | Promise<void>;
  onEnd?: (snapshot: VideoProgressSnapshot) => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const AUTO_SAVE_MS = 15000;
const HIDE_CONTROLS_MS = 3200;
const SEEK_SECONDS = 10;

const clamp = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};
const toMillis = (seconds: number) => Math.max(0, Math.round(seconds * 1000));
const toSeconds = (millis: number) => Math.max(0, millis / 1000);

const inferContentType = (uri: string, explicit?: VideoContentType): VideoContentType => {
  if (explicit) return explicit;
  const clean = uri.split('?')[0]?.split('#')[0]?.toLowerCase() || '';
  if (clean.endsWith('.m3u8')) return 'hls';
  if (clean.endsWith('.mpd')) return 'dash';
  if (clean.endsWith('.mp4') || clean.endsWith('.mov') || clean.endsWith('.m4v')) return 'progressive';
  return 'auto';
};

const formatTime = (millis: number) => {
  const total = Math.max(0, Math.floor(millis / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const readableError = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'Unable to play this video. Please check your connection and try again.';
};

export const PremiumVideoPlayer: React.FC<PremiumVideoPlayerProps> = ({
  videoUrl,
  title,
  videoHeaders,
  contentType,
  useCaching = false,
  autoPlay = false,
  autoSaveIntervalMillis = AUTO_SAVE_MS,
  initialPositionMillis = 0,
  initialDurationMillis = 0,
  initialWatchedDurationMillis = 0,
  initialCoveredDurationMillis = 0,
  initialCompletionPercentage = 0,
  onProgress,
  onPositionSave,
  onEnd,
}) => {
  const viewRef = useRef<VideoView>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacks = useRef({ onProgress, onPositionSave, onEnd });
  const latestSnapshot = useRef<VideoProgressSnapshot | null>(null);
  const positionRef = useRef(Math.max(0, initialPositionMillis));
  const durationRef = useRef(Math.max(0, initialDurationMillis));
  const watchedRef = useRef(Math.max(0, initialWatchedDurationMillis));
  const coveredRef = useRef(Math.max(0, initialCoveredDurationMillis, initialPositionMillis));
  const percentRef = useRef(clamp(initialCompletionPercentage, 0, 100));
  const lastPlaybackSecondRef = useRef<number | null>(null);
  const lastSavedAtRef = useRef(0);
  const lastSavedPositionRef = useRef(initialPositionMillis);
  const isPlayingRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const pipRef = useRef(false);

  const [positionMillis, setPositionMillis] = useState(Math.max(0, initialPositionMillis));
  const [durationMillis, setDurationMillis] = useState(Math.max(0, initialDurationMillis));
  const [bufferedMillis, setBufferedMillis] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [hasFirstFrame, setHasFirstFrame] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    callbacks.current = { onProgress, onPositionSave, onEnd };
  }, [onProgress, onPositionSave, onEnd]);

  const source = useMemo(
    () => ({
      uri: videoUrl,
      headers: videoHeaders,
      contentType: inferContentType(videoUrl, contentType),
      useCaching,
      metadata: title ? { title } : undefined,
    }),
    [contentType, title, useCaching, videoHeaders, videoUrl]
  );

  const player = useVideoPlayer(
    source,
    (createdPlayer) => {
      createdPlayer.loop = false;
      createdPlayer.preservesPitch = true;
      createdPlayer.timeUpdateEventInterval = 0.5;
      createdPlayer.keepScreenOnWhilePlaying = true;
      createdPlayer.audioMixingMode = 'auto';
      createdPlayer.seekTolerance = { toleranceBefore: 0.5, toleranceAfter: 0.5 };
      createdPlayer.bufferOptions = {
        preferredForwardBufferDuration: 30,
        waitsToMinimizeStalling: true,
        minBufferForPlayback: 2,
        maxBufferBytes: 50 * 1024 * 1024,
        prioritizeTimeOverSizeThreshold: true,
      };
      if (initialPositionMillis > 0) createdPlayer.currentTime = toSeconds(initialPositionMillis);
      if (autoPlay) createdPlayer.play();
    },
    { seekBackwardIncrement: SEEK_SECONDS, seekForwardIncrement: SEEK_SECONDS }
  );

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const statusEvent = useEvent(player, 'statusChange', { status: player.status, error: undefined });
  const playerStatus = statusEvent.status;
  const effectiveError = errorMessage || statusEvent.error?.message || null;
  const isLoading = playerStatus === 'loading' || (playerStatus === 'idle' && !hasFirstFrame);
  const controlsVisible =
    showControls || !isPlaying || isSeeking || isLoading || showSpeedMenu || Boolean(effectiveError);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    setHasFirstFrame(false);
    setErrorMessage(null);
    setShowControls(true);
    setShowSpeedMenu(false);
    setPositionMillis(Math.max(0, initialPositionMillis));
    setDurationMillis(Math.max(0, initialDurationMillis));
    setBufferedMillis(0);
    positionRef.current = Math.max(0, initialPositionMillis);
    durationRef.current = Math.max(0, initialDurationMillis);
    watchedRef.current = Math.max(0, initialWatchedDurationMillis);
    coveredRef.current = Math.max(0, initialCoveredDurationMillis, initialPositionMillis);
    percentRef.current = clamp(initialCompletionPercentage, 0, 100);
    latestSnapshot.current = null;
    lastPlaybackSecondRef.current = null;
    lastSavedPositionRef.current = initialPositionMillis;
  }, [
    initialCompletionPercentage,
    initialCoveredDurationMillis,
    initialDurationMillis,
    initialPositionMillis,
    initialWatchedDurationMillis,
    videoUrl,
  ]);

  useEffect(() => {
    if (playerStatus === 'error') {
      setErrorMessage(
        statusEvent.error?.message ||
          'Unable to load this video. The signed link may have expired or the network is unavailable.'
      );
    } else if (playerStatus === 'loading' || playerStatus === 'readyToPlay') {
      setErrorMessage(null);
    }
  }, [playerStatus, statusEvent.error?.message]);

  const clearControlsTimer = useCallback(() => {
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current);
      controlsTimer.current = null;
    }
  }, []);

  const revealControls = useCallback(
    (keepVisible = false) => {
      setShowControls(true);
      clearControlsTimer();
      if (keepVisible) return;

      controlsTimer.current = setTimeout(() => {
        if (isPlayingRef.current && !showSpeedMenu) setShowControls(false);
      }, HIDE_CONTROLS_MS);
    },
    [clearControlsTimer, showSpeedMenu]
  );

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  }, []);

  const buildSnapshot = useCallback(
    (nextPosition: number, nextDuration = durationRef.current, nextBuffered = bufferedMillis, complete = false) => {
      const safeDuration = Math.max(0, nextDuration || durationRef.current || 0);
      const maxPosition = safeDuration > 0 ? safeDuration : Number.MAX_SAFE_INTEGER;
      const safePosition = clamp(nextPosition, 0, maxPosition);
      const covered = safeDuration
        ? Math.min(safeDuration, Math.max(coveredRef.current, safePosition))
        : Math.max(coveredRef.current, safePosition);
      const calculatedPercent = safeDuration > 0 ? (covered / safeDuration) * 100 : 0;
      const completionPercentage = complete
        ? 100
        : clamp(Math.max(percentRef.current, calculatedPercent), 0, 100);

      positionRef.current = safePosition;
      durationRef.current = safeDuration;
      coveredRef.current = covered;
      percentRef.current = completionPercentage;

      return {
        positionMillis: safePosition,
        durationMillis: safeDuration,
        watchedDurationMillis: watchedRef.current,
        coveredDurationMillis: covered,
        bufferedMillis: Math.max(0, nextBuffered),
        completionPercentage,
        isComplete: complete,
      } satisfies VideoProgressSnapshot;
    },
    [bufferedMillis]
  );

  const emitSnapshot = useCallback((snapshot: VideoProgressSnapshot) => {
    latestSnapshot.current = snapshot;
    callbacks.current.onProgress?.(snapshot.completionPercentage, snapshot);
  }, []);

  const saveSnapshot = useCallback(
    (snapshot: VideoProgressSnapshot | null, force = false) => {
      if (!snapshot || !callbacks.current.onPositionSave) return;

      const now = Date.now();
      const moved = Math.abs(snapshot.positionMillis - lastSavedPositionRef.current) >= 3000;
      if (force || snapshot.isComplete || (moved && now - lastSavedAtRef.current >= autoSaveIntervalMillis)) {
        lastSavedAtRef.current = now;
        lastSavedPositionRef.current = snapshot.positionMillis;
        void callbacks.current.onPositionSave(snapshot);
      }
    },
    [autoSaveIntervalMillis]
  );

  useEventListener(player, 'sourceLoad', ({ duration }) => {
    const loadedDuration = toMillis(duration);
    durationRef.current = loadedDuration;
    setDurationMillis(loadedDuration);
    emitSnapshot(buildSnapshot(positionRef.current, loadedDuration, bufferedMillis));
  });

  useEventListener(player, 'timeUpdate', ({ currentTime, bufferedPosition }) => {
    const nextPosition = toMillis(currentTime);
    const nextBuffered = bufferedPosition > 0 ? toMillis(bufferedPosition) : 0;

    if (isPlayingRef.current && lastPlaybackSecondRef.current !== null) {
      const delta = currentTime - lastPlaybackSecondRef.current;
      if (delta > 0 && delta <= 3) watchedRef.current += toMillis(delta);
    }

    lastPlaybackSecondRef.current = currentTime;
    positionRef.current = nextPosition;
    if (!isSeeking) setPositionMillis(nextPosition);
    setBufferedMillis(nextBuffered);

    const snapshot = buildSnapshot(nextPosition, durationRef.current || durationMillis, nextBuffered);
    emitSnapshot(snapshot);
    saveSnapshot(snapshot);
  });

  useEventListener(player, 'playbackRateChange', ({ playbackRate: nextRate }) => {
    setPlaybackRate(nextRate);
  });

  useEventListener(player, 'playToEnd', () => {
    const finalDuration = durationRef.current || positionRef.current || durationMillis;
    const snapshot = buildSnapshot(finalDuration, finalDuration, finalDuration, true);
    setPositionMillis(finalDuration);
    emitSnapshot(snapshot);
    saveSnapshot(snapshot, true);
    callbacks.current.onEnd?.(snapshot);
    setShowControls(true);
  });

  useEffect(() => {
    if (isPlaying) {
      revealControls();
    } else {
      setShowControls(true);
      clearControlsTimer();
      if (wasPlayingRef.current) saveSnapshot(latestSnapshot.current, true);
    }
    wasPlayingRef.current = isPlaying;
  }, [clearControlsTimer, isPlaying, revealControls, saveSnapshot]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        saveSnapshot(latestSnapshot.current, true);
        if (!pipRef.current) player.pause();
      }
    });
    return () => subscription.remove();
  }, [player, saveSnapshot]);

  useEffect(() => {
    return () => {
      clearControlsTimer();
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      saveSnapshot(latestSnapshot.current, true);
      player.pause();
      StatusBar.setHidden(false, 'fade');
      void ScreenOrientation.unlockAsync();
    };
  }, [clearControlsTimer, player, saveSnapshot]);

  const seekTo = useCallback(
    (targetMillis: number) => {
      const max = durationRef.current || durationMillis || Number.MAX_SAFE_INTEGER;
      const next = clamp(targetMillis, 0, max);
      player.currentTime = toSeconds(next);
      setPositionMillis(next);
      const snapshot = buildSnapshot(next, durationRef.current, bufferedMillis);
      emitSnapshot(snapshot);
      saveSnapshot(snapshot, true);
      revealControls();
    },
    [bufferedMillis, buildSnapshot, durationMillis, emitSnapshot, player, revealControls, saveSnapshot]
  );

  const togglePlay = useCallback(() => {
    if (effectiveError) return;
    if (isPlayingRef.current) player.pause();
    else player.play();
    revealControls();
  }, [effectiveError, player, revealControls]);

  const setSpeed = useCallback(
    (speed: number) => {
      player.playbackRate = speed;
      setPlaybackRate(speed);
      setShowSpeedMenu(false);
      showNotice(`${speed}x speed`);
      revealControls();
    },
    [player, revealControls, showNotice]
  );

  const retry = useCallback(async () => {
    setErrorMessage(null);
    setHasFirstFrame(false);
    revealControls(true);
    try {
      await player.replaceAsync(source);
      if (positionRef.current > 0) player.currentTime = toSeconds(positionRef.current);
      player.play();
    } catch (error) {
      setErrorMessage(readableError(error));
    }
  }, [player, revealControls, source]);

  const enterFullscreen = useCallback(async () => {
    setIsFullscreen(true);
    StatusBar.setHidden(true, 'fade');
    revealControls();
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
    } catch {
      showNotice('Landscape lock is unavailable on this device.');
    }
  }, [revealControls, showNotice]);

  const exitFullscreen = useCallback(async () => {
    setIsFullscreen(false);
    StatusBar.setHidden(false, 'fade');
    revealControls(true);
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch {
      await ScreenOrientation.unlockAsync();
    }
  }, [revealControls]);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) void exitFullscreen();
    else void enterFullscreen();
  }, [enterFullscreen, exitFullscreen, isFullscreen]);

  const startPiP = useCallback(async () => {
    revealControls(true);
    try {
      await viewRef.current?.startPictureInPicture();
    } catch (error) {
      showNotice(error instanceof Error && error.message ? error.message : 'Picture-in-picture is unavailable.');
    }
  }, [revealControls, showNotice]);

  const startSeeking = useCallback(() => {
    setIsSeeking(true);
    setShowControls(true);
    clearControlsTimer();
    player.scrubbingModeOptions = {
      scrubbingModeEnabled: true,
      increaseCodecOperatingRate: true,
      enableDynamicScheduling: true,
      useDecodeOnlyFlag: true,
      allowSkippingMediaCodecFlush: true,
    };
  }, [clearControlsTimer, player]);

  const finishSeeking = useCallback(
    (value: number) => {
      player.scrubbingModeOptions = { scrubbingModeEnabled: false };
      setIsSeeking(false);
      seekTo(value);
    },
    [player, seekTo]
  );

  const speedMenu = showSpeedMenu ? (
    <View style={styles.speedMenu}>
      {SPEEDS.map((speed) => {
        const selected = Math.abs(playbackRate - speed) < 0.01;
        return (
          <TouchableOpacity
            key={speed}
            style={[styles.speedOption, selected && styles.speedOptionActive]}
            onPress={() => setSpeed(speed)}
            activeOpacity={0.85}
          >
            <Text style={[styles.speedOptionText, selected && styles.speedOptionTextActive]}>{speed}x</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  ) : null;

  const renderControls = () => {
    if (!controlsVisible || effectiveError) return null;
    const maxSlider = durationMillis || Math.max(positionMillis, 1);
    const bufferedPercent = durationMillis > 0 ? clamp((bufferedMillis / durationMillis) * 100, 0, 100) : 0;

    return (
      <View style={styles.controlsOverlay}>
        <View style={styles.topBar}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>Zeitnah Academy</Text>
            <Text style={styles.title} numberOfLines={1}>{title || 'Course video'}</Text>
          </View>
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => { setShowSpeedMenu((v) => !v); revealControls(true); }}>
              <Gauge color={colors.primaryText} size={20} />
              <Text style={styles.rateText}>{playbackRate}x</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.roundIconButton} onPress={startPiP}>
              <PictureInPicture color={colors.primaryText} size={20} />
            </TouchableOpacity>
          </View>
          {speedMenu}
        </View>

        <View style={styles.centerControls}>
          <TouchableOpacity onPress={() => seekTo(positionRef.current - SEEK_SECONDS * 1000)} style={styles.sideControlButton}>
            <Rewind color={colors.primaryText} size={28} />
            <Text style={styles.seekLabel}>10s</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={togglePlay} style={styles.playButton} activeOpacity={0.9}>
            {isPlaying ? <Pause color={colors.primaryText} size={38} /> : <Play color={colors.primaryText} size={38} fill={colors.primaryText} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => seekTo(positionRef.current + SEEK_SECONDS * 1000)} style={styles.sideControlButton}>
            <FastForward color={colors.primaryText} size={28} />
            <Text style={styles.seekLabel}>10s</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomBar}>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
            <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
          </View>
          <View style={styles.sliderWrap}>
            <View style={styles.bufferTrack}>
              <View style={[styles.bufferFill, { width: `${bufferedPercent}%` }]} />
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={maxSlider}
              value={positionMillis}
              onSlidingStart={startSeeking}
              onValueChange={setPositionMillis}
              onSlidingComplete={finishSeeking}
              minimumTrackTintColor={colors.accentMint}
              maximumTrackTintColor="rgba(255,255,255,0.24)"
              thumbTintColor={colors.accentMint}
            />
          </View>
          <View style={styles.bottomActions}>
            <View style={styles.progressPill}><Text style={styles.progressPillText}>{Math.round(percentRef.current)}%</Text></View>
            <TouchableOpacity onPress={toggleFullscreen} style={styles.roundIconButton}>
              {isFullscreen ? <Minimize color={colors.primaryText} size={20} /> : <Maximize color={colors.primaryText} size={20} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const loadingOverlay = isLoading && !effectiveError ? (
    <View style={styles.loadingOverlay} pointerEvents="none">
      <View style={styles.loadingOrb}><ActivityIndicator color={colors.accentYellow} size="small" /></View>
      <Text style={styles.loadingText}>Preparing your lesson…</Text>
    </View>
  ) : null;

  const errorOverlay = effectiveError ? (
    <View style={styles.errorOverlay}>
      <View style={styles.errorIconWrap}><AlertTriangle color={colors.accentYellow} size={28} /></View>
      <Text style={styles.errorTitle}>Video unavailable</Text>
      <Text style={styles.errorText} numberOfLines={3}>{effectiveError}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={retry} activeOpacity={0.85}>
        <RefreshCw color={colors.primaryBg} size={16} />
        <Text style={styles.retryText}>Retry playback</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  const noticePill = notice ? (
    <View style={styles.noticePill} pointerEvents="none"><Text style={styles.noticeText}>{notice}</Text></View>
  ) : null;

  const renderSurface = (fullscreen: boolean) => (
    <View style={[styles.videoShell, fullscreen && styles.fullscreenShell]}>
      <Pressable style={styles.videoWrapper} onPress={() => revealControls(!isPlayingRef.current)}>
        <VideoView
          ref={viewRef}
          style={styles.video}
          player={player}
          nativeControls={false}
          contentFit="contain"
          allowsPictureInPicture
          startsPictureInPictureAutomatically={false}
          fullscreenOptions={{ enable: false }}
          surfaceType="surfaceView"
          onFirstFrameRender={() => setHasFirstFrame(true)}
          onPictureInPictureStart={() => { pipRef.current = true; showNotice('Picture-in-picture started'); }}
          onPictureInPictureStop={() => { pipRef.current = false; showNotice('Picture-in-picture closed'); }}
        />
        {loadingOverlay}
        {renderControls()}
        {errorOverlay}
        {noticePill}
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      {!isFullscreen && renderSurface(false)}
      {isFullscreen && <View style={styles.fullscreenPlaceholder} />}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        presentationStyle="fullScreen"
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={exitFullscreen}
      >
        {renderSurface(true)}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    overflow: 'hidden',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  fullscreenPlaceholder: { flex: 1, backgroundColor: '#000' },
  videoShell: { flex: 1, width: '100%', backgroundColor: '#000' },
  fullscreenShell: { width: '100%', height: '100%' },
  videoWrapper: { flex: 1, position: 'relative', backgroundColor: '#000' },
  video: { ...StyleSheet.absoluteFill },
  controlsOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  topBar: {
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing.xs,
    position: 'relative',
    zIndex: 5,
  },
  titleBlock: {
    flex: 1,
    marginRight: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  eyebrow: {
    color: colors.accentYellow,
    fontSize: 10,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: { color: colors.primaryText, fontSize: typography.sizes.sm, fontFamily: typography.fontFamily.semibold },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  iconButton: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  roundIconButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  rateText: { color: colors.primaryText, fontSize: typography.sizes.xs, fontFamily: typography.fontFamily.semibold },
  speedMenu: {
    position: 'absolute',
    top: 48,
    right: 46,
    padding: spacing.xs,
    borderRadius: 18,
    backgroundColor: 'rgba(10,10,10,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    gap: spacing.xxs,
  },
  speedOption: { minWidth: 66, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: 14 },
  speedOptionActive: { backgroundColor: 'rgba(212,175,55,0.18)' },
  speedOptionText: { color: colors.secondaryText, textAlign: 'center', fontSize: typography.sizes.xs, fontFamily: typography.fontFamily.medium },
  speedOptionTextActive: { color: colors.accentYellow, fontFamily: typography.fontFamily.bold },
  centerControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xxl },
  sideControlButton: {
    width: 58,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  seekLabel: { color: colors.secondaryText, fontSize: 10, fontFamily: typography.fontFamily.semibold, marginTop: -2 },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(243,229,171,0.55)',
    shadowColor: colors.accentMint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 8,
  },
  bottomBar: {
    borderRadius: 24,
    padding: spacing.sm,
    backgroundColor: 'rgba(10,10,10,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxs },
  timeText: { color: colors.primaryText, fontSize: typography.sizes.xs, fontFamily: typography.fontFamily.medium },
  sliderWrap: { height: 34, justifyContent: 'center' },
  bufferTrack: {
    position: 'absolute',
    left: 15,
    right: 15,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  bufferFill: { height: '100%', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)' },
  slider: { width: '100%', height: 34 },
  bottomActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xxs },
  progressPill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(212,175,55,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.28)',
  },
  progressPillText: { color: colors.accentYellow, fontSize: typography.sizes.xs, fontFamily: typography.fontFamily.bold },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    gap: spacing.sm,
  },
  loadingOrb: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.28)',
  },
  loadingText: { color: colors.primaryText, fontSize: typography.sizes.xs, fontFamily: typography.fontFamily.medium },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  errorIconWrap: {
    width: 54,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 27,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.28)',
    marginBottom: spacing.sm,
  },
  errorTitle: { color: colors.primaryText, fontSize: typography.sizes.md, fontFamily: typography.fontFamily.bold, marginBottom: spacing.xs },
  errorText: {
    color: colors.secondaryText,
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.accentYellow,
  },
  retryText: { color: colors.primaryBg, fontSize: typography.sizes.xs, fontFamily: typography.fontFamily.bold },
  noticePill: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 76,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: 'rgba(10,10,10,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.32)',
  },
  noticeText: { color: colors.accentYellow, fontSize: typography.sizes.xs, fontFamily: typography.fontFamily.semibold },
});
 