import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonLoader } from './SkeletonLoader';
import { colors, spacing } from '../../theme';

export const SkeletonVideoLoader = () => {
  return (
    <View style={styles.container}>
      <View style={styles.videoPlaceholder}>
        <SkeletonLoader style={styles.fullScreen} />
      </View>
      <View style={styles.content}>
        <SkeletonLoader style={styles.title} />
        <SkeletonLoader style={styles.subtitle} />
        <View style={styles.row}>
          <SkeletonLoader style={styles.pill} />
          <SkeletonLoader style={styles.pill} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryBg,
  },
  videoPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.cardBgSolid,
  },
  fullScreen: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: spacing.xl,
  },
  title: {
    width: '80%',
    height: 28,
    marginBottom: spacing.sm,
  },
  subtitle: {
    width: '40%',
    height: 16,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pill: {
    width: 80,
    height: 32,
    borderRadius: 16,
  }
});
