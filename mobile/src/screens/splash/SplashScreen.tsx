import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../theme';

export const SplashScreen = () => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <LinearGradient
      colors={[colors.primaryBg, colors.secondaryBg]}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Placeholder Logo - In a real app we'd use an Image */}
        <View style={styles.logoMark}>
          <Animated.Text style={styles.logoLetter}>Z</Animated.Text>
        </View>
        <Animated.Text style={styles.logoText}>ZEITNAH</Animated.Text>
        <Animated.Text style={styles.logoSubtitle}>ACADEMY</Animated.Text>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accentMint,
    marginBottom: spacing.md,
  },
  logoLetter: {
    color: colors.accentYellow,
    fontSize: typography.sizes.display,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.weights.bold,
  },
  logoText: {
    color: colors.primaryText,
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.weights.bold,
    letterSpacing: 4,
  },
  logoSubtitle: {
    color: colors.accentYellow,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    fontWeight: typography.weights.medium,
    letterSpacing: 6,
    marginTop: spacing.xs,
  },
});
