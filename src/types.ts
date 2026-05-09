export interface User {
  uid: string;
  displayName: string | null;
  username?: string | null;
  email: string | null;
  photoURL: string | null;
  phone?: string;
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
  bloodGroup?: string;
  bloodPressure?: string;
  pulse?: string;
  chronicDiseases?: string[];
  allergies?: string[];
  subscription?: string;
  expiresAt?: string;
  trialUsed?: boolean;
  dailyRequestCount?: number;
  lastRequestDate?: string;
  isBlocked?: boolean;
  role: 'user' | 'admin';
  createdAt: number;
  updatedAt?: number;
}

export interface Consultation {
  id: string;
  userId: string;
  expertId: string;
  role: string;
  content: string;
  createdAt: number;
}

export interface Doctor {
  id: string;
  clinicId: string;
  name: string;
  specialty: string;
  phone?: string;
  photoUrl?: string;
  experience?: string;
  education?: string;
  bio?: string;
  availability?: string[];
  createdAt: number;
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  phone?: string;
  services: string[];
  photoUrl?: string;
  description?: string;
  workingHours?: string;
  locationUrl?: string;
  doctors?: Doctor[];
  createdAt: number;
}

export interface Reminder {
  id: string;
  userId: string;
  medicineName: string;
  dosage?: string;
  time: string;
  days: string[];
  isActive: boolean;
  createdAt: number;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userDisplayName?: string;
  planName: string;
  amount: string;
  payerName: string;
  screenshotBase64: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  reviewedAt?: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: number;
}

export interface MedicineLog {
  id: string;
  userId: string;
  reminderId?: string;
  medicineName: string;
  takenAt: number;
}

export interface UserActivity {
  id: string;
  userId: string;
  activityType: string;
  details: any;
  createdAt: number;
}

export interface Settings {
  aiSystemPrompt: string;
  basicLimit: number;
  proLimit: number;
}
