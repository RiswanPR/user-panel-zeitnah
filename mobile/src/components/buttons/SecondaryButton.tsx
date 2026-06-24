import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  isLoading,
  disabled,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      style={[styles.container, style, disabled && styles.disabledContainer]}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.accentYellow} />
      ) : (
        <Text style={[styles.text, textStyle, disabled && styles.disabledText]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  disabledContainer: {
    borderColor: 'rgba(255, 255, 255, 0.04)',
    backgroundColor: 'transparent',
  },
  text: {
    color: colors.primaryText,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.weights.semibold,
  },
  disabledText: {
    color: colors.disabledText,
  },
});
