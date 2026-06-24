import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, shadows } from '../../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  isLoading,
  disabled,
  style,
  textStyle,
  icon,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      style={[styles.container, style, disabled && styles.disabledContainer]}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.primaryBg} />
      ) : (
        <>
          {icon && icon}
          <Text style={[styles.text, textStyle, disabled && styles.disabledText]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.accentYellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
    ...shadows.glowYellow, // Needs updating too, maybe remove glow?
  },
  disabledContainer: {
    ...shadows.soft,
  },
  text: {
    color: colors.primaryBg,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.sm,
  },
  disabledText: {
    color: colors.secondaryText,
  },
});
