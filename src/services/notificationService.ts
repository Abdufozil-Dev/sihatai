async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    const msg = data?.error || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  async getUserNotifications(userId: string): Promise<AppNotification[]> {
    const data = await api<any[]>(`/api/notifications?userId=${encodeURIComponent(userId)}`);
    return data.map(n => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      isRead: n.is_read,
      createdAt: n.created_at
    }));
  },

  async markAsRead(id: string): Promise<void> {
    await api<{ success: true }>(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH'
    });
  }
};
