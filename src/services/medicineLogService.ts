async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    const msg = data?.error || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export interface MedicineLog {
  id: string;
  userId: string;
  reminderId?: string;
  medicineName: string;
  takenAt: string;
}

export const medicineLogService = {
  async logIntake(log: { userId: string; reminderId?: string; medicineName: string }): Promise<MedicineLog | null> {
    const data = await api<{ success: true; log: MedicineLog }>(`/api/medicine-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
    return data.log || null;
  }
};
