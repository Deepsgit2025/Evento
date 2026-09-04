import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { typography } from '../../../theme';

export default function EventsLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTitleStyle: {
          fontFamily: typography.fontFamily,
          fontSize: typography.sizes.lg,
          fontWeight: '600',
          color: theme.colors.text,
        },
        headerShadowVisible: false,
        headerTintColor: theme.colors.primary,
        contentStyle: {
          backgroundColor: theme.colors.background,
        }
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false,
          title: 'Events' 
        }} 
      />
      <Stack.Screen 
        name="add" 
        options={{ 
          presentation: 'modal',
          title: 'Add Event'
        }} 
      />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: 'Event Details'
        }} 
      />
      <Stack.Screen 
        name="[id]/manage-guests" 
        options={{ 
          presentation: 'modal',
          title: 'Manage Guests'
        }} 
      />
    </Stack>
  );
}
