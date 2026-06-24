import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, PlayCircle, Lock } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Accordion } from '../../components/layout/Accordion';
import { colors, spacing, typography } from '../../theme';
import { apiClient } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';

export const ChaptersScreen = ({ route, navigation }: any) => {
  const { courseId, title } = route.params;
  const [chapters, setChapters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChapters();
  }, [courseId]);

  const fetchChapters = async () => {
    try {
      const response = await apiClient.get(ENDPOINTS.STUDENT.CHAPTERS(courseId));
      setChapters(response.data);
    } catch (error) {
      // Fallback
      setChapters([
        {
          id: 'c1',
          title: 'Chapter 1: Glassmorphism',
          description: 'Build frosted glass UI elements.',
          progress: 100,
          isLocked: false,
          classes: [
            { id: 'cl1', title: 'Introduction to Glassmorphism', duration: '15m', isCompleted: true },
            { id: 'cl2', title: 'Building the GlassCard', duration: '30m', isCompleted: true },
          ]
        },
        {
          id: 'c2',
          title: 'Chapter 2: Micro-animations',
          description: 'Using react-native-reanimated for smooth interactions.',
          progress: 50,
          isLocked: false,
          classes: [
            { id: 'cl3', title: 'Spring Animations', duration: '25m', isCompleted: true },
            { id: 'cl4', title: 'Layout Transitions', duration: '45m', isCompleted: false },
          ]
        },
        {
          id: 'c3',
          title: 'Chapter 3: Advanced Layouts',
          description: 'Complex responsive layouts for mobile.',
          progress: 0,
          isLocked: true,
          classes: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accentYellow} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.primaryText} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {chapters.map((chap, index) => (
          <View key={chap.id} style={styles.chapterWrapper}>
            {chap.isLocked ? (
              <View style={[styles.lockedCard]}>
                <View style={styles.lockedHeader}>
                  <Text style={styles.lockedTitle}>{chap.title}</Text>
                  <Lock color={colors.secondaryText} size={20} />
                </View>
                <Text style={styles.lockedDesc}>{chap.description}</Text>
              </View>
            ) : (
              <Accordion title={chap.title} initiallyExpanded={index === 0}>
                <Text style={styles.description}>{chap.description}</Text>
                
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${chap.progress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{chap.progress}%</Text>
                </View>

                <View style={styles.classesList}>
                  {chap.classes?.map((cls: any) => (
                    <TouchableOpacity 
                      key={cls.id}
                      style={styles.classRow}
                      onPress={() => navigation.navigate('ClassPlayer', { classId: cls.id, title: cls.title })}
                    >
                      <View style={styles.classLeft}>
                        <PlayCircle 
                          color={cls.isCompleted ? colors.success : colors.accentMint} 
                          size={20} 
                        />
                        <Text style={[styles.classTitle, cls.isCompleted && styles.completedText]}>
                          {cls.title}
                        </Text>
                      </View>
                      <Text style={styles.classDuration}>{cls.duration}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <TouchableOpacity 
                  style={styles.viewAllBtn}
                  onPress={() => navigation.navigate('Classes', { courseId, chapterCode: chap.uniqueCode || chap.id, title: chap.title })}
                >
                  <Text style={styles.viewAllText}>View All Classes</Text>
                </TouchableOpacity>
              </Accordion>
            )}
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.primaryText,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 100,
  },
  chapterWrapper: {
    marginBottom: spacing.md,
  },
  lockedCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  lockedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lockedTitle: {
    color: colors.secondaryText,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.semibold,
  },
  lockedDesc: {
    color: colors.secondaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
  },
  description: {
    color: colors.secondaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    marginBottom: spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accentYellow,
  },
  progressText: {
    color: colors.accentYellow,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold,
  },
  classesList: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  classRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  classLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  classTitle: {
    color: colors.primaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    flex: 1,
  },
  completedText: {
    color: colors.secondaryText,
  },
  classDuration: {
    color: colors.secondaryText,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
  },
  viewAllBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 8,
  },
  viewAllText: {
    color: colors.accentYellow,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semibold,
  }
});
