import * as SQLite from 'expo-sqlite';
import { SCHEMA_STATEMENTS } from './schema';
import { setupMigrations } from './migrations';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('evento.db');
  }
  return db;
};

export const initializeDatabase = async (database: SQLite.SQLiteDatabase) => {
  try {
    // We run the schema generation statements inside a transaction to ensure atomic setup
    await database.withTransactionAsync(async () => {
      for (const statement of SCHEMA_STATEMENTS) {
        await database.execAsync(statement);
      }
    });

    // Run any migrations
    await setupMigrations(database);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};
