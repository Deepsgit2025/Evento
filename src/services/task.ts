import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Task } from '../database/types';
import { ReminderService } from './reminder';
import { SyncEngine } from './syncEngine';

export interface TaskDTO {
  title: string;
  description?: string | null;
  due_date?: string | null;
  reminder_time?: number | null;
  reminder_lead_minutes?: number | null;
  reminder_style?: 'ALARM' | 'MESSAGE' | null;
}

export const DEFAULT_REMINDER_LEAD_MINUTES = 5;

/**
 * Schedules the task's alarm `lead` minutes ahead of the task time, so the
 * user is warned before it's due rather than as it comes due.
 */
async function scheduleTaskReminder(
  db: SQLiteDatabase,
  weddingId: string,
  taskId: string,
  data: TaskDTO
): Promise<string | null> {
  if (!data.reminder_time || !data.reminder_style) return null;

  const lead = data.reminder_lead_minutes ?? DEFAULT_REMINDER_LEAD_MINUTES;
  const fireAt = data.reminder_time - lead * 60;
  const notes = lead > 0
    ? `Starts in ${lead} minutes${data.description ? ` — ${data.description}` : ''}`
    : data.description || null;

  return ReminderService.createReminder(db, {
    wedding_id: weddingId,
    type: 'TASK',
    reference_id: taskId,
    title: data.title,
    notes,
    reminder_time: fireAt,
  }, data.reminder_style);
}

export const TaskService = {
  async getTasks(db: SQLiteDatabase, weddingId: string): Promise<Task[]> {
    return db.getAllAsync<Task>(
      `SELECT * FROM tasks WHERE wedding_id = ? AND deleted_at IS NULL ORDER BY
        (status = 'DONE') ASC,
        (reminder_time IS NULL) ASC, reminder_time ASC,
        created_at DESC`,
      [weddingId]
    );
  },

  async getTaskById(db: SQLiteDatabase, id: string): Promise<Task | null> {
    return db.getFirstAsync<Task>(`SELECT * FROM tasks WHERE id = ? LIMIT 1`, [id]);
  },

  async createTask(db: SQLiteDatabase, weddingId: string, data: TaskDTO): Promise<Task> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const reminderId = await scheduleTaskReminder(db, weddingId, id, data);

    await db.runAsync(
      `INSERT INTO tasks (id, wedding_id, title, description, status, due_date, reminder_time, reminder_lead_minutes, reminder_style, reminder_id, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, 'TODO', ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [id, weddingId, data.title, data.description || null, data.due_date || null, data.reminder_time || null,
        data.reminder_lead_minutes ?? DEFAULT_REMINDER_LEAD_MINUTES, data.reminder_style || null, reminderId, now, now]
    );

    await SyncEngine.markPending(db, 'tasks', id, 'CREATE');
    return this.getTaskById(db, id) as Promise<Task>;
  },

  async updateTask(db: SQLiteDatabase, id: string, weddingId: string, data: TaskDTO): Promise<Task> {
    const existing = await this.getTaskById(db, id);
    const now = Math.floor(Date.now() / 1000);

    // Replace any existing reminder if the time/style changed
    if (existing?.reminder_id) {
      await ReminderService.cancelReminder(db, existing.reminder_id);
    }
    const reminderId = await scheduleTaskReminder(db, weddingId, id, data);

    await db.runAsync(
      `UPDATE tasks SET title = ?, description = ?, due_date = ?, reminder_time = ?, reminder_lead_minutes = ?, reminder_style = ?, reminder_id = ?, updated_at = ? WHERE id = ?`,
      [data.title, data.description || null, data.due_date || null, data.reminder_time || null,
        data.reminder_lead_minutes ?? DEFAULT_REMINDER_LEAD_MINUTES, data.reminder_style || null, reminderId, now, id]
    );

    await SyncEngine.markPending(db, 'tasks', id, 'UPDATE');
    return this.getTaskById(db, id) as Promise<Task>;
  },

  async toggleStatus(db: SQLiteDatabase, id: string): Promise<void> {
    const task = await this.getTaskById(db, id);
    if (!task) return;
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    const now = Math.floor(Date.now() / 1000);

    // Completing a task cancels any pending reminder for it
    if (nextStatus === 'DONE' && task.reminder_id) {
      await ReminderService.cancelReminder(db, task.reminder_id);
    }

    await db.runAsync(`UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?`, [nextStatus, now, id]);
    await SyncEngine.markPending(db, 'tasks', id, 'UPDATE');
  },

  async deleteTask(db: SQLiteDatabase, id: string): Promise<void> {
    const task = await this.getTaskById(db, id);
    if (task?.reminder_id) {
      await ReminderService.cancelReminder(db, task.reminder_id);
    }
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
    await SyncEngine.markPending(db, 'tasks', id, 'DELETE');
  },
};
