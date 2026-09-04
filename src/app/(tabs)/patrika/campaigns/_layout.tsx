import { Stack } from 'expo-router';

export default function CampaignsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" options={{ headerShown: true, title: 'New Campaign' }} />
      <Stack.Screen name="[id]" options={{ headerShown: true, title: 'Campaign Dashboard' }} />
    </Stack>
  );
}
