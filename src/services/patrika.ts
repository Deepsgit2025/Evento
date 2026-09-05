import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Invitation, InvitationRecipient, InvitationRecipientStatus, Guest, Event } from '../database/types';

export interface PatrikaCustomization {
  event_id?: string;
  custom_bride_name?: string;
  custom_groom_name?: string;
  custom_date?: string;
  custom_venue?: string;
  message: string;
  cover_photo_uri?: string;
  accent_color?: string;
  fontScale?: number;
}

export interface PatrikaDTO {
  template_id: string;
  title: string;
  customization_data: PatrikaCustomization;
}

export const PatrikaService = {
  async createInvitation(db: SQLiteDatabase, weddingId: string, data: PatrikaDTO): Promise<Invitation> {
    const id = Crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    const customDataStr = JSON.stringify(data.customization_data);

    await db.runAsync(
      `INSERT INTO invitations (id, wedding_id, template_id, title, customization_data, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, weddingId, data.template_id, data.title, customDataStr, timestamp, timestamp]
    );

    return this.getInvitationById(db, id) as Promise<Invitation>;
  },

  async updateInvitation(db: SQLiteDatabase, id: string, data: PatrikaDTO): Promise<Invitation> {
    const timestamp = Math.floor(Date.now() / 1000);
    const customDataStr = JSON.stringify(data.customization_data);

    await db.runAsync(
      `UPDATE invitations SET template_id = ?, title = ?, customization_data = ?, updated_at = ? WHERE id = ?`,
      [data.template_id, data.title, customDataStr, timestamp, id]
    );

    return this.getInvitationById(db, id) as Promise<Invitation>;
  },

  async deleteInvitation(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync(`DELETE FROM invitations WHERE id = ?`, [id]);
  },

  async getInvitationById(db: SQLiteDatabase, id: string): Promise<Invitation | null> {
    return await db.getFirstAsync<Invitation>(
      `SELECT * FROM invitations WHERE id = ? LIMIT 1`,
      [id]
    );
  },

  async getInvitationsForWedding(db: SQLiteDatabase, weddingId: string): Promise<Invitation[]> {
    return await db.getAllAsync<Invitation>(
      `SELECT * FROM invitations WHERE wedding_id = ? ORDER BY created_at DESC`,
      [weddingId]
    );
  },

  // RECIPIENT MANAGEMENT

  async addRecipients(db: SQLiteDatabase, invitationId: string, guestIds: string[], eventId: string | null): Promise<number> {
    let addedCount = 0;
    const timestamp = Math.floor(Date.now() / 1000);
    
    for (const guestId of guestIds) {
      try {
        await db.runAsync(
          `INSERT INTO invitation_recipients (id, invitation_id, guest_id, event_id, status, created_at, updated_at) 
           VALUES (?, ?, ?, ?, 'QUEUED', ?, ?)`,
          [Crypto.randomUUID(), invitationId, guestId, eventId, timestamp, timestamp]
        );
        addedCount++;
      } catch (e: any) {
        // Ignore unique constraint violations (already added)
        if (!e.message.includes('UNIQUE')) {
          console.error(e instanceof Error ? e.message : String(e));
        }
      }
    }
    return addedCount;
  },

  async getRecipientsForInvitation(db: SQLiteDatabase, invitationId: string): Promise<(InvitationRecipient & { guest_name: string, event_name: string | null })[]> {
    return await db.getAllAsync<InvitationRecipient & { guest_name: string, event_name: string | null }>(
      `SELECT r.*, g.full_name as guest_name, e.name as event_name 
       FROM invitation_recipients r 
       JOIN guests g ON r.guest_id = g.id 
       LEFT JOIN events e ON r.event_id = e.id 
       WHERE r.invitation_id = ? 
       ORDER BY r.created_at DESC`,
      [invitationId]
    );
  },

  async getAllRecipientsForWedding(db: SQLiteDatabase, weddingId: string): Promise<InvitationRecipient[]> {
    return await db.getAllAsync<InvitationRecipient>(
      `SELECT r.* FROM invitation_recipients r
       JOIN invitations i ON r.invitation_id = i.id
       WHERE i.wedding_id = ?`,
      [weddingId]
    );
  },

  async updateRecipientStatus(db: SQLiteDatabase, recipientId: string, status: InvitationRecipientStatus): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    const sentAt = status === 'SENT' ? timestamp : null;
    
    await db.runAsync(
      `UPDATE invitation_recipients SET status = ?, sent_at = ?, updated_at = ? WHERE id = ?`,
      [status, sentAt, timestamp, recipientId]
    );
  },

  async getInvitationsForGuest(db: SQLiteDatabase, guestId: string): Promise<(InvitationRecipient & { invitation_title: string, template_id: string, event_name: string | null })[]> {
    return await db.getAllAsync<InvitationRecipient & { invitation_title: string, template_id: string, event_name: string | null }>(
      `SELECT r.*, i.title as invitation_title, i.template_id, e.name as event_name 
       FROM invitation_recipients r 
       JOIN invitations i ON r.invitation_id = i.id 
       LEFT JOIN events e ON r.event_id = e.id 
       WHERE r.guest_id = ? 
       ORDER BY r.created_at DESC`,
      [guestId]
    );
  }
};
