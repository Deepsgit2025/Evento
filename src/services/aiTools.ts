import * as SQLite from 'expo-sqlite';

export const AITools = {
  /**
   * Retrieves specific guest details including RSVP, side, and room assignment by name.
   */
  async getGuestByName(db: SQLite.SQLiteDatabase, weddingId: string, name: string) {
    const guests = await db.getAllAsync<any>(
      `SELECT g.id, g.full_name, g.side, g.rsvp_status, g.party_size,
              r.room_number, h.name as hotel_name
       FROM guests g
       LEFT JOIN room_assignments ra ON g.id = ra.guest_id
       LEFT JOIN rooms r ON ra.room_id = r.id
       LEFT JOIN hotels h ON r.hotel_id = h.id
       WHERE g.wedding_id = ? AND g.full_name LIKE ?`,
      [weddingId, `%${name}%`]
    );
    if (guests.length === 0) return { result: "No guest found with that name." };
    return { result: guests };
  },

  /**
   * Retrieves summary of vendor payments.
   */
  async getVendorPaymentSummary(db: SQLite.SQLiteDatabase, weddingId: string, vendorName?: string) {
    let query = `
      SELECT v.name, v.category, v.agreed_amount, 
             COALESCE(SUM(p.amount), 0) as total_paid
      FROM vendors v
      LEFT JOIN payments p ON v.id = p.vendor_id
      WHERE v.wedding_id = ?
    `;
    const params: any[] = [weddingId];

    if (vendorName) {
      query += ` AND (v.name LIKE ? OR v.category LIKE ?)`;
      params.push(`%${vendorName}%`, `%${vendorName}%`);
    }

    query += ` GROUP BY v.id`;

    const summary = await db.getAllAsync<any>(query, params);
    
    if (summary.length === 0) return { result: "No vendors found." };
    
    return {
      result: summary.map(v => ({
        name: v.name,
        category: v.category,
        agreed_amount: v.agreed_amount,
        total_paid: v.total_paid,
        pending: v.agreed_amount - v.total_paid
      }))
    };
  },

  /**
   * Retrieves all upcoming events.
   */
  async getUpcomingEvents(db: SQLite.SQLiteDatabase, weddingId: string) {
    const events = await db.getAllAsync<any>(
      `SELECT name, date, start_time, location FROM events WHERE wedding_id = ? ORDER BY date ASC, start_time ASC`,
      [weddingId]
    );
    if (events.length === 0) return { result: "No events scheduled." };
    return { result: events };
  },

  /**
   * Retrieves guests attending a specific event.
   */
  async getEventGuests(db: SQLite.SQLiteDatabase, weddingId: string, eventName: string) {
    const guests = await db.getAllAsync<any>(
      `SELECT g.full_name, g.party_size, eg.rsvp_status 
       FROM event_guests eg
       JOIN events e ON eg.event_id = e.id
       JOIN guests g ON eg.guest_id = g.id
       WHERE e.wedding_id = ? AND e.name LIKE ?`,
      [weddingId, `%${eventName}%`]
    );
    if (guests.length === 0) return { result: `No guests found for event matching '${eventName}'.` };
    return { result: guests };
  },

  /**
   * Retrieves guests who need a room.
   */
  async getGuestsWithoutRooms(db: SQLite.SQLiteDatabase, weddingId: string) {
    const countQuery = await db.getFirstAsync<{count: number}>(
      `SELECT COUNT(*) as count FROM guests g 
       LEFT JOIN room_assignments ra ON g.id = ra.guest_id
       WHERE g.wedding_id = ? AND ra.id IS NULL`,
       [weddingId]
    );
    const count = countQuery?.count || 0;
    return { result: count > 0 
      ? `There are ${count} guests without room assignments.` 
      : `All guests have room assignments.` 
    };
  },

  /**
   * Retrieves total wedding expenses summary.
   */
  async getWeddingExpensesSummary(db: SQLite.SQLiteDatabase, weddingId: string) {
    const expenses = await db.getFirstAsync<{total: number}>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE wedding_id = ?`,
      [weddingId]
    );
    
    const payments = await db.getFirstAsync<{total: number}>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE wedding_id = ?`,
      [weddingId]
    );

    return { 
      result: {
        total_general_expenses: expenses?.total || 0,
        total_vendor_payments: payments?.total || 0,
        combined_total: (expenses?.total || 0) + (payments?.total || 0)
      }
    };
  },
  
  /**
   * Retrieves room occupants.
   */
  async getRoomOccupants(db: SQLite.SQLiteDatabase, weddingId: string, roomNumber: string) {
    const occupants = await db.getAllAsync<any>(
      `SELECT g.full_name, g.party_size, h.name as hotel_name
       FROM room_assignments ra
       JOIN rooms r ON ra.room_id = r.id
       JOIN hotels h ON r.hotel_id = h.id
       JOIN guests g ON ra.guest_id = g.id
       WHERE h.wedding_id = ? AND r.room_number LIKE ?`,
       [weddingId, `%${roomNumber}%`]
    );
    
    if (occupants.length === 0) return { result: `No one is assigned to room ${roomNumber}.` };
    return { result: occupants };
  },
  
  /**
   * Retrieves invitation status for a specific guest.
   */
  async getGuestInvitationStatus(db: SQLite.SQLiteDatabase, weddingId: string, guestName: string) {
    const invites = await db.getAllAsync<any>(
      `SELECT g.full_name, i.title, ir.status
       FROM invitation_recipients ir
       JOIN invitations i ON ir.invitation_id = i.id
       JOIN guests g ON ir.guest_id = g.id
       WHERE g.wedding_id = ? AND g.full_name LIKE ?`,
       [weddingId, `%${guestName}%`]
    );
    
    if (invites.length === 0) return { result: `No invitations found for guest matching '${guestName}'.` };
    return { result: invites };
  },

  /**
   * Retrieves total guest count and party size.
   */
  async getGuestCount(db: SQLite.SQLiteDatabase, weddingId: string) {
    const result = await db.getFirstAsync<{ count: number; totalPeople: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(party_size), 0) as totalPeople 
       FROM guests WHERE wedding_id = ?`,
      [weddingId]
    );
    return { result: result || { count: 0, totalPeople: 0 } };
  },

  /**
   * Retrieves guest count by side (Bride/Groom).
   */
  async getSideCount(db: SQLite.SQLiteDatabase, weddingId: string, side: string) {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM guests WHERE wedding_id = ? AND side = ?`,
      [weddingId, side]
    );
    return { result: result || { count: 0 } };
  },

  /**
   * Retrieves empty/available rooms.
   */
  async getEmptyRooms(db: SQLite.SQLiteDatabase, weddingId: string) {
    const rooms = await db.getAllAsync<any>(
      `SELECT r.room_number, h.name as hotel_name, r.capacity,
              (SELECT COUNT(*) FROM room_assignments ra WHERE ra.room_id = r.id) as occupancy
       FROM rooms r
       JOIN hotels h ON r.hotel_id = h.id
       WHERE h.wedding_id = ?
       HAVING occupancy < r.capacity`,
      [weddingId]
    );
    
    if (rooms.length === 0) return { result: "No available rooms found." };
    
    const lines = rooms.map((r: any) => `${r.hotel_name} — Room ${r.room_number} (${r.occupancy}/${r.capacity})`);
    return { result: `Available rooms:\n${lines.join('\n')}` };
  },

  /**
   * Retrieves pending vendor payments.
   */
  async getPendingPayments(db: SQLite.SQLiteDatabase, weddingId: string) {
    const vendors = await db.getAllAsync<any>(
      `SELECT v.name, v.agreed_amount, COALESCE(SUM(p.amount), 0) as total_paid
       FROM vendors v
       LEFT JOIN payments p ON v.id = p.vendor_id
       WHERE v.wedding_id = ?
       GROUP BY v.id
       HAVING v.agreed_amount > total_paid`,
      [weddingId]
    );
    
    if (vendors.length === 0) return { result: "All vendor payments are complete!" };
    
    const totalPending = vendors.reduce((sum: number, v: any) => sum + (v.agreed_amount - v.total_paid), 0);
    const lines = vendors.map((v: any) => `${v.name}: ₹${v.agreed_amount - v.total_paid} pending`);
    return { result: `Pending payments (₹${totalPending} total):\n${lines.join('\n')}` };
  },

  /**
   * Retrieves budget summary.
   */
  async getBudgetSummary(db: SQLite.SQLiteDatabase, weddingId: string) {
    const wedding = await db.getFirstAsync<{ budget: number | null }>(
      `SELECT budget FROM weddings WHERE id = ?`, [weddingId]
    );
    
    const expenses = await db.getFirstAsync<{total: number}>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE wedding_id = ?`, [weddingId]
    );
    const payments = await db.getFirstAsync<{total: number}>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE wedding_id = ?`, [weddingId]
    );
    
    const spent = (expenses?.total || 0) + (payments?.total || 0);
    const budget = wedding?.budget ?? null;
    
    return {
      result: {
        budget,
        spent,
        remaining: budget !== null ? budget - spent : 0
      }
    };
  },

  /**
   * Retrieves overall wedding summary.
   */
  async getWeddingSummary(db: SQLite.SQLiteDatabase, weddingId: string) {
    const guestResult = await db.getFirstAsync<{ count: number; totalPeople: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(party_size), 0) as totalPeople FROM guests WHERE wedding_id = ?`,
      [weddingId]
    );
    const eventCount = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM events WHERE wedding_id = ?`, [weddingId]
    );
    const roomCount = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM rooms r JOIN hotels h ON r.hotel_id = h.id WHERE h.wedding_id = ?`, [weddingId]
    );
    const vendorCount = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM vendors WHERE wedding_id = ?`, [weddingId]
    );
    const expenses = await db.getFirstAsync<{total: number}>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE wedding_id = ?`, [weddingId]
    );
    const payments = await db.getFirstAsync<{total: number}>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE wedding_id = ?`, [weddingId]
    );
    
    return {
      result: {
        guestCount: guestResult?.count || 0,
        totalPeople: guestResult?.totalPeople || 0,
        eventCount: eventCount?.count || 0,
        roomCount: roomCount?.count || 0,
        vendorCount: vendorCount?.count || 0,
        totalSpent: (expenses?.total || 0) + (payments?.total || 0)
      }
    };
  }
};
