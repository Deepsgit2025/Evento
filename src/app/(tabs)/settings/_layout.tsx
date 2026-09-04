import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="whatsapp" options={{ headerShown: true, title: 'WhatsApp Settings' }} />
      <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
      <Stack.Screen name="backup" options={{ headerShown: true, title: 'Backup & Restore' }} />
    </Stack>
  );
}
