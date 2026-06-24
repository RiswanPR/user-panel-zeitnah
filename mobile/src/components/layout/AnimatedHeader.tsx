import React, { useRef } from 'react';
import { StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface AnimatedHeaderProps {
  title: string;
  scrollY?: Animated.Value;
  style?: ViewStyle;
}

export const AnimatedHeader: React.FC<AnimatedHeaderProps> = ({ title, scrollY, style }) => {
  const defaultScrollY = useRef(new Animated.Value(0)).current;
  const activeScrollY = scrollY || defaultScrollY;

  const headerOpacity = activeScrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.container, { opacity: headerOpacity }, style]}>
      <Animated.Text style={styles.title}>{title}</Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.glassOverlay,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 'auto',
    zIndex: 10,
  },
  title: {
    color: colors.primaryText,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.weights.semibold,
  },
});
