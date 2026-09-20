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
// "More" screen) so navigation stays consistent everywhere. Grouped by what
// the destination is *for* (People / Planning / Operations / Money /
// Communication / Insights / Admin) rather than by when each module shipped.
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'People',
    items: [
      { key: 'guests', label: 'Guests', route: '/(tabs)/guests', icon: 'people' },
      { key: 'checkin', label: 'Guest Check-in', route: '/(tabs)/checkin', icon: 'qr-code' },
    ],
  },
  {
    title: 'Planning',
    items: [
      { key: 'wedding-day', label: 'Wedding Day', route: '/(tabs)/wedding-day', icon: 'sunny' },
      { key: 'events', label: 'Events', route: '/(tabs)/events', icon: 'calendar' },
      { key: 'tasks', label: 'Tasks', route: '/(tabs)/tasks', icon: 'checkbox' },
      { key: 'baraat', label: 'Baraat Tracker', route: '/(tabs)/baraat', icon: 'car' },
      { key: 'dances', label: 'Dances', route: '/(tabs)/dances', icon: 'musical-notes' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { key: 'rooms', label: 'Rooms', route: '/(tabs)/rooms', icon: 'bed' },
      { key: 'vendors', label: 'Vendors', route: '/(tabs)/vendors', icon: 'briefcase' },
      { key: 'vendor-arrival', label: 'Vendor Arrival', route: '/(tabs)/vendors/arrivals', icon: 'walk' },
      { key: 'catering', label: 'Catering', route: '/(tabs)/catering', icon: 'restaurant' },
      { key: 'transportation', label: 'Transportation', route: '/(tabs)/transportation', icon: 'bus' },
      { key: 'seating', label: 'Seating Planner', route: '/(tabs)/seating', icon: 'grid' },
      { key: 'inventory', label: 'Inventory', route: '/(tabs)/inventory', icon: 'cube' },
      { key: 'documents', label: 'Documents', route: '/(tabs)/documents', icon: 'document-text' },
    ],
  },
  {
    title: 'Money',
    items: [
      { key: 'finance', label: 'Budget & Expenses', route: '/(tabs)/finance', icon: 'wallet' },
      { key: 'shopping', label: 'Shopping', route: '/(tabs)/shopping', icon: 'cart' },
      { key: 'gifts', label: 'Gifts', route: '/(tabs)/gifts', icon: 'gift' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { key: 'patrika', label: 'Invitations', route: '/(tabs)/patrika', icon: 'mail-open' },
      { key: 'whatsapp', label: 'WhatsApp', route: '/(tabs)/settings/whatsapp', icon: 'logo-whatsapp' },
      { key: 'announcements', label: 'Announcements', route: '/(tabs)/announcements', icon: 'megaphone' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { key: 'dashboard', label: 'Dashboard', route: '/(tabs)', icon: 'home' },
      { key: 'reports', label: 'Reports', route: '/(tabs)/reports', icon: 'bar-chart' },
    ],
  },
  {
    title: 'Memories',
    items: [
      { key: 'photos', label: 'Photo Collection', route: '/(tabs)/photos', icon: 'images' },
      { key: 'memories', label: 'Wedding Memories', route: '/(tabs)/memories', icon: 'heart' },
      { key: 'closing', label: 'Post-Wedding Closing', route: '/(tabs)/closing', icon: 'checkmark-done-circle' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { key: 'control-room', label: 'Wedding Control Room', route: '/(tabs)/control-room', icon: 'tv' },
      { key: 'emergency', label: 'Emergency Center', route: '/(tabs)/emergency', icon: 'alert-circle' },
      { key: 'ai-assistant', label: 'AI Assistant', route: '/(tabs)/assistant', icon: 'sparkles' },
      { key: 'backup', label: 'Backup & Restore', route: '/(tabs)/settings/backup', icon: 'cloud-upload' },
      { key: 'sync', label: 'Cloud Sync', route: '/(tabs)/settings/sync', icon: 'sync' },
    ],
  },
];

export const NAV_BOTTOM_ITEMS: NavItem[] = [
  { key: 'notifications', label: 'Notifications', route: '/notifications', icon: 'notifications' },
  { key: 'settings', label: 'Settings', route: '/(tabs)/settings', icon: 'settings' },
  { key: 'profile', label: 'Profile', route: '/(tabs)/settings/profile', icon: 'person-circle' },
];
