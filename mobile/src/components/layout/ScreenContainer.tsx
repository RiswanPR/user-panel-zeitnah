import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: Array<'top' | 'right' | 'bottom' | 'left'>;
  withGradient?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  edges = ['top', 'left', 'right', 'bottom'],
  withGradient = true,
}) => {
  const insets = useSafeAreaInsets();

  const containerContent = (
    <SafeAreaView edges={edges} style={[styles.safeArea, style]}>
      {children}
    </SafeAreaView>
  );

  if (withGradient) {
    return (
      <LinearGradient
        colors={[colors.primaryBg, colors.secondaryBg]}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {containerContent}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryBg }]}>
      {containerContent}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});
