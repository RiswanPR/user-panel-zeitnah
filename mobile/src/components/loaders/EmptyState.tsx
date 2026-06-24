import React from 'react';
import { View, StyleSheet, Text, ViewStyle } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Found',
  message = "There's nothing here at the moment. Please check back later.",
  icon,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        {icon || <Inbox color={colors.accentYellow} size={48} />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 175, 55, 0.1)', // Gold with low opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.primaryText,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    color: colors.secondaryText,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
});
