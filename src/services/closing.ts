import { SQLiteDatabase } from 'expo-sqlite';

export interface ClosingChecklist {
  pendingVendorPayments: number;
  unreturnedInventory: number;
  damagedOrMissingInventory: number;
  documentsCount: number;
  guestsCheckedInPercent: number;
  tasksRemaining: number;
  completionPercent: number;
  isClosed: boolean;
  closedAt: number | null;
}

export const ClosingService = {
  async getChecklist(db: SQLiteDatabase, weddingId: string): Promise<ClosingChecklist> {
    const pendingVendorPayments = (await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM vendors v WHERE v.wedding_id = ? AND v.deleted_at IS NULL
       AND v.agreed_amount > COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.vendor_id = v.id), 0)`,
      [weddingId]
    ))?.count || 0;

    const inventoryIssues = await db.getFirstAsync<{ damaged: number; unreturned: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('DAMAGED', 'MISSING') THEN 1 ELSE 0 END), 0) as damaged,
         COALESCE(SUM(CASE WHEN available_quantity < quantity THEN 1 ELSE 0 END), 0) as unreturned
       FROM inventory_items WHERE wedding_id = ? AND deleted_at IS NULL`,
      [weddingId]
    );

    const documentsCount = (await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM documents WHERE wedding_id = ?`,
      [weddingId]
    ))?.count || 0;

    const guests = await db.getFirstAsync<{ total: number; checkedIn: number }>(
      `SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN checked_in_at IS NOT NULL THEN 1 ELSE 0 END), 0) as checkedIn FROM guests WHERE wedding_id = ?`,
      [weddingId]
    );
    const guestsCheckedInPercent = guests && guests.total > 0 ? Math.round((guests.checkedIn / guests.total) * 100) : 100;

    const tasksRemaining = (await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM tasks WHERE wedding_id = ? AND status != 'DONE'`,
      [weddingId]
    ))?.count || 0;

    const wedding = await db.getFirstAsync<{ closed_at: number | null }>(
      `SELECT closed_at FROM weddings WHERE id = ?`,
      [weddingId]
    );

    const checks = [
      pendingVendorPayments === 0,
      (inventoryIssues?.damaged || 0) === 0,
      (inventoryIssues?.unreturned || 0) === 0,
      tasksRemaining === 0,
      guestsCheckedInPercent === 100,
    ];
    const completionPercent = Math.round((checks.filter(Boolean).length / checks.length) * 100);

    return {
      pendingVendorPayments,
      unreturnedInventory: inventoryIssues?.unreturned || 0,
      damagedOrMissingInventory: inventoryIssues?.damaged || 0,
      documentsCount,
      guestsCheckedInPercent,
      tasksRemaining,
      completionPercent,
      isClosed: !!wedding?.closed_at,
      closedAt: wedding?.closed_at ?? null,
    };
  },

  async closeWedding(db: SQLiteDatabase, weddingId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE weddings SET closed_at = ?, updated_at = ? WHERE id = ?`, [now, now, weddingId]);
  },

  async reopenWedding(db: SQLiteDatabase, weddingId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE weddings SET closed_at = NULL, updated_at = ? WHERE id = ?`, [now, weddingId]);
  },
};
