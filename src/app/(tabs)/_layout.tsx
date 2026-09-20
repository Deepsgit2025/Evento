import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { HeaderNotificationIcon } from '../../components/ui/HeaderNotificationIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppSidebar } from '../../components/navigation/AppSidebar';

// Below this width we keep the existing mobile bottom-tab navigation
// untouched; at/above it we switch to the persistent desktop/tablet sidebar
// and hide the tab bar (it would just duplicate the sidebar's Main section).
const SIDEBAR_BREAKPOINT = 900;

function TabIcon({ name, color, focused, theme }: { name: keyof typeof Ionicons.glyphMap; color: string; focused: boolean; theme: any }) {
  return (
    <View style={focused ? {
      backgroundColor: theme.colors.primary + '15',
      borderRadius: theme.radii.full,
      paddingHorizontal: 14,
      paddingVertical: 4,
    } : undefined}>
      <Ionicons name={name} size={24} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const { width } = useWindowDimensions();
  const showSidebar = width >= SIDEBAR_BREAKPOINT;

  const tabs = (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.sizes.lg,
          fontWeight: '700',
          color: theme.colors.text,
        },
        headerShadowVisible: false,
        tabBarStyle: showSidebar ? { display: 'none' } : {
          backgroundColor: theme.colors.surface + (Platform.OS === 'ios' ? 'E6' : 'FF'), // 90% opaque on iOS for subtle blur feel
          borderTopColor: theme.colors.borderLight,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          height: 68 + insets.bottom,
          paddingBottom: insets.bottom + 10,
          paddingTop: 10,
          // Always reserve real layout space for the tab bar instead of floating
          // it over content (position: 'absolute' on iOS made bottom-pinned
          // footers/buttons on individual screens sit underneath it and become
          // unreachable).
          position: 'relative',
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: theme.typography.fontFamily,
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? "home" : "home-outline"} color={color as string} focused={focused} theme={theme} />,
          headerRight: () => <HeaderNotificationIcon />,
        }}
      />
      <Tabs.Screen
        name="guests"
        options={{
          title: 'Guests',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? "people" : "people-outline"} color={color as string} focused={focused} theme={theme} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? "calendar" : "calendar-outline"} color={color as string} focused={focused} theme={theme} />,
        }}
      />
      <Tabs.Screen
        name="vendors"
        options={{
          title: 'Vendors',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? "briefcase" : "briefcase-outline"} color={color as string} focused={focused} theme={theme} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? "grid" : "grid-outline"} color={color as string} focused={focused} theme={theme} />,
        }}
      />

      {/* Hidden from tab bar but still navigable */}
      <Tabs.Screen name="rooms" options={{ href: null }} />
      <Tabs.Screen name="assistant" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="patrika" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="finance" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="tasks" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="dances" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="control-room" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="wedding-day" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="baraat" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="emergency" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="announcements" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="transportation" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="seating" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="catering" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="shopping" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="gifts" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="inventory" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="documents" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="checkin" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="photos" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="memories" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="closing" options={{ href: null, headerShown: false }} />
    </Tabs>
  );

  if (!showSidebar) return tabs;

  return (
    <View style={styles.desktopRow}>
      <AppSidebar />
      <View style={styles.desktopContent}>{tabs}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopRow: { flex: 1, flexDirection: 'row' },
  desktopContent: { flex: 1, minWidth: 0 },
});

