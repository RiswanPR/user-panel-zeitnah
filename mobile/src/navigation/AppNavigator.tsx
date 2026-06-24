import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CoursesScreen } from '../screens/courses/CoursesScreen';
import { CourseDetailsScreen } from '../screens/courses/CourseDetailsScreen';
import { ChaptersScreen } from '../screens/learning/ChaptersScreen';
import { ClassesScreen } from '../screens/learning/ClassesScreen';
import { ClassPlayerScreen } from '../screens/learning/ClassPlayerScreen';
import { PdfViewerScreen } from '../screens/learning/PdfViewerScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { FloatingTabBar } from '../components/navigation/FloatingTabBar';

import { SessionsScreen } from '../screens/profile/SessionsScreen';
import { AuditLogScreen } from '../screens/profile/AuditLogScreen';

export type AppTabParamList = {
  Courses: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  CourseDetails: { id: string; title: string };
  Chapters: { courseId: string; title: string };
  Classes: { courseId: string; chapterCode: string; title: string };
  ClassPlayer: { classId: string; title: string };
  PdfViewer: { url: string; title: string };
  Sessions: undefined;
  AuditLog: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Courses" component={CoursesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} />
      <Stack.Screen 
        name="Chapters" 
        component={ChaptersScreen} 
        options={{ headerShown: false, presentation: 'card' }} 
      />
      <Stack.Screen 
        name="Classes" 
        component={ClassesScreen} 
        options={{ headerShown: false, presentation: 'card' }} 
      />
      <Stack.Screen 
        name="ClassPlayer" 
        component={ClassPlayerScreen} 
        options={{ headerShown: false, presentation: 'fullScreenModal' }} 
      />
      <Stack.Screen 
        name="PdfViewer" 
        component={PdfViewerScreen} 
        options={{ headerShown: false, presentation: 'modal' }} 
      />
      <Stack.Screen 
        name="Sessions" 
        component={SessionsScreen} 
        options={{ headerShown: false, presentation: 'card' }} 
      />
      <Stack.Screen 
        name="AuditLog" 
        component={AuditLogScreen} 
        options={{ headerShown: false, presentation: 'card' }} 
      />
    </Stack.Navigator>
  );
};
