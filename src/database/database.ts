import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "biryani_bytes.db";

let db: SQLite.SQLiteDatabase | null = null;

export async function initializeDatabase() {
  try {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Create employees table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        hourly_rate REAL DEFAULT 12.0,
        code TEXT,
        is_clocked_in INTEGER DEFAULT 0
      );
    `);

    // Migration: add code column for databases created before PIN codes existed
    try {
      await db.execAsync(`ALTER TABLE employees ADD COLUMN code TEXT;`);
    } catch (error: any) {
      if (!error.message?.includes("duplicate column")) {
        throw error;
      }
    }

    // Migration: add is_clocked_in column for databases created before status tracking existed
    try {
      await db.execAsync(`ALTER TABLE employees ADD COLUMN is_clocked_in INTEGER DEFAULT 0;`);
    } catch (error: any) {
      if (!error.message?.includes("duplicate column")) {
        throw error;
      }
    }

    // Create shifts table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        employee_name TEXT NOT NULL,
        date TEXT NOT NULL,
        clock_in_time TEXT NOT NULL,
        clock_out_time TEXT,
        hourly_pay REAL,
        FOREIGN KEY(employee_id) REFERENCES employees(id)
      );
    `);

    // Create settings table (single row) to hold the admin PIN
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        admin_pin TEXT NOT NULL DEFAULT '1234'
      );
    `);
    await db.runAsync(
      `INSERT OR IGNORE INTO settings (id, admin_pin) VALUES (1, '1234')`
    );

    console.log("Database initialized successfully");
    return db;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  return db;
}

export async function closeDatabase() {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
