/** Client-only device preference until push/email is wired in a later phase. */
export const NOTIFICATIONS_STORAGE_KEY = "gunanuvad_notifications_enabled";

export function readNotificationsPreference(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) !== "0";
}

export function writeNotificationsPreference(enabled: boolean): void {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, enabled ? "1" : "0");
}
