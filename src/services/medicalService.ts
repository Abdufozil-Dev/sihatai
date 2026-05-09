import { Clinic, Doctor, PaymentRequest, Notification } from '../types';

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
    if (error instanceof Error) throw error;
    throw new Error('An unexpected network error occurred');
  }
}

export const medicalService = {
  async getClinics(): Promise<Clinic[]> {
    return await api<Clinic[]>('/api/clinics');
  },

  async getDoctors(clinicId?: string): Promise<Doctor[]> {
    const url = clinicId ? `/api/doctors?clinicId=${encodeURIComponent(clinicId)}` : '/api/doctors';
    return await api<Doctor[]>(url);
  },

  async createPaymentRequest(data: Partial<PaymentRequest>): Promise<PaymentRequest> {
    return await api<PaymentRequest>('/api/payment-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async getNotifications(userId: string): Promise<Notification[]> {
    return await api<Notification[]>(`/api/notifications?userId=${encodeURIComponent(userId)}`);
  },

  async getChatHistory(userId: string, expertId?: string): Promise<any[]> {
    const url = expertId ? `/api/chat-history?userId=${encodeURIComponent(userId)}&expertId=${encodeURIComponent(expertId)}` : `/api/chat-history?userId=${encodeURIComponent(userId)}`;
    return await api<any[]>(url);
  },

  async saveChatMessage(data: { userId: string; expertId: string; role: string; content: string }): Promise<any> {
    return await api<any>('/api/chat-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }
};
