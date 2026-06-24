import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, PlayCircle, Clock, BookOpen, Layers } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Accordion } from '../../components/layout/Accordion';
import { SkeletonLoader } from '../../components/loaders/SkeletonLoader';
import { colors, spacing, typography, shadows } from '../../theme';
import { apiClient } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';

export const CourseDetailsScreen = ({ route, navigation }: any) => {
  const { id } = route.params;
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    fetchCourseDetails();
  }, [id]);

  const fetchCourseDetails = async () => {
    try {
      const response = await apiClient.get(ENDPOINTS.STUDENT.COURSE_DETAILS(id));
      setCourse(response.data);
    } catch (error) {
      console.log('Failed to fetch course details', error);
      // Fallback mock
      setCourse({
        id,
        title: 'Advanced React Native Architecture',
        instructor: 'John Doe',
        coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80',
        description: 'Master the art of building scalable, premium, and performant React Native applications using the latest architectural patterns.',
        progress: 45,
        duration: '12h 30m',
        modulesCount: 5,
        chapterCount: 20,
        classCount: 65,
        modules: [
          {
            id: 'm1',
            title: 'Module 1: Foundations of Luxury UI',
            chapters: [
              { title: 'Chapter 1: Glassmorphism', duration: '45m' },
              { title: 'Chapter 2: Micro-animations', duration: '1h 10m' },
            ]
          },
          {
            id: 'm2',
            title: 'Module 2: State Management Architecture',
            chapters: [
              { title: 'Chapter 1: Zustand Mastery', duration: '55m' },
              { title: 'Chapter 2: React Query Sync', duration: '1h 20m' },
            ]
          }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !course) {
    return (
      <ScreenContainer>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.accentYellow} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Cover Image Header */}
        <View style={styles.headerContainer}>
          {imageLoading && <SkeletonLoader style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}} />}
          <Image 
            source={{ uri: course.coverImage }} 
            style={styles.coverImage} 
            onLoadEnd={() => setImageLoading(false)}
          />
          <View style={styles.overlay} />
          
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft color={colors.primaryText} size={24} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{course.title}</Text>
          <Text style={styles.instructor}>By {course.instructor}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock color={colors.accentYellow} size={16} />
              <Text style={styles.metaText}>{course.duration}</Text>
            </View>
            <View style={styles.metaItem}>
              <Layers color={colors.accentYellow} size={16} />
              <Text style={styles.metaText}>{course.modulesCount} Modules</Text>
            </View>
            <View style={styles.metaItem}>
              <BookOpen color={colors.accentYellow} size={16} />
              <Text style={styles.metaText}>{course.classCount} Classes</Text>
            </View>
          </View>

          {course.progress !== undefined && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Your Progress</Text>
                <Text style={styles.progressPercent}>{course.progress}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${course.progress}%` }]} />
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>About Course</Text>
          <Text style={styles.description}>{course.description}</Text>

          <TouchableOpacity 
            style={styles.viewModulesBtn}
            onPress={() => navigation.navigate('Chapters', { courseId: course.id, title: course.title })}
          >
            <Text style={styles.viewModulesText}>View Course Chapters</Text>
          </TouchableOpacity>
          
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryBg,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  headerContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
    backgroundColor: colors.cardBgSolid,
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: spacing.xl,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20,20,20,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.soft,
  },
  content: {
    padding: spacing.xl,
    marginTop: -30,
    backgroundColor: colors.primaryBg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  title: {
    color: colors.primaryText,
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  instructor: {
    color: colors.secondaryText,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.medium,
    marginBottom: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: colors.secondaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  progressSection: {
    marginBottom: spacing.xl,
    backgroundColor: colors.cardBg,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  progressLabel: {
    color: colors.primaryText,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.semibold,
  },
  progressPercent: {
    color: colors.accentYellow,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.bold,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accentYellow,
    borderRadius: 3,
  },
  sectionTitle: {
    color: colors.primaryText,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  description: {
    color: colors.secondaryText,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 24,
  },
  viewModulesBtn: {
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.accentYellow,
    borderRadius: 16,
    alignItems: 'center',
    ...shadows.soft,
  },
  viewModulesText: {
    color: colors.primaryBg,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.bold,
  }
});
