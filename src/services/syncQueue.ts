import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

export interface SyncQueueItem {
  id: string;
  entity_type: string;
  entity_id: string;
  operation_type: 'CREATE' | 'UPDATE' | 'DELETE';
  retry_count: number;
  status: 'PENDING' | 'FAILED' | 'CONFLICT';
  error_info: string | null;
  created_at: number;
  last_attempted_at: number;
}

export const SyncQueue = {
  /**
   * Enqueues an operation into the sync queue.
   */
  async enqueue(
    db: SQLite.SQLiteDatabase,
    entityType: string,
    entityId: string,
    operationType: 'CREATE' | 'UPDATE' | 'DELETE'
  ) {
    const id = Crypto.randomUUID();
    
    // If there's an existing PENDING/FAILED operation for this exact entity, we can just let this new one run
    // Alternatively, we could coalesce updates (e.g. if UPDATE is queued and another UPDATE comes in, just keep one).
    // For simplicity and safety, we just insert it. Because we use "reference payloads" in the processor,
    // multiple UPDATEs will just read the same final state.
    
    await db.runAsync(
      `INSERT INTO sync_queue (id, entity_type, entity_id, operation_type)
       VALUES (?, ?, ?, ?)`,
      [id, entityType, entityId, operationType]
    );
  },

  /**
   * Updates an item's status, for instance after a failed retry.
   */
  async updateStatus(
    db: SQLite.SQLiteDatabase,
    id: string,
    status: 'PENDING' | 'FAILED' | 'CONFLICT',
    errorInfo: string | null = null,
    incrementRetry: boolean = false
  ) {
    const now = Math.floor(Date.now() / 1000);
    const retryIncr = incrementRetry ? 1 : 0;
    
    await db.runAsync(
      `UPDATE sync_queue 
       SET status = ?, error_info = ?, last_attempted_at = ?, retry_count = retry_count + ?
       WHERE id = ?`,
      [status, errorInfo, now, retryIncr, id]
    );
  },

  /**
   * Removes a successfully processed item from the queue.
   */
  async remove(db: SQLite.SQLiteDatabase, id: string) {
    await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [id]);
  }
};
