import { SQLiteDatabase } from 'expo-sqlite';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  entityType: 'Guest' | 'Event' | 'Vendor' | 'Room' | 'Expense' | 'Task' | 'Invitation' | 'Announcement';
  route: string;
}

/**
 * Searches across the app's main entities by name/title. Each row is
 * tagged with its entity type so results read unambiguously in a mixed list.
 */
export const GlobalSearchService = {
  async search(db: SQLiteDatabase, weddingId: string, query: string): Promise<SearchResult[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const like = `%${q}%`;

    const [guests, events, vendors, rooms, expenses, tasks, invitations, announcements] = await Promise.all([
      db.getAllAsync<{ id: string; full_name: string; phone: string | null }>(
        `SELECT id, full_name, phone FROM guests WHERE wedding_id = ? AND full_name LIKE ? LIMIT 8`,
        [weddingId, like]
      ),
      db.getAllAsync<{ id: string; name: string; date: string | null }>(
        `SELECT id, name, date FROM events WHERE wedding_id = ? AND name LIKE ? LIMIT 8`,
        [weddingId, like]
      ),
      db.getAllAsync<{ id: string; name: string; category: string }>(
        `SELECT id, name, category FROM vendors WHERE wedding_id = ? AND deleted_at IS NULL AND name LIKE ? LIMIT 8`,
        [weddingId, like]
      ),
      db.getAllAsync<{ id: string; room_number: string; hotel_name: string }>(
        `SELECT r.id, r.room_number, h.name as hotel_name FROM rooms r JOIN hotels h ON r.hotel_id = h.id WHERE h.wedding_id = ? AND r.room_number LIKE ? LIMIT 8`,
        [weddingId, like]
      ),
      db.getAllAsync<{ id: string; title: string; amount: number }>(
        `SELECT id, title, amount FROM expenses WHERE wedding_id = ? AND title LIKE ? LIMIT 8`,
        [weddingId, like]
      ),
      db.getAllAsync<{ id: string; title: string; status: string }>(
        `SELECT id, title, status FROM tasks WHERE wedding_id = ? AND title LIKE ? LIMIT 8`,
        [weddingId, like]
      ),
      db.getAllAsync<{ id: string; title: string }>(
        `SELECT id, title FROM invitations WHERE wedding_id = ? AND title LIKE ? LIMIT 8`,
        [weddingId, like]
      ),
      db.getAllAsync<{ id: string; title: string }>(
        `SELECT id, title FROM announcements WHERE wedding_id = ? AND title LIKE ? LIMIT 8`,
        [weddingId, like]
      ),
    ]);

    const results: SearchResult[] = [];
    guests.forEach(g => results.push({ id: g.id, title: g.full_name, subtitle: g.phone || undefined, entityType: 'Guest', route: `/(tabs)/guests/${g.id}` }));
    events.forEach(e => results.push({ id: e.id, title: e.name, subtitle: e.date || undefined, entityType: 'Event', route: `/(tabs)/events/${e.id}` }));
    vendors.forEach(v => results.push({ id: v.id, title: v.name, subtitle: v.category, entityType: 'Vendor', route: `/(tabs)/vendors/${v.id}` }));
    rooms.forEach(r => results.push({ id: r.id, title: `Room ${r.room_number}`, subtitle: r.hotel_name, entityType: 'Room', route: `/(tabs)/rooms/${r.id}` }));
    expenses.forEach(e => results.push({ id: e.id, title: e.title, subtitle: `₹${e.amount.toLocaleString('en-IN')}`, entityType: 'Expense', route: '/(tabs)/finance' }));
    tasks.forEach(t => results.push({ id: t.id, title: t.title, subtitle: t.status, entityType: 'Task', route: '/(tabs)/tasks' }));
    invitations.forEach(i => results.push({ id: i.id, title: i.title, entityType: 'Invitation', route: `/(tabs)/patrika/${i.id}` }));
    announcements.forEach(a => results.push({ id: a.id, title: a.title, entityType: 'Announcement', route: '/(tabs)/announcements' }));

    return results;
  },
};
