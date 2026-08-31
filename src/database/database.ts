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
        hourly_rate REAL DEFAULT 12.0
      );
    `);

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
