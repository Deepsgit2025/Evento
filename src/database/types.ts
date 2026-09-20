export interface Wedding {
  id: string;
  bride_name: string;
  groom_name: string;
  date: string | null;
  venue: string | null;
  cover_photo_uri: string | null;
  budget: number | null;
  closed_at?: number | null;
  created_at: number;
  updated_at: number;
}

export interface User {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  created_at: number;
}

export interface WeddingMember {
  id: string;
  user_id: string;
  wedding_id: string;
  role: 'MANAGER' | 'PARTNER' | 'VIEWER';
  created_at: number;
}

export interface GuestGroup {
  id: string;
  wedding_id: string;
  name: string;
  side: 'Groom' | 'Bride';
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface Guest {
  id: string;
  wedding_id: string;
  full_name: string;
  phone: string | null;
  alternate_phone: string | null;
  side: 'Groom' | 'Bride';
  group_id: string | null;
  party_size: number;
  rsvp_status: 'PENDING' | 'ATTENDING' | 'DECLINED' | 'MAYBE';
  dietary_requirements: string | null;
  notes: string | null;
  checkin_code?: string | null;
  checked_in_at?: number | null;
  checked_in_by?: string | null;
  created_at: number;
  updated_at: number;
}

export interface Hotel {
  id: string;
  wedding_id: string;
  name: string;
  address: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface Room {
  id: string;
  hotel_id: string;
  room_number: string;
  room_type: string | null;
  capacity: number;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface RoomAssignment {
  id: string;
  room_id: string;
  guest_id: string;
  check_in_date: string | null;
  check_out_date: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export type EventStatus = 'UPCOMING' | 'RUNNING' | 'DELAYED' | 'COMPLETED' | 'PROBLEM';

export interface Event {
  id: string;
  wedding_id: string;
  name: string;
  event_type: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  /** Defaults to 'UPCOMING' in the database; optional here so existing create/update call sites don't need to pass it. */
  status?: EventStatus;
  responsible_person?: string | null;
  responsible_phone?: string | null;
  delay_reason?: string | null;
  manager_notes?: string | null;
  created_at: number;
  updated_at: number;
}

export interface EventGuest {
  id: string;
  wedding_id: string;
  event_id: string;
  guest_id: string;
  rsvp_status: 'PENDING' | 'ATTENDING' | 'DECLINED' | 'MAYBE';
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export type VendorArrivalStatus = 'NOT_ARRIVED' | 'ON_THE_WAY' | 'ARRIVED' | 'DELAYED' | 'COMPLETED';

export interface VendorEventAssignment {
  id: string;
  vendor_id: string;
  event_id: string;
  status: VendorArrivalStatus;
  expected_arrival: string | null;
  actual_arrival: string | null;
  notes: string | null;
  created_at: number;
}

export interface Vendor {
  id: string;
  wedding_id: string;
  name: string;
  category: string;
  contact_person: string | null;
  phone: string | null;
  alternate_phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  agreed_amount: number;
  created_at: number;
  updated_at: number;
}

export interface Payment {
  id: string;
  wedding_id: string;
  vendor_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface Expense {
  id: string;
  wedding_id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  payment_method: string;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface Invitation {
  id: string;
  wedding_id: string;
  template_id: string;
  title: string;
  customization_data: string; // JSON string
  created_at: number;
  updated_at: number;
}

export type InvitationRecipientStatus = 'NOT_SENT' | 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';

export interface InvitationRecipient {
  id: string;
  invitation_id: string;
  guest_id: string;
  event_id: string | null;
  campaign_id: string | null;
  status: InvitationRecipientStatus;
  sent_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface WhatsAppConfig {
  id: string; // usually 'default'
  wedding_id: string;
  phone_number_id: string;
  access_token: string;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export interface InvitationCampaign {
  id: string;
  wedding_id: string;
  name: string;
  invitation_id: string;
  event_id: string | null;
  status: 'DRAFT' | 'SENDING' | 'COMPLETED';
  created_at: number;
  updated_at: number;
}

export interface Task {
  id: string;
  wedding_id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  due_date: string | null;
  /** Unix seconds combining due_date + due_time; the alarm fires this many minutes earlier. */
  reminder_time: number | null;
  reminder_lead_minutes: number | null;
  reminder_style: 'ALARM' | 'MESSAGE' | null;
  reminder_id: string | null;
  created_at: number;
  updated_at?: number;
}

export interface Dance {
  id: string;
  wedding_id: string;
  title: string;
  /** Whose dance it is, e.g. "Bride's cousins" or "Sharma family". */
  group_name: string | null;
  member_count: number | null;
  performers: string | null;
  song_title: string | null;
  song_artist: string | null;
  choreographer: string | null;
  practice_time: number | null;
  reminder_style: 'ALARM' | 'MESSAGE' | null;
  reminder_id: string | null;
  notes: string | null;
  sort_order: number;
  created_at: number;
  updated_at?: number;
}

export const EMERGENCY_CONTACT_CATEGORIES = [
  'Ambulance', 'Hospital', 'Police', 'Security', 'Venue Manager',
  'Electrician', 'Plumber', 'Driver', 'Family Emergency Contact', 'Other'
] as const;

export interface EmergencyContact {
  id: string;
  wedding_id: string;
  category: string;
  name: string;
  phone: string;
  notes: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type AnnouncementStatus = 'ACTIVE' | 'EXPIRED';

export interface Announcement {
  id: string;
  wedding_id: string;
  title: string;
  message: string;
  event_id: string | null;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  created_at: number;
  updated_at: number;
}

export type BaraatStatus = 'PREPARING' | 'STARTED' | 'ON_THE_WAY' | 'ARRIVED' | 'COMPLETED';

export interface BaraatTrip {
  id: string;
  wedding_id: string;
  vehicle: string;
  driver_name: string | null;
  driver_phone: string | null;
  pickup_location: string | null;
  destination: string | null;
  capacity: number | null;
  status: BaraatStatus;
  estimated_arrival: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface BaraatTripGuest {
  id: string;
  trip_id: string;
  guest_id: string;
  created_at: number;
}

export interface SeatingTable {
  id: string;
  wedding_id: string;
  name: string;
  capacity: number;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface SeatingAssignment {
  id: string;
  table_id: string;
  guest_id: string;
  created_at: number;
}

export const INVENTORY_CATEGORIES = [
  'Chairs', 'Tables', 'Garlands', 'Water Bottles', 'Gifts', 'Blankets',
  'Room Keys', 'Decoration Materials', 'Crockery', 'Rental Equipment', 'Other'
] as const;

export type InventoryStatus = 'OK' | 'DAMAGED' | 'MISSING';

export interface InventoryItem {
  id: string;
  wedding_id: string;
  name: string;
  category: string;
  quantity: number;
  available_quantity: number;
  location: string | null;
  owner_source: string | null;
  status: InventoryStatus;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export type TransportStatus = 'PENDING' | 'ASSIGNED' | 'COMPLETED';

export interface TransportRequest {
  id: string;
  wedding_id: string;
  guest_id: string | null;
  guest_name: string | null;
  pickup_location: string | null;
  drop_location: string | null;
  requested_time: string | null;
  vehicle_info: string | null;
  status: TransportStatus;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export const CATERING_CATEGORIES = ['Starter', 'Main Course', 'Dessert', 'Beverage', 'Other'] as const;
export type CateringStatus = 'PLANNED' | 'CONFIRMED';

export interface CateringItem {
  id: string;
  wedding_id: string;
  event_id: string | null;
  name: string;
  category: string;
  guest_count_estimate: number | null;
  status: CateringStatus;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface ShoppingItem {
  id: string;
  wedding_id: string;
  title: string;
  category: string | null;
  estimated_cost: number | null;
  purchased: boolean | number;
  assigned_to: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface Gift {
  id: string;
  wedding_id: string;
  guest_id: string | null;
  giver_name: string;
  description: string | null;
  estimated_value: number | null;
  date_received: string | null;
  thank_you_sent: boolean | number;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export const DOCUMENT_CATEGORIES = ['Contract', 'Permit', 'Invoice', 'ID Proof', 'Booking Confirmation', 'Other'] as const;

export interface WeddingDocument {
  id: string;
  wedding_id: string;
  title: string;
  category: string;
  file_uri: string;
  file_name: string | null;
  mime_type: string | null;
  notes: string | null;
  created_at: number;
}

export interface WeddingPhoto {
  id: string;
  wedding_id: string;
  event_id: string | null;
  uri: string;
  caption: string | null;
  created_at: number;
}
