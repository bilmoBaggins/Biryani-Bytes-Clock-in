import { getDatabase } from "./database";
import { requestBackgroundSync } from "../cloud/sync";

export async function getAdminPin(): Promise<string> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ admin_pin: string }>(
    "SELECT admin_pin FROM settings WHERE id = 1"
  );
  return row?.admin_pin ?? "1234";
}

export async function setAdminPin(pin: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync("UPDATE settings SET admin_pin = ? WHERE id = 1", [pin]);
  requestBackgroundSync();
}
