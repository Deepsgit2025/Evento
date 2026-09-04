import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { typography } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function VendorsLayout() {
  const router = useRouter();
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
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Vendors',
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="add" 
        options={{ 
          title: 'Add Vendor',
          presentation: 'modal',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          )
        }} 
      />
      <Stack.Screen 
        name="[id]/index" 
        options={{ 
          title: 'Vendor Details',
        }} 
      />
      <Stack.Screen 
        name="[id]/edit" 
        options={{ 
          title: 'Edit Vendor',
          presentation: 'modal',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          )
        }} 
      />
    </Stack>
  );
}
