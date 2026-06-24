import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BookOpen, User } from 'lucide-react-native';
import { colors, shadows, spacing } from '../../theme';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

export const FloatingTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          let IconComponent;
          if (route.name === 'Courses') IconComponent = BookOpen;
          else if (route.name === 'Profile') IconComponent = User;
          else IconComponent = BookOpen;

          return (
            <TabItem
              key={route.key}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              IconComponent={IconComponent}
              label={options.tabBarLabel !== undefined ? options.tabBarLabel as string : route.name}
            />
          );
        })}
      </View>
    </View>
  );
};

const TabItem = ({ isFocused, onPress, onLongPress, IconComponent, label }: any) => {
  const animatedDotStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isFocused ? 1 : 0) }],
      opacity: withSpring(isFocused ? 1 : 0),
    };
  });

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <IconComponent 
          color={isFocused ? colors.accentMint : colors.secondaryText} 
          size={24} 
        />
        <Animated.View style={[styles.dot, animatedDotStyle]} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.xl,
    right: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    borderRadius: 30,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.1)',
    ...shadows.glowYellow,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentYellow,
    marginTop: 4,
    position: 'absolute',
    bottom: -8,
  }
});
