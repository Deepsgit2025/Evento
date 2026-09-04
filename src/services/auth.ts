import { SQLiteDatabase } from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { User } from '../database/types';
import { Platform } from 'react-native';

const SESSION_KEY = 'evento_active_user_id';

export interface SignUpDTO {
  name: string;
  email: string;
  phone?: string;
}

export const AuthService = {
  /**
   * Creates a new local user account.
   * No cloud authentication required — fully offline.
   */
  async signUp(db: SQLiteDatabase, data: SignUpDTO): Promise<User> {
    const id = Crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    // Check if email already exists locally
    const existing = await db.getFirstAsync<User>(
      `SELECT * FROM users WHERE email = ? LIMIT 1`,
      [data.email]
    );

    if (existing) {
      // Just sign them in
      return this.signInLocal(db, existing.id);
    }

    await db.runAsync(
      `INSERT INTO users (id, email, phone, name, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, data.email, data.phone || null, data.name, timestamp]
    );

    // Save session
    await this.saveSession(id);

    return {
      id,
      email: data.email,
      phone: data.phone || null,
      name: data.name,
      created_at: timestamp,
    };
  },

  /**
   * Signs in an existing local user by ID
   */
  async signInLocal(db: SQLiteDatabase, userId: string): Promise<User> {
    const user = await db.getFirstAsync<User>(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (!user) throw new Error('User not found');

    await this.saveSession(user.id);
    return user;
  },

  /**
   * Signs in by email (finds existing user locally)
   */
  async signInByEmail(db: SQLiteDatabase, email: string): Promise<User> {
    const user = await db.getFirstAsync<User>(
      `SELECT * FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    if (!user) throw new Error('No account found with this email on this device.');

    await this.saveSession(user.id);
    return user;
  },

  /**
   * Retrieves the current user from local session
   */
  async getCurrentSession(db: SQLiteDatabase): Promise<User | null> {
    try {
      let activeUserId: string | null = null;
      if (Platform.OS === 'web') {
        activeUserId = localStorage.getItem(SESSION_KEY);
      } else {
        activeUserId = await SecureStore.getItemAsync(SESSION_KEY);
      }
      
      if (!activeUserId) return null;
      
      const user = await db.getFirstAsync<User>(
        `SELECT * FROM users WHERE id = ? LIMIT 1`,
        [activeUserId]
      );
      
      return user || null;
    } catch (error) {
      console.error('Failed to get current session', error instanceof Error ? error.message : String(error));
      return null;
    }
  },

  /**
   * Updates user info
   */
  async updateUser(db: SQLiteDatabase, id: string, data: Partial<User>): Promise<void> {
    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    await db.runAsync(`UPDATE users SET ${sets} WHERE id = ?`, [...values, id]);
  },

  /**
   * Signs out the local user
   */
  async signOut(db: SQLiteDatabase): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(SESSION_KEY);
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
  },

  /**
   * Save session token
   */
  async saveSession(userId: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(SESSION_KEY, userId);
    } else {
      await SecureStore.setItemAsync(SESSION_KEY, userId);
    }
  },

  /**
   * Check if a session exists (without DB lookup)
   */
  async hasSession(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return !!localStorage.getItem(SESSION_KEY);
      }
      const val = await SecureStore.getItemAsync(SESSION_KEY);
      return !!val;
    } catch {
      return false;
    }
  }
};
