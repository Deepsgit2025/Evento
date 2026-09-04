import { Stack } from 'expo-router';

export default function PatrikaSendLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: 'Select Recipients',
          headerShown: true,
          presentation: 'modal'
        }} 
      />
    </Stack>
  );
}
