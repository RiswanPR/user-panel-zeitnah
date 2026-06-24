import React, { useState } from 'react';
import { View, StyleSheet, Text, Image, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, spacing, typography, shadows } from '../../theme';
import { SkeletonLoader } from '../loaders/SkeletonLoader';

export interface CourseCardProps {
  id: string;
  title: string;
  instructor: string;
  coverImage: string;
  progress?: number;
  category?: string;
  onPress: (id: string) => void;
  style?: ViewStyle;
  isLandscape?: boolean;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  id,
  title,
  instructor,
  coverImage,
  progress,
  category,
  onPress,
  style,
  isLandscape = true,
}) => {
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(id)}
      style={[
        styles.card,
        isLandscape ? styles.cardLandscape : styles.cardPortrait,
        style
      ]}
    >
      <View style={styles.imageContainer}>
        {imageLoading && <SkeletonLoader style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}} />}
        <Image
          source={{ uri: coverImage }}
          style={styles.image}
          onLoadEnd={() => setImageLoading(false)}
          resizeMode="cover"
        />
        {category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.instructor}>{instructor}</Text>
        
        {progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBgSolid,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.soft,
  },
  cardLandscape: {
    width: 280,
    marginRight: spacing.lg,
  },
  cardPortrait: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  imageContainer: {
    height: 140,
    width: '100%',
    position: 'relative',
    backgroundColor: colors.primaryBg,
  },
  image: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: colors.primaryText,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.medium,
    fontWeight: typography.weights.medium,
  },
  content: {
    padding: spacing.md,
  },
  title: {
    color: colors.primaryText,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  instructor: {
    color: colors.secondaryText,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    marginBottom: spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accentYellow,
    borderRadius: 3,
  },
  progressText: {
    color: colors.accentYellow,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.weights.semibold,
  },
});
