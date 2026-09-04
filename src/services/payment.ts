import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Payment } from '../database/types';

export interface PaymentDTO {
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
}

export interface PaymentSummary {
  agreed: number;
  paid: number;
  remaining: number;
}

export const PaymentService = {
  async addPayment(db: SQLiteDatabase, weddingId: string, vendorId: string, data: PaymentDTO): Promise<Payment> {
    if (data.amount <= 0) {
      throw new Error("Payment amount must be strictly positive.");
    }
    
    const id = Crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    await db.runAsync(
      `INSERT INTO payments (id, wedding_id, vendor_id, amount, payment_date, payment_method, notes, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, weddingId, vendorId, data.amount, data.payment_date, data.payment_method, data.notes || null, timestamp, timestamp]
    );

    return this.getPaymentById(db, id) as Promise<Payment>;
  },

  async getPaymentsForVendor(db: SQLiteDatabase, vendorId: string): Promise<Payment[]> {
    return await db.getAllAsync<Payment>(
      `SELECT * FROM payments WHERE vendor_id = ? ORDER BY payment_date DESC, created_at DESC`,
      [vendorId]
    );
  },

  async getPaymentById(db: SQLiteDatabase, id: string): Promise<Payment | null> {
    return await db.getFirstAsync<Payment>(
      `SELECT * FROM payments WHERE id = ? LIMIT 1`,
      [id]
    );
  },

  async updatePayment(db: SQLiteDatabase, id: string, data: PaymentDTO): Promise<Payment> {
    if (data.amount <= 0) {
      throw new Error("Payment amount must be strictly positive.");
    }

    const timestamp = Math.floor(Date.now() / 1000);

    await db.runAsync(
      `UPDATE payments SET amount = ?, payment_date = ?, payment_method = ?, notes = ?, updated_at = ? WHERE id = ?`,
      [data.amount, data.payment_date, data.payment_method, data.notes || null, timestamp, id]
    );

    return this.getPaymentById(db, id) as Promise<Payment>;
  },

  async deletePayment(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync(`DELETE FROM payments WHERE id = ?`, [id]);
  },

  async getVendorPaymentSummary(db: SQLiteDatabase, vendorId: string): Promise<PaymentSummary> {
    const vendorRow = await db.getFirstAsync<{agreed_amount: number}>(
      `SELECT agreed_amount FROM vendors WHERE id = ?`, [vendorId]
    );
    const agreed = vendorRow ? vendorRow.agreed_amount : 0;

    const paymentRow = await db.getFirstAsync<{total: number}>(
      `SELECT SUM(amount) as total FROM payments WHERE vendor_id = ?`, [vendorId]
    );
    const paid = paymentRow && paymentRow.total ? paymentRow.total : 0;

    return {
      agreed,
      paid,
      remaining: agreed - paid
    };
  }
};
