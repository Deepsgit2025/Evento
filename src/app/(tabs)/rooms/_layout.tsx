import React from 'react';
import { Stack } from 'expo-router';

export default function RoomsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen 
        name="add-hotel" 
        options={{ 
          presentation: 'modal' 
        }} 
      />
      <Stack.Screen 
        name="add-room" 
        options={{ 
          presentation: 'modal' 
        }} 
      />
      <Stack.Screen 
        name="[id]/assign-guest" 
        options={{ 
          presentation: 'modal' 
        }} 
      />
    </Stack>
  );
}
