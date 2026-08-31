import { getDatabase } from "./database";
import { Employee } from "../types";

const HOURLY_RATE = 12.0; // £12 per hour

export async function initializeEmployees() {
  const db = getDatabase();
  const employees = ["Bilal", "Juweria", "Yusuf"];

  for (const name of employees) {
    try {
      await db.runAsync(
        "INSERT INTO employees (name, hourly_rate) VALUES (?, ?)",
        [name, HOURLY_RATE]
      );
    } catch (error: any) {
      if (!error.message.includes("UNIQUE constraint failed")) {
        throw error;
      }
      // Employee already exists, skip
    }
  }
}

export async function getEmployees(): Promise<Employee[]> {
  const db = getDatabase();
  const result = await db.getAllAsync<Employee>(
    "SELECT id, name, hourly_rate as hourlyRate FROM employees ORDER BY name"
  );
  return result;
}

export async function getEmployeeByName(name: string): Promise<Employee | null> {
  const db = getDatabase();
  const result = await db.getFirstAsync<Employee>(
    "SELECT id, name, hourly_rate as hourlyRate FROM employees WHERE name = ?",
    [name]
  );
  return result || null;
}

export async function addEmployee(name: string, hourlyRate: number = HOURLY_RATE) {
  const db = getDatabase();
  await db.runAsync(
    "INSERT INTO employees (name, hourly_rate) VALUES (?, ?)",
    [name, hourlyRate]
  );
}

export async function updateHourlyRate(employeeId: number, hourlyRate: number) {
  const db = getDatabase();
  await db.runAsync("UPDATE employees SET hourly_rate = ? WHERE id = ?", [
    hourlyRate,
    employeeId,
  ]);
}

export async function deleteEmployee(employeeId: number) {
  const db = getDatabase();
  await db.runAsync("DELETE FROM employees WHERE id = ?", [employeeId]);
}
