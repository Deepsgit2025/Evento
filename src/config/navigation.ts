import { Ionicons } from '@expo/vector-icons';

export interface NavItem {
  key: string;
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Screens not yet built get a friendly "coming soon" placeholder instead of a dead link. */
  comingSoon?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// Mirrors the structure of the app's real screens/routes. Sections match the
// sidebar/drawer groupings used across the app (desktop sidebar, mobile
// "More" screen) so navigation stays consistent everywhere.
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Main',
    items: [
      { key: 'dashboard', label: 'Dashboard', route: '/(tabs)', icon: 'home' },
      { key: 'wedding-day', label: 'Wedding Day', route: '/(tabs)/wedding-day', icon: 'sunny' },
      { key: 'events', label: 'Events', route: '/(tabs)/events', icon: 'calendar' },
      { key: 'guests', label: 'Guests', route: '/(tabs)/guests', icon: 'people' },
      { key: 'vendors', label: 'Vendors', route: '/(tabs)/vendors', icon: 'briefcase' },
      { key: 'rooms', label: 'Rooms', route: '/(tabs)/rooms', icon: 'bed' },
      { key: 'finance', label: 'Budget & Expenses', route: '/(tabs)/finance', icon: 'wallet' },
      { key: 'tasks', label: 'Tasks', route: '/(tabs)/tasks', icon: 'checkbox' },
    ],
  },
  {
    title: 'Management',
    items: [
      { key: 'patrika', label: 'Invitations', route: '/(tabs)/patrika', icon: 'mail-open' },
      { key: 'transportation', label: 'Transportation', route: '/(tabs)/transportation', icon: 'bus', comingSoon: true },
      { key: 'seating', label: 'Seating Planner', route: '/(tabs)/seating', icon: 'grid', comingSoon: true },
      { key: 'catering', label: 'Catering', route: '/(tabs)/catering', icon: 'restaurant', comingSoon: true },
      { key: 'shopping', label: 'Shopping', route: '/(tabs)/shopping', icon: 'cart', comingSoon: true },
      { key: 'gifts', label: 'Gifts', route: '/(tabs)/gifts', icon: 'gift', comingSoon: true },
      { key: 'inventory', label: 'Inventory', route: '/(tabs)/inventory', icon: 'cube', comingSoon: true },
      { key: 'documents', label: 'Documents', route: '/(tabs)/documents', icon: 'document-text', comingSoon: true },
    ],
  },
  {
    title: 'Live Wedding',
    items: [
      { key: 'control-room', label: 'Wedding Control Room', route: '/(tabs)/control-room', icon: 'tv' },
      { key: 'baraat', label: 'Baraat Tracker', route: '/(tabs)/baraat', icon: 'car' },
      { key: 'checkin', label: 'Guest Check-in', route: '/(tabs)/checkin', icon: 'qr-code', comingSoon: true },
      { key: 'vendor-arrival', label: 'Vendor Arrival', route: '/(tabs)/vendors/arrivals', icon: 'walk' },
      { key: 'announcements', label: 'Announcements', route: '/(tabs)/announcements', icon: 'megaphone' },
      { key: 'emergency', label: 'Emergency Center', route: '/(tabs)/emergency', icon: 'alert-circle' },
    ],
  },
  {
    title: 'Memories',
    items: [
      { key: 'photos', label: 'Photo Collection', route: '/(tabs)/photos', icon: 'images', comingSoon: true },
      { key: 'memories', label: 'Wedding Memories', route: '/(tabs)/memories', icon: 'heart', comingSoon: true },
      { key: 'closing', label: 'Post-Wedding Closing', route: '/(tabs)/closing', icon: 'checkmark-done-circle', comingSoon: true },
    ],
  },
];

export const NAV_BOTTOM_ITEMS: NavItem[] = [
  { key: 'notifications', label: 'Notifications', route: '/notifications', icon: 'notifications' },
  { key: 'settings', label: 'Settings', route: '/(tabs)/settings', icon: 'settings' },
  { key: 'profile', label: 'Profile', route: '/(tabs)/settings/profile', icon: 'person-circle' },
];
