import { getDatabase } from "../database/database";
import { DailyPayRecord, MonthlyPayroll } from "../types";

export async function getDailyPayRecord(
  employeeName: string,
  date: string
): Promise<DailyPayRecord | null> {
  const db = getDatabase();

  const result = await db.getFirstAsync<any>(
    `SELECT 
      SUM(CAST(hourly_pay AS REAL)) as totalPay,
      SUM(
        CASE WHEN
          (CAST((SUBSTR(clock_out_time, 1, 2)) AS INTEGER) * 60 +
            CAST((SUBSTR(clock_out_time, 4, 2)) AS INTEGER)) <
          (CAST((SUBSTR(clock_in_time, 1, 2)) AS INTEGER) * 60 +
            CAST((SUBSTR(clock_in_time, 4, 2)) AS INTEGER))
        THEN 1440 ELSE 0 END +
        (CAST((SUBSTR(clock_out_time, 1, 2)) AS INTEGER) * 60 +
          CAST((SUBSTR(clock_out_time, 4, 2)) AS INTEGER)) -
        (CAST((SUBSTR(clock_in_time, 1, 2)) AS INTEGER) * 60 + 
          CAST((SUBSTR(clock_in_time, 4, 2)) AS INTEGER))
      ) / 60.0 as totalHours
     FROM shifts 
     WHERE employee_name = ? AND date = ? AND clock_out_time IS NOT NULL`,
    [employeeName, date]
  );

  if (!result || !result.totalPay) {
    return null;
  }

  return {
    date,
    employeeName,
    totalHours: result.totalHours || 0,
    totalPay: result.totalPay || 0,
  };
}

export async function getMonthlyPayroll(
  employeeName: string,
  month: string
): Promise<MonthlyPayroll | null> {
  const db = getDatabase();
  // month format: YYYY-MM

  const result = await db.getFirstAsync<any>(
    `SELECT 
      SUM(CAST(hourly_pay AS REAL)) as totalPay,
      SUM(
        CASE 
          WHEN clock_out_time IS NOT NULL THEN
            CASE WHEN
              (CAST((SUBSTR(clock_out_time, 1, 2)) AS INTEGER) * 60 +
                CAST((SUBSTR(clock_out_time, 4, 2)) AS INTEGER)) <
              (CAST((SUBSTR(clock_in_time, 1, 2)) AS INTEGER) * 60 +
                CAST((SUBSTR(clock_in_time, 4, 2)) AS INTEGER))
            THEN 1440 ELSE 0 END +
            (CAST((SUBSTR(clock_out_time, 1, 2)) AS INTEGER) * 60 +
             CAST((SUBSTR(clock_out_time, 4, 2)) AS INTEGER)) -
            (CAST((SUBSTR(clock_in_time, 1, 2)) AS INTEGER) * 60 + 
             CAST((SUBSTR(clock_in_time, 4, 2)) AS INTEGER))
          ELSE 0
        END
      ) / 60.0 as totalHours
     FROM shifts 
     WHERE employee_name = ? AND date LIKE ? AND clock_out_time IS NOT NULL`,
    [employeeName, `${month}%`]
  );

  if (!result || !result.totalPay) {
    return null;
  }

  return {
    employeeName,
    month,
    totalHours: result.totalHours || 0,
    totalPay: result.totalPay || 0,
  };
}

export async function getAllMonthlyPayroll(
  month: string
): Promise<MonthlyPayroll[]> {
  const db = getDatabase();
  // month format: YYYY-MM

  const result = await db.getAllAsync<any>(
    `SELECT 
      employee_name as employeeName,
      SUM(CAST(hourly_pay AS REAL)) as totalPay,
      SUM(
        CASE 
          WHEN clock_out_time IS NOT NULL THEN
            (CASE WHEN
              (CAST((SUBSTR(clock_out_time, 1, 2)) AS INTEGER) * 60 +
                CAST((SUBSTR(clock_out_time, 4, 2)) AS INTEGER)) <
              (CAST((SUBSTR(clock_in_time, 1, 2)) AS INTEGER) * 60 +
                CAST((SUBSTR(clock_in_time, 4, 2)) AS INTEGER))
             THEN 1440 ELSE 0 END +
             (CAST((SUBSTR(clock_out_time, 1, 2)) AS INTEGER) * 60 +
              CAST((SUBSTR(clock_out_time, 4, 2)) AS INTEGER)) -
             (CAST((SUBSTR(clock_in_time, 1, 2)) AS INTEGER) * 60 + 
              CAST((SUBSTR(clock_in_time, 4, 2)) AS INTEGER)))
          ELSE 0
        END
      ) / 60.0 as totalHours
     FROM shifts 
     WHERE date LIKE ? AND clock_out_time IS NOT NULL
     GROUP BY employee_name
     ORDER BY employee_name`,
    [`${month}%`]
  );

  return result.map((row: any) => ({
    employeeName: row.employeeName,
    month,
    totalHours: row.totalHours || 0,
    totalPay: row.totalPay || 0,
  }));
}

export function getCurrentMonthRange(): {
  startDate: string;
  endDate: string;
  month: string;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const monthStr = `${year}-${month}`;

  // Start: 1st of current month
  // End: last day of current month
  const startDate = `${year}-${month}-01`;
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const endDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

  return { startDate, endDate, month: monthStr };
}
