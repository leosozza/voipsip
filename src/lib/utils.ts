import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stripBrazilDDI(phone: string): string {
  let n = phone.replace(/\D/g, '');
  if (n.startsWith('55') && n.length >= 12) {
    n = n.slice(2);
  }
  return n;
}
