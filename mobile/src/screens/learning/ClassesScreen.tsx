import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { ArrowLeft, PlayCircle, CheckCircle } from 'lucide-react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { colors, spacing, typography, shadows } from '../../theme';
import { apiClient } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';

export const ClassesScreen = ({ route, navigation }: any) => {
  const { courseId, chapterCode, title } = route.params;
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, [courseId, chapterCode]);

  const fetchClasses = async () => {
    try {
      const response = await apiClient.get(ENDPOINTS.STUDENT.CLASSES(courseId, chapterCode));
      setClasses(response.data);
    } catch (error) {
      // Fallback
      setClasses([
        { id: 'cl1', title: 'Introduction to Glassmorphism', duration: '15m', isCompleted: true, coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80' },
        { id: 'cl2', title: 'Building the GlassCard', duration: '30m', isCompleted: true, coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80' },
        { id: 'cl3', title: 'Adding Blur Effects', duration: '20m', isCompleted: false, coverImage: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80' },
        { id: 'cl4', title: 'Performance Optimization', duration: '40m', isCompleted: false, coverImage: 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&q=80' },
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
        {classes.map((cls) => (
          <TouchableOpacity 
            key={cls.id} 
            style={styles.classCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ClassPlayer', { classId: cls.id, title: cls.title })}
          >
            <View style={styles.imageContainer}>
              <Image source={{ uri: cls.coverImage }} style={styles.coverImage} />
              <View style={styles.playOverlay}>
                <PlayCircle color={colors.primaryBg} size={32} fill="rgba(255,255,255,0.8)" />
              </View>
            </View>
            
            <View style={styles.infoContainer}>
              <Text style={styles.title} numberOfLines={2}>{cls.title}</Text>
              
              <View style={styles.metaRow}>
                <Text style={styles.duration}>{cls.duration}</Text>
                {cls.isCompleted ? (
                  <View style={styles.statusBadge}>
                    <CheckCircle color={colors.success} size={12} />
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, styles.inProgressBadge]}>
                    <Text style={styles.inProgressText}>Not Started</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
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
  classCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBgSolid,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.soft,
  },
  imageContainer: {
    width: 120,
    height: 90,
    position: 'relative',
    backgroundColor: colors.borderLight,
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  title: {
    color: colors.primaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  duration: {
    color: colors.secondaryText,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)', // success transparent
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  completedText: {
    color: colors.success,
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
  },
  inProgressBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  inProgressText: {
    color: colors.secondaryText,
    fontSize: 10,
    fontFamily: typography.fontFamily.medium,
  }
});
