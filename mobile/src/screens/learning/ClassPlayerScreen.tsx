import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';
import {
  PremiumVideoPlayer,
  VideoProgressSnapshot,
} from '../../components/player/PremiumVideoPlayer';
import { SkeletonVideoLoader } from '../../components/loaders/SkeletonVideoLoader';
import { ResourceList, Resource } from '../../components/resources/ResourceList';
import { colors, spacing, typography } from '../../theme';
import { apiClient } from '../../api/axios';
import { API_CONFIG, ENDPOINTS } from '../../api/endpoints';
import { useProgressStore } from '../../store/progressStore';
import { tokens } from '../../utils/secureStore';

type VideoContentType = 'auto' | 'progressive' | 'hls' | 'dash' | 'smoothStreaming';

type PlayerClassData = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  videoHeaders?: Record<string, string>;
  videoContentType?: VideoContentType;
  instructor: string;
  duration: string;
  initialPositionMillis: number;
  initialDurationMillis: number;
  initialWatchedDurationMillis: number;
  initialCoveredDurationMillis: number;
  initialCompletionPercentage: number;
};

const secondsToMillis = (seconds: unknown) => {
  const numeric = Number(seconds);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric * 1000) : 0;
};

const normalizeLocalPlaybackUrl = (url: string | undefined, classId: string) => {
  if (!url) return `${API_CONFIG.BASE_URL}${ENDPOINTS.STUDENT.VIDEO_PLAYBACK(classId)}`;
  if (url.startsWith('/')) return `${API_CONFIG.BASE_URL}${url}`;

  const localApiMatch = url.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api(\/courses\/video\/.*)$/i);
  if (localApiMatch?.[3]) return `${API_CONFIG.BASE_URL}${localApiMatch[3]}`;

  const localNoApiMatch = url.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/courses\/video\/.*)$/i);
  if (localNoApiMatch?.[3]) return `${API_CONFIG.BASE_URL}${localNoApiMatch[3]}`;

  return url;
};

const resolveContentType = (url: string): VideoContentType | undefined => {
  const cleanUrl = url.split('?')[0]?.split('#')[0]?.toLowerCase() || '';
  if (cleanUrl.endsWith('.m3u8')) return 'hls';
  if (cleanUrl.endsWith('.mpd')) return 'dash';
  if (cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.m4v')) {
    return 'progressive';
  }
  return undefined;
};

const needsApiAuthHeader = (url: string) => url.includes('/courses/video/') && !url.includes('X-Amz-Signature');

