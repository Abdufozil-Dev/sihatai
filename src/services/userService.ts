import { User } from '../types';

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, init);
    const data = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      const msg = data?.error || `Request failed: ${res.status}`;
      throw new Error(msg);
    }
    return data as T;
  } catch (error) {
    // In production, you might want to log this to a service like Sentry
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected network error occurred');
  }
}

export const userService = {
  async getProfile(uid: string): Promise<User | null> {
    const data = await api<User | null>(`/api/users/${encodeURIComponent(uid)}`);
    return data;
  },

  async updateProfile(uid: string, data: Partial<User>): Promise<void> {
    await api<{ success: true }>(`/api/users/${encodeURIComponent(uid)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async getSettings(): Promise<any> {
    return await api<any>('/api/settings');
  }
};
