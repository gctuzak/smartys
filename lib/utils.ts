import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toTurkishLikePattern(text: string): string {
    return text
        .replace(/[iıİI]/g, '_')   // Handle I/i/ı/İ case issues
        .replace(/[şŞ]/g, '_')     // Handle Ş/ş encoding issues
        .replace(/[ğĞ]/g, '_')     // Handle Ğ/ğ encoding issues
        .replace(/[üÜ]/g, '_')     // Handle Ü/ü encoding issues
        .replace(/[öÖ]/g, '_')     // Handle Ö/ö encoding issues
        .replace(/[çÇ]/g, '_');    // Handle Ç/ç encoding issues
}
