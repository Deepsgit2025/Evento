import { Stack } from 'expo-router';

export default function GuestsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen 
        name="add" 
        options={{ 
          presentation: 'modal' 
        }} 
      />
      <Stack.Screen 
        name="[id]/edit" 
        options={{ 
          presentation: 'modal' 
        }} 
      />
      <Stack.Screen 
        name="[id]/assign-room" 
        options={{ 
          presentation: 'modal' 
        }} 
      />
      <Stack.Screen 
        name="groups-manager" 
        options={{ 
          headerShown: true, 
          title: 'Family & Groups',
          presentation: 'modal'
        }} 
      />
    </Stack>
  );
}
