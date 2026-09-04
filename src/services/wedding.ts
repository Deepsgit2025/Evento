import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Wedding } from '../database/types';
import { AuthService, SignUpDTO } from './auth';

export interface CreateWeddingDTO {
  bride_name: string;
  groom_name: string;
  date: string;
  venue: string;
  cover_photo_uri?: string;
}

export async function setupAccountAndWedding(
  db: SQLiteDatabase, 
  managerData: SignUpDTO, 
  weddingData: CreateWeddingDTO
): Promise<{ user_id: string, wedding_id: string }> {
  
  let userId = '';
  let weddingId = '';
  
  await db.withTransactionAsync(async () => {
    // 1. Create the User (Manager)
    const user = await AuthService.signUp(db, managerData);
    userId = user.id;

    // 2. Create the Wedding
    weddingId = Crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    
    await db.runAsync(
      `INSERT INTO weddings (id, bride_name, groom_name, date, venue, cover_photo_uri, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        weddingId,
        weddingData.bride_name,
        weddingData.groom_name,
        weddingData.date,
        weddingData.venue,
        weddingData.cover_photo_uri || null,
        timestamp,
        timestamp,
      ]
    );

    // 3. Create the Wedding Member link (Role: MANAGER)
    const memberId = Crypto.randomUUID();
    await db.runAsync(
      `INSERT INTO wedding_members (id, user_id, wedding_id, role, created_at) VALUES (?, ?, ?, ?, ?)`,
      [memberId, userId, weddingId, 'MANAGER', timestamp]
    );
  });

  return { user_id: userId, wedding_id: weddingId };
}

export async function getWedding(db: SQLiteDatabase, id: string): Promise<Wedding | null> {
  return await db.getFirstAsync<Wedding>(`SELECT * FROM weddings WHERE id = ? LIMIT 1`, [id]);
}

export async function getUserWedding(db: SQLiteDatabase, userId: string): Promise<Wedding | null> {
  const member = await db.getFirstAsync<{wedding_id: string}>(
    `SELECT wedding_id FROM wedding_members WHERE user_id = ? LIMIT 1`, 
    [userId]
  );
  if (!member) return null;
  return getWedding(db, member.wedding_id);
}

export async function updateWedding(db: SQLiteDatabase, id: string, data: Partial<Wedding>) {
  const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = Object.values(data);
  await db.runAsync(`UPDATE weddings SET ${sets}, updated_at = ? WHERE id = ?`, [...values, Math.floor(Date.now() / 1000), id]);
}