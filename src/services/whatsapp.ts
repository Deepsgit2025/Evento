import { Linking, Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { InvitationCampaign, InvitationRecipient } from '../database/types';

export const WhatsAppService = {
  /**
   * Opens WhatsApp with a pre-filled message using deep linking.
   */
  async openWhatsApp(phoneNumber: string, message: string): Promise<boolean> {
    try {
      const cleanedPhone = phoneNumber.replace(/[^0-9]/g, '');
      const finalPhone = cleanedPhone.length === 10 ? `91${cleanedPhone}` : cleanedPhone;
      const encodedMessage = encodeURIComponent(message);
      
      const url = Platform.select({
        ios: `whatsapp://send?phone=${finalPhone}&text=${encodedMessage}`,
        android: `whatsapp://send?phone=${finalPhone}&text=${encodedMessage}`,
        default: `https://wa.me/${finalPhone}?text=${encodedMessage}`
      });

      const canOpen = await Linking.canOpenURL(url as string);
      
      if (canOpen) {
        await Linking.openURL(url as string);
        return true;
      } else {
        const webUrl = `https://wa.me/${finalPhone}?text=${encodedMessage}`;
        await Linking.openURL(webUrl);
        return true;
      }
    } catch (error) {
      console.error('Failed to open WhatsApp:', error instanceof Error ? error.message : String(error));
      return false;
    }
  },

  // Dummy config to bypass API requirements
  async getConfig(db: SQLite.SQLiteDatabase, weddingId: string): Promise<any> {
    return {
      id: 'dummy',
      wedding_id: weddingId,
      phone_number_id: 'dummy',
      access_token: 'dummy',
      is_active: 1
    };
  },

  async getCampaigns(db: SQLite.SQLiteDatabase, weddingId: string): Promise<InvitationCampaign[]> {
    return db.getAllAsync<InvitationCampaign>(
      `SELECT * FROM invitation_campaigns WHERE wedding_id = ? ORDER BY created_at DESC`,
      [weddingId]
    );
  },

  async getCampaignById(db: SQLite.SQLiteDatabase, id: string): Promise<InvitationCampaign | null> {
    return db.getFirstAsync<InvitationCampaign>(
      `SELECT * FROM invitation_campaigns WHERE id = ?`,
      [id]
    );
  },

  async getCampaignRecipients(db: SQLite.SQLiteDatabase, campaignId: string): Promise<(InvitationRecipient & { guest_name: string })[]> {
    return db.getAllAsync<(InvitationRecipient & { guest_name: string })>(
      `SELECT r.*, g.full_name as guest_name 
       FROM invitation_recipients r 
       JOIN guests g ON r.guest_id = g.id 
       WHERE r.campaign_id = ? 
       ORDER BY r.created_at ASC`,
      [campaignId]
    );
  },

  async getCampaignStats(db: SQLite.SQLiteDatabase, campaignId: string) {
    const result = await db.getAllAsync<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM invitation_recipients WHERE campaign_id = ? GROUP BY status`,
      [campaignId]
    );

    let total = 0;
    let sent = 0;
    let failed = 0;
    let pending = 0;

    result.forEach((r) => {
      total += r.count;
      if (r.status === 'SENT') sent += r.count;
      else if (r.status === 'FAILED') failed += r.count;
      else pending += r.count;
    });

    return { total, sent, failed, pending };
  },

  async markRecipientFailed(db: SQLite.SQLiteDatabase, recipientId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `UPDATE invitation_recipients SET status = 'FAILED', updated_at = ? WHERE id = ?`,
      [now, recipientId]
    );
  },

  async markRecipientSent(db: SQLite.SQLiteDatabase, recipientId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `UPDATE invitation_recipients SET status = 'SENT', sent_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, recipientId]
    );
  },

  async createCampaign(db: SQLite.SQLiteDatabase, weddingId: string, invitationId: string, name: string): Promise<InvitationCampaign> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    await db.runAsync(
      `INSERT INTO invitation_campaigns (id, wedding_id, name, invitation_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'DRAFT', ?, ?)`,
      [id, weddingId, name, invitationId, now, now]
    );
    
    return this.getCampaignById(db, id) as Promise<InvitationCampaign>;
  },

  async assignRecipientsToCampaign(db: SQLite.SQLiteDatabase, campaignId: string, recipientIds: string[]): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    for (const rid of recipientIds) {
      await db.runAsync(
        `UPDATE invitation_recipients SET campaign_id = ?, status = 'QUEUED', updated_at = ? WHERE id = ?`,
        [campaignId, now, rid]
      );
    }
  }
};
