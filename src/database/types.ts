export interface Wedding {
  id: string;
  bride_name: string;
  groom_name: string;
  date: string | null;
  venue: string | null;
  cover_photo_uri: string | null;
  budget: number | null;
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
