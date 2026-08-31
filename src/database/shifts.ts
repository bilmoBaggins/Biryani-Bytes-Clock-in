import { getDatabase } from "./database";
import { getEmployeeByName } from "./employees";
import { Shift } from "../types";

export async function clockInOut(employeeName: string): Promise<{
  status: "clockedIn" | "clockedOut";
  message: string;
}> {
  const db = getDatabase();
  const employee = await getEmployeeByName(employeeName);

  if (!employee) {
    throw new Error(`Employee ${employeeName} not found`);
  }

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const now = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }); // HH:mm

  // Check if employee has an entry for today
  const existingShift = await db.getFirstAsync<{
    id: number;
    clock_out_time: string | null;
  }>(
    "SELECT id, clock_out_time FROM shifts WHERE employee_id = ? AND date = ?",
    [employee.id, today]
  );

  if (!existingShift) {
    // New entry - Clock IN
    await db.runAsync(
      `INSERT INTO shifts (employee_id, employee_name, date, clock_in_time, clock_out_time, hourly_pay)
       VALUES (?, ?, ?, ?, NULL, NULL)`,
      [employee.id, employeeName, today, now]
    );
    return {
      status: "clockedIn",
      message: `${employeeName} clocked in at ${now}`,
    };
  }

  if (existingShift.clock_out_time === null) {
    // Clock OUT and calculate pay
    await db.runAsync(
      `UPDATE shifts SET clock_out_time = ? WHERE id = ?`,
      [now, existingShift.id]
    );

    // Calculate hourly pay
    const shiftData = await db.getFirstAsync<{
      clock_in_time: string;
      clock_out_time: string;
    }>(
      `SELECT clock_in_time, clock_out_time FROM shifts WHERE id = ?`,
      [existingShift.id]
    );

    if (shiftData) {
      const hours = calculateHours(shiftData.clock_in_time, now);
      const pay = hours * employee.hourlyRate;

      await db.runAsync(
        `UPDATE shifts SET hourly_pay = ? WHERE id = ?`,
        [pay, existingShift.id]
      );
    }

    return {
      status: "clockedOut",
      message: `${employeeName} clocked out at ${now}`,
    };
  }

  // Already clocked out - treat as a new clock in
  await db.runAsync(
    `INSERT INTO shifts (employee_id, employee_name, date, clock_in_time, clock_out_time, hourly_pay)
     VALUES (?, ?, ?, ?, NULL, NULL)`,
    [employee.id, employeeName, today, now]
  );
  return {
    status: "clockedIn",
    message: `${employeeName} clocked in at ${now}`,
  };
}

export async function getTodayShifts(): Promise<Shift[]> {
  const db = getDatabase();
  const today = new Date().toISOString().split("T")[0];

  const result = await db.getAllAsync<any>(
    `SELECT 
      id, employee_id as employeeId, employee_name as employeeName, 
      date, clock_in_time as clockInTime, clock_out_time as clockOutTime, 
      hourly_pay as hourlyPay
     FROM shifts WHERE date = ? ORDER BY clock_in_time DESC`,
    [today]
  );

  return result;
}

export async function getShiftsByEmployee(employeeName: string): Promise<Shift[]> {
  const db = getDatabase();

  const result = await db.getAllAsync<any>(
    `SELECT 
      id, employee_id as employeeId, employee_name as employeeName, 
      date, clock_in_time as clockInTime, clock_out_time as clockOutTime, 
      hourly_pay as hourlyPay
     FROM shifts WHERE employee_name = ? ORDER BY date DESC, clock_in_time DESC`,
    [employeeName]
  );

  return result;
}

export async function getShiftsByMonth(month: string): Promise<Shift[]> {
  const db = getDatabase();
  // month format: YYYY-MM

  const result = await db.getAllAsync<any>(
    `SELECT 
      id, employee_id as employeeId, employee_name as employeeName, 
      date, clock_in_time as clockInTime, clock_out_time as clockOutTime, 
      hourly_pay as hourlyPay
     FROM shifts WHERE date LIKE ? AND clock_out_time IS NOT NULL 
     ORDER BY date DESC, clock_in_time DESC`,
    [`${month}%`]
  );

  return result;
}

export async function getCurrentStatus(
  employeeName: string
): Promise<"clockedIn" | "clockedOut" | "notWorking"> {
  const db = getDatabase();
  const today = new Date().toISOString().split("T")[0];

  const shift = await db.getFirstAsync<{ clock_out_time: string | null }>(
    `SELECT clock_out_time FROM shifts 
     WHERE employee_name = ? AND date = ? 
     ORDER BY clock_in_time DESC LIMIT 1`,
    [employeeName, today]
  );

  if (!shift) {
    return "notWorking";
  }

  return shift.clock_out_time === null ? "clockedIn" : "clockedOut";
}

function calculateHours(clockInTime: string, clockOutTime: string): number {
  // Parse times in HH:mm format
  const [inHours, inMinutes] = clockInTime.split(":").map(Number);
  const [outHours, outMinutes] = clockOutTime.split(":").map(Number);

  const inTotalMinutes = inHours * 60 + inMinutes;
  const outTotalMinutes = outHours * 60 + outMinutes;

  // Handle case where clock-out might be next day
  let diffMinutes = outTotalMinutes - inTotalMinutes;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // Add 24 hours if negative
  }

  return diffMinutes / 60;
}
