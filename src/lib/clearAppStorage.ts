/** Ilova tomonidan ishlatiladigan localStorage kalitlari — tozalash uchun */

const FIXED_KEYS = [
  'reminders',
  'clinics',
  'admin_settings',
  'admin_broadcast',
  'local_consultations',
  'local_orders',
  'last_seen_announcement_text',
  'health_weight',
  'health_height',
  'health_bp',
  'health_pulse',
];

/**
 * Brauzer localStorage dagi ilova ma'lumotlarini o‘chiradi.
 * @returns o‘chirilgan kalitlar ro‘yxati
 */
export function clearAllAppLocalStorage(): string[] {
  const removed: string[] = [];

  for (const key of FIXED_KEYS) {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      removed.push(key);
    }
  }

  const profileKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('user_profile_')) profileKeys.push(key);
  }
  for (const key of profileKeys) {
    localStorage.removeItem(key);
    removed.push(key);
  }

  return removed;
}
