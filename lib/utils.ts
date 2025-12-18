import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  
  if (typeof date === 'string') {
      // Check if it's an ISO string without timezone (common from Supabase/Postgres)
      // e.g. 2023-12-18T14:44:00 or 2023-12-18T14:44:00.000
      if (date.includes('T') && !date.endsWith('Z') && !date.includes('+')) {
          return new Date(date + 'Z');
      }
      return new Date(date);
  }
  return new Date(date);
}

export function formatDate(date: Date | string | null | undefined, formatStr: string = "d MMM yyyy"): string {
  const d = parseDate(date);
  if (!d) return '-';
  
  // Turkey is GMT+3 (UTC+3) all year round
  const TR_OFFSET = 3 * 60; // minutes
  const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000); // Convert local to UTC
  const trTime = new Date(utcTime + (TR_OFFSET * 60000)); // Add TR offset
  
  return format(trTime, formatStr, { locale: tr });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, "d MMMM yyyy HH:mm");
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
