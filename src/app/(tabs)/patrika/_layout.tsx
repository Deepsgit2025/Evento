import { Stack } from 'expo-router';

export default function PatrikaLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'My Patrikas',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="gallery" 
        options={{ 
          title: 'Template Gallery',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="customize" 
        options={{ 
          title: 'Customize',
          headerShown: true,
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: 'Preview',
          headerShown: true,
          presentation: 'modal'
        }} 
      />
    </Stack>
  );
}
