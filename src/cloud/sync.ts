import { getDatabase } from "../database/database";
import { cloudSyncConfigured, supabase } from "./supabase";

let syncInProgress = false;

export async function initializeCloudSync(): Promise<void> {
  if (!cloudSyncConfigured || !supabase) return;

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    await supabase.auth.signInAnonymously();
  }
}

export async function syncLocalDatabase(): Promise<void> {
  if (!cloudSyncConfigured || !supabase || syncInProgress) return;

  syncInProgress = true;
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;

    const db = getDatabase();
    const employees = await db.getAllAsync<any>(
      "SELECT id, name, hourly_rate as hourlyRate, code, is_clocked_in as isClockedIn FROM employees"
    );
    const shifts = await db.getAllAsync<any>(
      "SELECT id, employee_id as employeeId, employee_name as employeeName, date, clock_in_time as clockInTime, clock_out_time as clockOutTime, hourly_pay as hourlyPay FROM shifts"
    );
    const setting = await db.getFirstAsync<{ admin_pin: string }>(
      "SELECT admin_pin FROM settings WHERE id = 1"
    );

    const employeeRows = employees.map((employee) => ({
      user_id: userId,
      local_id: employee.id,
      name: employee.name,
      hourly_rate: employee.hourlyRate,
      code: employee.code,
      is_clocked_in: Boolean(employee.isClockedIn),
    }));
    const shiftRows = shifts.map((shift) => ({
      user_id: userId,
      local_id: shift.id,
      employee_id: shift.employeeId,
      employee_name: shift.employeeName,
      date: shift.date,
      clock_in_time: shift.clockInTime,
      clock_out_time: shift.clockOutTime,
      hourly_pay: shift.hourlyPay,
    }));

    if (employeeRows.length) {
      const { error } = await supabase.from("device_employees").upsert(employeeRows);
      if (error) throw error;
    }
    if (shiftRows.length) {
      const { error } = await supabase.from("device_shifts").upsert(shiftRows);
      if (error) throw error;
    }
    if (setting) {
      const { error } = await supabase.from("device_settings").upsert({
        user_id: userId,
        admin_pin: setting.admin_pin,
      });
      if (error) throw error;
    }
  } finally {
    syncInProgress = false;
  }
}

export function requestBackgroundSync(): void {
  void syncLocalDatabase().catch(() => {
    // Offline operation is expected; the next app refresh retries the backup.
  });
}
