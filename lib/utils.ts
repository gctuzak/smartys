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

export function formatCurrency(amount: number | string | null | undefined, currencyCode: string | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  
  let code = currencyCode || 'EUR';
  // Common fixes for currency codes
  if (code === 'TL') code = 'TRY';
  if (code === '€') code = 'EUR';
  if (code === '$') code = 'USD';
  
  try {
    return Number(amount).toLocaleString('tr-TR', { style: 'currency', currency: code });
  } catch (error) {
    console.warn(`Invalid currency code: ${code}, falling back to TRY`);
    return Number(amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
  }
}
