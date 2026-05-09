export interface User {
  uid: string;
  telegramId: string;
  displayName: string;
  username?: string;
  photoURL?: string;
  role: 'user' | 'admin';
  dailyRequestCount: number;
  lastRequestDate: string;
  isBlocked: boolean;
  createdAt: any;
  weight?: string | number;
  height?: string | number;
  age?: string | number;
  gender?: string;
  bloodPressure?: string;
  pulse?: string;
}

export interface Consultation {
  id: string;
  userId: string;
  symptoms: string;
  aiResponse: string;
  recommendedClinics?: string[];
  createdAt: any;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experience?: string;
  phone?: string;
  clinicId: string;
  photo_url?: string;
  education?: string;
  bio?: string;
  availability?: string[]; // e.g., ["09:00", "10:00", ...]
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  photo_url?: string;
  description?: string;
  working_hours?: string;
  location_url?: string;
  location?: { lat: number; lng: number };
  doctors: Doctor[];
  services: string[];
  createdAt?: any;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  time: string;
  days: string[];
  isActive: boolean;
}

export interface DoctorAssignment {
  id: string;
  telegramId: string;
  name: string;
  department: string; // e.g., 'Terapevt', 'Kardiolog'
  icon: string; // emoji icon
}

export interface Settings {
  aiSystemPrompt: string;
  basicLimit: number;
  proLimit: number;
  doctorSectionTitle?: string;
  doctorSectionDescription?: string;
  doctorSectionTags?: string[];
  doctorSectionIcon?: string;
  doctorBotToken?: string;
  doctorAssignments?: DoctorAssignment[];
  broadcast?: string;
}
