import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Expense } from '../database/types';

export interface ExpenseDTO {
  title: string;
  category: string;
  amount: number;
  date: string;
  payment_method: string;
  notes?: string;
}

export interface OverallFinancialSummary {
  budget: number | null;
  vendorAgreedTotal: number;
  vendorPaidTotal: number;
  vendorPendingTotal: number;
  generalExpensesTotal: number;
  totalSpend: number;
  remainingBudget: number | null;
  vendorCount: number;
}

export const FinanceService = {
  // ==========================================
  // GENERAL EXPENSES CRUD
  // ==========================================
  
  async addExpense(db: SQLiteDatabase, weddingId: string, data: ExpenseDTO): Promise<Expense> {
    if (data.amount <= 0) {
      throw new Error("Expense amount must be strictly positive.");
    }
    
    const id = Crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    await db.runAsync(
      `INSERT INTO expenses (id, wedding_id, title, category, amount, date, payment_method, notes, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, weddingId, data.title, data.category, data.amount, data.date, data.payment_method, data.notes || null, timestamp, timestamp]
    );

    return this.getExpenseById(db, id) as Promise<Expense>;
  },

  async updateExpense(db: SQLiteDatabase, id: string, data: ExpenseDTO): Promise<Expense> {
    if (data.amount <= 0) {
      throw new Error("Expense amount must be strictly positive.");
    }

    const timestamp = Math.floor(Date.now() / 1000);

    await db.runAsync(
      `UPDATE expenses SET title = ?, category = ?, amount = ?, date = ?, payment_method = ?, notes = ?, updated_at = ? WHERE id = ?`,
      [data.title, data.category, data.amount, data.date, data.payment_method, data.notes || null, timestamp, id]
    );

    return this.getExpenseById(db, id) as Promise<Expense>;
  },

  async deleteExpense(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
  },

  async getExpenseById(db: SQLiteDatabase, id: string): Promise<Expense | null> {
    return await db.getFirstAsync<Expense>(
      `SELECT * FROM expenses WHERE id = ? LIMIT 1`,
      [id]
    );
  },

  async getExpenses(db: SQLiteDatabase, weddingId: string): Promise<Expense[]> {
    return await db.getAllAsync<Expense>(
      `SELECT * FROM expenses WHERE wedding_id = ? ORDER BY date DESC, created_at DESC`,
      [weddingId]
    );
  },

  // ==========================================
  // BUDGET MANAGEMENT
  // ==========================================

  async updateBudget(db: SQLiteDatabase, weddingId: string, budget: number | null): Promise<void> {
    if (budget !== null && budget < 0) {
      throw new Error("Budget cannot be negative.");
    }
    const timestamp = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `UPDATE weddings SET budget = ?, updated_at = ? WHERE id = ?`,
      [budget, timestamp, weddingId]
    );
  },

  // ==========================================
  // AI QUERY FUNCTIONS & SUMMARIES
  // ==========================================

  async getVendorTotalAgreed(db: SQLiteDatabase, weddingId: string): Promise<number> {
    const row = await db.getFirstAsync<{total: number}>(
      `SELECT SUM(agreed_amount) as total FROM vendors WHERE wedding_id = ?`,
      [weddingId]
    );
    return row?.total || 0;
  },

  async getVendorTotalPaid(db: SQLiteDatabase, weddingId: string): Promise<number> {
    const row = await db.getFirstAsync<{total: number}>(
      `SELECT SUM(amount) as total FROM payments WHERE wedding_id = ?`,
      [weddingId]
    );
    return row?.total || 0;
  },

  async getGeneralExpensesTotal(db: SQLiteDatabase, weddingId: string): Promise<number> {
    const row = await db.getFirstAsync<{total: number}>(
      `SELECT SUM(amount) as total FROM expenses WHERE wedding_id = ?`,
      [weddingId]
    );
    return row?.total || 0;
  },

  async getVendorCount(db: SQLiteDatabase, weddingId: string): Promise<number> {
    const row = await db.getFirstAsync<{count: number}>(
      `SELECT COUNT(*) as count FROM vendors WHERE wedding_id = ?`,
      [weddingId]
    );
    return row?.count || 0;
  },

  async getOverallFinancialSummary(db: SQLiteDatabase, weddingId: string): Promise<OverallFinancialSummary> {
    // Note: Doing this in a single query transaction or parallel for speed
    const weddingRow = await db.getFirstAsync<{budget: number | null}>(
      `SELECT budget FROM weddings WHERE id = ?`, [weddingId]
    );
    const budget = weddingRow?.budget ?? null;

    const [vendorAgreedTotal, vendorPaidTotal, generalExpensesTotal, vendorCount] = await Promise.all([
      this.getVendorTotalAgreed(db, weddingId),
      this.getVendorTotalPaid(db, weddingId),
      this.getGeneralExpensesTotal(db, weddingId),
      this.getVendorCount(db, weddingId)
    ]);

    const vendorPendingTotal = vendorAgreedTotal - vendorPaidTotal; // Note: can be negative if overpaid
    const totalSpend = vendorPaidTotal + generalExpensesTotal;
    const remainingBudget = budget !== null ? (budget - totalSpend) : null;

    return {
      budget,
      vendorAgreedTotal,
      vendorPaidTotal,
      vendorPendingTotal,
      generalExpensesTotal,
      totalSpend,
      remainingBudget,
      vendorCount
    };
  }
};
