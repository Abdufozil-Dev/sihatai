import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isPlaceholderName = (value?: string | null) => {
  const normalized = (value || '').trim().toLowerCase();
  return !normalized || normalized === 'noma\'lum' || normalized === 'nomalum' || normalized === 'foydalanuvchi';
};
