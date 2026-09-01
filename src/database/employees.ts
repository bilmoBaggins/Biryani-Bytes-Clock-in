import { getDatabase } from "./database";
import { Employee } from "../types";

const HOURLY_RATE = 12.0; // £12 per hour

function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function generateUniqueCode(): Promise<string> {
  const db = getDatabase();
  let code = generateCode();
  let existing = await db.getFirstAsync(
    "SELECT id FROM employees WHERE code = ?",
    [code]
  );
  while (existing) {
    code = generateCode();
    existing = await db.getFirstAsync(
      "SELECT id FROM employees WHERE code = ?",
      [code]
    );
  }
  return code;
}

export async function initializeEmployees() {
  const db = getDatabase();
  const employees = ["Bilal", "Juweria", "Yusuf"];

  for (const name of employees) {
    try {
      const code = await generateUniqueCode();
      await db.runAsync(
        "INSERT INTO employees (name, hourly_rate, code) VALUES (?, ?, ?)",
        [name, HOURLY_RATE, code]
      );
    } catch (error: any) {
      if (!error.message.includes("UNIQUE constraint failed")) {
        throw error;
      }
      // Employee already exists, skip
    }
  }

  // Backfill codes for employees created before PIN codes existed
  const missingCodes = await db.getAllAsync<{ id: number }>(
    "SELECT id FROM employees WHERE code IS NULL OR code = ''"
  );
  for (const emp of missingCodes) {
    const code = await generateUniqueCode();
    await db.runAsync("UPDATE employees SET code = ? WHERE id = ?", [
      code,
      emp.id,
    ]);
  }
}

export async function getEmployees(): Promise<Employee[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<Employee & { isClockedIn: number }>(
    "SELECT id, name, hourly_rate as hourlyRate, code, is_clocked_in as isClockedIn FROM employees ORDER BY name"
  );
  return rows.map((row) => ({ ...row, isClockedIn: !!row.isClockedIn }));
}

export async function getEmployeeByName(name: string): Promise<Employee | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<Employee & { isClockedIn: number }>(
    "SELECT id, name, hourly_rate as hourlyRate, code, is_clocked_in as isClockedIn FROM employees WHERE name = ?",
    [name]
  );
  return row ? { ...row, isClockedIn: !!row.isClockedIn } : null;
}

export async function addEmployee(
  name: string,
  hourlyRate: number = HOURLY_RATE
): Promise<string> {
  const db = getDatabase();
  const code = await generateUniqueCode();
  await db.runAsync(
    "INSERT INTO employees (name, hourly_rate, code) VALUES (?, ?, ?)",
    [name, hourlyRate, code]
  );
  return code;
}

export async function updateHourlyRate(employeeId: number, hourlyRate: number) {
  const db = getDatabase();
  await db.runAsync("UPDATE employees SET hourly_rate = ? WHERE id = ?", [
    hourlyRate,
    employeeId,
  ]);
}

export async function updateEmployeeCode(employeeId: number, code: string) {
  const db = getDatabase();
  const existing = await db.getFirstAsync(
    "SELECT id FROM employees WHERE code = ? AND id != ?",
    [code, employeeId]
  );
  if (existing) {
    throw new Error("That code is already in use by another employee.");
  }
  await db.runAsync("UPDATE employees SET code = ? WHERE id = ?", [
    code,
    employeeId,
  ]);
}

export async function deleteEmployee(employeeId: number) {
  const db = getDatabase();
  await db.runAsync("DELETE FROM employees WHERE id = ?", [employeeId]);
}
