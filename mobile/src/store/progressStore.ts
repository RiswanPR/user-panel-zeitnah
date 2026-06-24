import { create } from 'zustand';
import { apiClient } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

export interface WatchPositionSnapshot {
  positionMillis?: number;
  durationMillis?: number;
  watchedDurationMillis?: number;
  coveredDurationMillis?: number;
  completionPercentage?: number;
  isComplete?: boolean;
}

export interface StoredWatchPosition {
  positionMillis: number;
  durationMillis: number;
  watchedDurationMillis: number;
  coveredDurationMillis: number;
  completionPercentage: number;
  updatedAt: string;
}

interface ProgressState {
  classProgress: Record<string, number>; // classId -> best progress percentage
  classWatchPositions: Record<string, StoredWatchPosition>;
  completedClasses: Set<string>;
  hydrateClassProgress: (classId: string, watchPosition: WatchPositionSnapshot) => void;
  saveProgress: (
    classId: string,
    percentage: number,
    watchPosition?: WatchPositionSnapshot
  ) => Promise<void>;
  markClassCompleted: (classId: string) => Promise<void>;
  fetchProgress: (courseId: string) => Promise<void>;
}

const clampPercentage = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
};

const millisToWholeSeconds = (value = 0) => Math.max(0, Math.round(value / 1000));

const buildStoredPosition = (
  previous: StoredWatchPosition | undefined,
  percentage: number,
  watchPosition?: WatchPositionSnapshot
): StoredWatchPosition => {
  const durationMillis = Math.max(previous?.durationMillis || 0, watchPosition?.durationMillis || 0);
  const coveredDurationMillis = Math.max(
    previous?.coveredDurationMillis || 0,
    watchPosition?.coveredDurationMillis || 0,
    watchPosition?.positionMillis || 0
  );
  const completionPercentage = clampPercentage(
    Math.max(
      previous?.completionPercentage || 0,
      percentage,
      watchPosition?.completionPercentage || 0,
      watchPosition?.isComplete ? 100 : 0
    )
  );

  return {
    positionMillis: Math.max(0, watchPosition?.positionMillis ?? previous?.positionMillis ?? 0),
    durationMillis,
    watchedDurationMillis: Math.max(
      previous?.watchedDurationMillis || 0,
      watchPosition?.watchedDurationMillis || 0
    ),
    coveredDurationMillis,
    completionPercentage,
    updatedAt: new Date().toISOString(),
  };
};

export const useProgressStore = create<ProgressState>((set, get) => ({
  classProgress: {},
  classWatchPositions: {},
  completedClasses: new Set(),

  hydrateClassProgress: (classId, watchPosition) => {
    set((state) => {
      const stored = buildStoredPosition(
        state.classWatchPositions[classId],
        watchPosition.completionPercentage || state.classProgress[classId] || 0,
        watchPosition
      );

      return {
        classProgress: {
          ...state.classProgress,
          [classId]: stored.completionPercentage,
        },
        classWatchPositions: {
          ...state.classWatchPositions,
          [classId]: stored,
        },
      };
    });
  },

  saveProgress: async (classId, percentage, watchPosition) => {
    const normalizedPercentage = clampPercentage(
      watchPosition?.completionPercentage ?? percentage
    );
    let storedForRequest: StoredWatchPosition | undefined;

    set((state) => {
      const stored = buildStoredPosition(
        state.classWatchPositions[classId],
        normalizedPercentage,
        watchPosition
      );
      storedForRequest = stored;

      return {
        classProgress: {
          ...state.classProgress,
          [classId]: stored.completionPercentage,
        },
        classWatchPositions: {
          ...state.classWatchPositions,
          [classId]: stored,
        },
      };
    });

    const stored = storedForRequest;
    if (!stored) return;

    const durationSeconds = millisToWholeSeconds(stored.durationMillis);
    const currentTimeSeconds = millisToWholeSeconds(stored.positionMillis);
    const totalPlayedSeconds = millisToWholeSeconds(stored.watchedDurationMillis);
    const totalCoveredSeconds = millisToWholeSeconds(stored.coveredDurationMillis);
    const completed = stored.completionPercentage >= 90 || Boolean(watchPosition?.isComplete);

    try {
      await apiClient.post(ENDPOINTS.STUDENT.PROGRESS(classId), {
        currentTimeSeconds,
        durationSeconds,
        totalPlayedSeconds,
        totalCoveredSeconds,
        progressPercent: stored.completionPercentage,
        completed,
      });

      if (completed && !get().completedClasses.has(classId)) {
        await get().markClassCompleted(classId);
      }
    } catch (error) {
      console.log('Failed to sync progress', error);
    }
  },

  markClassCompleted: async (classId) => {
    set((state) => {
      const newCompleted = new Set(state.completedClasses);
      newCompleted.add(classId);
      return { completedClasses: newCompleted };
    });

    try {
      await apiClient.post(ENDPOINTS.STUDENT.PROGRESS(classId), {
        completed: true,
        progressPercent: 100,
      });
    } catch (error) {
      console.log('Failed to mark class completed', error);
    }
  },

  fetchProgress: async (_courseId: string) => {
    // Progress is hydrated from class/chapter payloads and saved through the class progress endpoint.
  },
}));
