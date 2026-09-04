import * as SQLite from 'expo-sqlite';

export interface FinancialReport {
  total_agreed: number;
  total_vendor_payments: number;
  total_pending: number;
  general_expenses: number;
  overall_spending: number;
}

export interface GuestReport {
  total_guests: number;
  groom_side: number;
  bride_side: number;
  rsvp_states: {
    ATTENDING: number;
    PENDING: number;
    DECLINED: number;
    MAYBE: number;
  };
  guests_without_rooms: number;
  guests_without_invitations: number;
}

export interface RoomReport {
  total_rooms: number;
  occupied_rooms: number;
  available_rooms: number;
  guests_assigned: number;
  guests_without_rooms: number;
}

export interface EventReport {
  upcoming_events: number;
  completed_events: number;
  guests_per_event: { event_id: string; event_name: string; guest_count: number }[];
  assigned_vendors: { event_id: string; event_name: string; vendor_count: number }[];
}

export const ReportService = {
  async getFinancialReport(db: SQLite.SQLiteDatabase, weddingId: string): Promise<FinancialReport> {
    const vendorRes = await db.getFirstAsync<{ total_agreed: number }>(
      `SELECT SUM(agreed_amount) as total_agreed FROM vendors WHERE wedding_id = ? AND deleted_at IS NULL`,
      [weddingId]
    );
    const total_agreed = vendorRes?.total_agreed || 0;

    const paymentsRes = await db.getFirstAsync<{ total_paid: number }>(
      `SELECT SUM(amount) as total_paid FROM payments WHERE wedding_id = ? AND deleted_at IS NULL`,
      [weddingId]
    );
    const total_vendor_payments = paymentsRes?.total_paid || 0;

    const expensesRes = await db.getFirstAsync<{ total_expenses: number }>(
      `SELECT SUM(amount) as total_expenses FROM expenses WHERE wedding_id = ? AND deleted_at IS NULL`,
      [weddingId]
    );
    const general_expenses = expensesRes?.total_expenses || 0;

    const vendors = await db.getAllAsync<{ agreed_amount: number, paid: number }>(
      `SELECT v.agreed_amount, COALESCE(SUM(p.amount), 0) as paid
       FROM vendors v
       LEFT JOIN payments p ON v.id = p.vendor_id AND p.deleted_at IS NULL
       WHERE v.wedding_id = ? AND v.deleted_at IS NULL
       GROUP BY v.id`,
      [weddingId]
    );

    let total_pending = 0;
    vendors.forEach(v => {
      const remaining = v.agreed_amount - v.paid;
      if (remaining > 0) total_pending += remaining;
    });

    const overall_spending = total_vendor_payments + general_expenses;

    return {
      total_agreed,
      total_vendor_payments,
      total_pending,
      general_expenses,
      overall_spending
    };
  },

  async getGuestReport(db: SQLite.SQLiteDatabase, weddingId: string): Promise<GuestReport> {
    const counts = await db.getFirstAsync<{
      total: number,
      groom: number,
      bride: number,
      attending: number,
      pending: number,
      declined: number,
      maybe: number
    }>(
      `SELECT 
        SUM(party_size) as total,
        SUM(CASE WHEN side = 'Groom' THEN party_size ELSE 0 END) as groom,
        SUM(CASE WHEN side = 'Bride' THEN party_size ELSE 0 END) as bride,
        SUM(CASE WHEN rsvp_status = 'ATTENDING' THEN party_size ELSE 0 END) as attending,
        SUM(CASE WHEN rsvp_status = 'PENDING' THEN party_size ELSE 0 END) as pending,
        SUM(CASE WHEN rsvp_status = 'DECLINED' THEN party_size ELSE 0 END) as declined,
        SUM(CASE WHEN rsvp_status = 'MAYBE' THEN party_size ELSE 0 END) as maybe
       FROM guests 
       WHERE wedding_id = ? AND deleted_at IS NULL`,
      [weddingId]
    );

    const noRoomRes = await db.getFirstAsync<{ no_room_count: number }>(
      `SELECT COALESCE(SUM(g.party_size), 0) as no_room_count
       FROM guests g
       LEFT JOIN room_assignments ra ON g.id = ra.guest_id AND ra.deleted_at IS NULL
       WHERE g.wedding_id = ? AND g.deleted_at IS NULL AND ra.id IS NULL`,
      [weddingId]
    );

    const noInviteRes = await db.getFirstAsync<{ no_invite_count: number }>(
      `SELECT COALESCE(SUM(g.party_size), 0) as no_invite_count
       FROM guests g
       LEFT JOIN invitation_recipients ir ON g.id = ir.guest_id AND ir.deleted_at IS NULL
       WHERE g.wedding_id = ? AND g.deleted_at IS NULL AND ir.id IS NULL`,
      [weddingId]
    );

    return {
      total_guests: counts?.total || 0,
      groom_side: counts?.groom || 0,
      bride_side: counts?.bride || 0,
      rsvp_states: {
        ATTENDING: counts?.attending || 0,
        PENDING: counts?.pending || 0,
        DECLINED: counts?.declined || 0,
        MAYBE: counts?.maybe || 0
      },
      guests_without_rooms: noRoomRes?.no_room_count || 0,
      guests_without_invitations: noInviteRes?.no_invite_count || 0
    };
  },

  async getRoomReport(db: SQLite.SQLiteDatabase, weddingId: string): Promise<RoomReport> {
    const totalRoomsRes = await db.getFirstAsync<{ total_rooms: number }>(
      `SELECT COUNT(*) as total_rooms 
       FROM rooms r
       JOIN hotels h ON r.hotel_id = h.id
       WHERE h.wedding_id = ? AND r.deleted_at IS NULL AND h.deleted_at IS NULL`,
      [weddingId]
    );

    const occupiedRoomsRes = await db.getFirstAsync<{ occupied_rooms: number }>(
      `SELECT COUNT(DISTINCT r.id) as occupied_rooms 
       FROM rooms r
       JOIN hotels h ON r.hotel_id = h.id
       JOIN room_assignments ra ON r.id = ra.room_id
       WHERE h.wedding_id = ? AND r.deleted_at IS NULL AND h.deleted_at IS NULL AND ra.deleted_at IS NULL`,
      [weddingId]
    );

    const guestsAssignedRes = await db.getFirstAsync<{ guests_assigned: number }>(
      `SELECT COALESCE(SUM(g.party_size), 0) as guests_assigned
       FROM room_assignments ra
       JOIN guests g ON ra.guest_id = g.id
       WHERE g.wedding_id = ? AND g.deleted_at IS NULL AND ra.deleted_at IS NULL`,
      [weddingId]
    );

    const noRoomRes = await db.getFirstAsync<{ no_room_count: number }>(
      `SELECT COALESCE(SUM(g.party_size), 0) as no_room_count
       FROM guests g
       LEFT JOIN room_assignments ra ON g.id = ra.guest_id AND ra.deleted_at IS NULL
       WHERE g.wedding_id = ? AND g.deleted_at IS NULL AND ra.id IS NULL`,
      [weddingId]
    );

    const totalRooms = totalRoomsRes?.total_rooms || 0;
    const occupiedRooms = occupiedRoomsRes?.occupied_rooms || 0;

    return {
      total_rooms: totalRooms,
      occupied_rooms: occupiedRooms,
      available_rooms: totalRooms - occupiedRooms,
      guests_assigned: guestsAssignedRes?.guests_assigned || 0,
      guests_without_rooms: noRoomRes?.no_room_count || 0
    };
  },

  async getEventReport(db: SQLite.SQLiteDatabase, weddingId: string): Promise<EventReport> {
    const nowObj = new Date();
    const isoDate = nowObj.toISOString().split('T')[0];
    const isoTime = nowObj.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    const upcomingRes = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM events 
       WHERE wedding_id = ? AND deleted_at IS NULL 
       AND (date > ? OR (date = ? AND start_time >= ?))`,
      [weddingId, isoDate, isoDate, isoTime]
    );

    const completedRes = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM events 
       WHERE wedding_id = ? AND deleted_at IS NULL 
       AND (date < ? OR (date = ? AND start_time < ?))`,
      [weddingId, isoDate, isoDate, isoTime]
    );

    const guestsPerEvent = await db.getAllAsync<{ event_id: string, event_name: string, guest_count: number }>(
      `SELECT e.id as event_id, e.name as event_name, COALESCE(SUM(g.party_size), 0) as guest_count
       FROM events e
       LEFT JOIN event_guests eg ON e.id = eg.event_id AND eg.deleted_at IS NULL
       LEFT JOIN guests g ON eg.guest_id = g.id AND g.deleted_at IS NULL
       WHERE e.wedding_id = ? AND e.deleted_at IS NULL
       GROUP BY e.id`,
      [weddingId]
    );

    const vendorsPerEvent = await db.getAllAsync<{ event_id: string, event_name: string, vendor_count: number }>(
      `SELECT e.id as event_id, e.name as event_name, COUNT(ve.vendor_id) as vendor_count
       FROM events e
       LEFT JOIN vendor_events ve ON e.id = ve.event_id AND ve.deleted_at IS NULL
       WHERE e.wedding_id = ? AND e.deleted_at IS NULL
       GROUP BY e.id`,
      [weddingId]
    );

    return {
      upcoming_events: upcomingRes?.count || 0,
      completed_events: completedRes?.count || 0,
      guests_per_event: guestsPerEvent || [],
      assigned_vendors: vendorsPerEvent || []
    };
  }
};