export const ClassPlayerScreen = ({ route, navigation }: any) => {
  const { classId } = route.params;
  const [classData, setClassData] = useState<PlayerClassData | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'resources'>('overview');
  const lastProgressSaveRef = useRef(0);

  const {
    saveProgress,
    hydrateClassProgress,
    classWatchPositions,
    completedClasses,
  } = useProgressStore();

  useEffect(() => {
    void fetchClassData();
  }, [classId]);

  const buildClassData = useCallback(
    async (classPayload: any, playbackPayload: any): Promise<PlayerClassData> => {
      const classInfo = classPayload?.class || classPayload || {};
      const courseInfo = classPayload?.course || {};
      const progress =
        classPayload?.progress?.classProgress ||
        classPayload?.classProgress ||
        classInfo?.classProgress ||
        null;
      const localSavedPosition = classWatchPositions[classId];
      const rawPlaybackUrl = playbackPayload?.playbackUrl || classInfo.videoUrl || classPayload?.videoUrl;
      const playbackUrl = normalizeLocalPlaybackUrl(rawPlaybackUrl, classId);
      const accessToken = await tokens.getAccessToken();
      const videoHeaders = needsApiAuthHeader(playbackUrl) && accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined;
      const progressSnapshot = {
        positionMillis: secondsToMillis(progress?.lastPositionSeconds) || localSavedPosition?.positionMillis || 0,
        durationMillis: secondsToMillis(progress?.durationSeconds) || localSavedPosition?.durationMillis || 0,
        watchedDurationMillis: secondsToMillis(progress?.watchedSeconds) || localSavedPosition?.watchedDurationMillis || 0,
        coveredDurationMillis: secondsToMillis(progress?.coveredSeconds) || localSavedPosition?.coveredDurationMillis || 0,
        completionPercentage: Number(progress?.progressPercent ?? localSavedPosition?.completionPercentage ?? 0),
        isComplete: Boolean(progress?.completed),
      };

      hydrateClassProgress(classId, progressSnapshot);
      lastProgressSaveRef.current = progressSnapshot.completionPercentage;

      return {
        id: classInfo._id || classInfo.id || classId,
        title: classInfo.title || 'Course class',
        description: classInfo.description || '',
        videoUrl: playbackUrl,
        videoHeaders,
        videoContentType: resolveContentType(playbackUrl),
        instructor: courseInfo.name || classInfo.instructor || 'Zeitnah Academy',
        duration: classInfo.duration || '',
        initialPositionMillis: progressSnapshot.positionMillis,
        initialDurationMillis: progressSnapshot.durationMillis,
        initialWatchedDurationMillis: progressSnapshot.watchedDurationMillis,
        initialCoveredDurationMillis: progressSnapshot.coveredDurationMillis,
        initialCompletionPercentage: progressSnapshot.completionPercentage,
      };
    },
    [classId, classWatchPositions, hydrateClassProgress]
  );

  const fetchClassData = async () => {
    setIsLoading(true);

    try {
      const [classRes, playbackRes, resourcesRes] = await Promise.all([
        apiClient.get(ENDPOINTS.STUDENT.CLASS(classId)),
        apiClient.get(ENDPOINTS.STUDENT.VIDEO_PLAYBACK(classId)).catch(() => ({ data: null })),
        apiClient.get(ENDPOINTS.STUDENT.RESOURCES(classId)).catch(() => ({ data: [] })),
      ]);

      const normalizedClass = await buildClassData(classRes.data, playbackRes.data);
      const resourceData = Array.isArray(resourcesRes.data)
        ? resourcesRes.data
        : resourcesRes.data?.resources || [];

      setClassData(normalizedClass);
      setResources(resourceData);
    } catch (error) {
      const fallbackUrl = `${API_CONFIG.BASE_URL}${ENDPOINTS.STUDENT.VIDEO_PLAYLIST(classId)}`;
      const accessToken = await tokens.getAccessToken();

      setClassData({
        id: classId,
        title: 'Building the GlassCard',
        description:
          'In this class, we will build a premium frosted glass card component from scratch using react-native-reanimated and expo-blur.',
        videoUrl: fallbackUrl,
        videoHeaders: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        videoContentType: 'hls',
        instructor: 'Zeitnah Academy',
        duration: '15:20',
        initialPositionMillis: 0,
        initialDurationMillis: 0,
        initialWatchedDurationMillis: 0,
        initialCoveredDurationMillis: 0,
        initialCompletionPercentage: 0,
      });
      setResources([
        { id: 'r1', title: 'GlassCard Reference PDF', type: 'pdf', url: 'https://example.com/ref.pdf', size: '2.4 MB' },
        { id: 'r2', title: 'Figma Design File', type: 'link', url: 'https://figma.com' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !classData) {
    return <SkeletonVideoLoader />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{classData.title}</Text>
      </View>

      <PremiumVideoPlayer
        videoUrl={classData.videoUrl}
        videoHeaders={classData.videoHeaders}
        contentType={classData.videoContentType}
        title={classData.title}
        initialPositionMillis={classData.initialPositionMillis}
        initialDurationMillis={classData.initialDurationMillis}
        initialWatchedDurationMillis={classData.initialWatchedDurationMillis}
        initialCoveredDurationMillis={classData.initialCoveredDurationMillis}
        initialCompletionPercentage={classData.initialCompletionPercentage}
        onPositionSave={(snapshot) => {
          saveProgress(classId, snapshot.completionPercentage, {
            ...snapshot,
            isComplete: snapshot.completionPercentage >= 90,
          });
          lastProgressSaveRef.current = snapshot.completionPercentage;
        }}
        onEnd={(snapshot) => {
          saveProgress(classId, 100, {
            ...snapshot,
            completionPercentage: 100,
            isComplete: true,
          });
        }}
      />

      <View style={styles.tabContainer}>
         <TouchableOpacity onPress={() => setActiveTab('overview')} style={[styles.tab, activeTab === 'overview' && styles.activeTab]}>
           <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={() => setActiveTab('resources')} style={[styles.tab, activeTab === 'resources' && styles.activeTab]}>
           <Text style={[styles.tabText, activeTab === 'resources' && styles.activeTabText]}>Resources</Text>
         </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentContainer}>
        {activeTab === 'overview' ? (
          <View style={styles.overviewSection}>
             <Text style={styles.title}>{classData.title}</Text>
             <Text style={styles.instructor}>{classData.instructor}</Text>
             <Text style={styles.description}>{classData.description}</Text>
          </View>
        ) : (
          <ResourceList resources={resources} onPressResource={(r) => console.log('Open', r.url)} />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.primaryBg 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: spacing.md, 
    paddingTop: spacing.xxl || 50 
  },
  backButton: { 
    marginRight: spacing.sm 
  },
  headerTitle: { 
    flex: 1, 
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.lg,
    color: colors.primaryText 
  },
  tabContainer: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border 
  },
  tab: { 
    flex: 1, 
    paddingVertical: spacing.md, 
    alignItems: 'center' 
  },
  activeTab: { 
    borderBottomWidth: 2, 
    borderBottomColor: colors.accentMint 
  },
  tabText: { 
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.sizes.md,
    color: colors.secondaryText 
  },
  activeTabText: { 
    color: colors.accentYellow, 
    fontFamily: typography.fontFamily.bold 
  },
  contentContainer: { 
    flex: 1 
  },
  overviewSection: { 
    padding: spacing.lg 
  },
  title: { 
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.xl,
    color: colors.primaryText, 
    marginBottom: spacing.sm 
  },
  instructor: { 
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.sizes.md,
    color: colors.accentYellow, 
    marginBottom: spacing.md 
  },
  description: { 
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.sizes.sm,
    color: colors.secondaryText, 
    lineHeight: 24 
  },
});

