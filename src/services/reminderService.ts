async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    const msg = data?.error || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export interface Reminder {
  id?: string;
  userId: string;
  medicineName: string;
  dosage: string;
  time: string;
  days: string[];
  isActive: boolean;
  createdAt: number;
}

export const reminderService = {
  async getUserReminders(userId: string): Promise<Reminder[]> {
    const data = await api<Reminder[]>(`/api/reminders?userId=${encodeURIComponent(userId)}`);
    return data;
  },

  async addReminder(reminder: Omit<Reminder, 'id' | 'createdAt'>): Promise<Reminder | null> {
    const data = await api<{ success: true; reminder: Reminder }>(`/api/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reminder),
    });
    return data.reminder || null;
  },

  async deleteReminder(id: string): Promise<void> {
    await api<{ success: true }>(`/api/reminders/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async toggleReminder(id: string, isActive: boolean): Promise<void> {
    await api<{ success: true }>(`/api/reminders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
  }
};
