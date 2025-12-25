
import { supabase } from "./supabase";

interface ExchangeRate {
  usdBuying: number;
  usdSelling: number;
  eurBuying: number;
  eurSelling: number;
  date: string;
}

export async function getExchangeRates(): Promise<ExchangeRate | null> {
  const effectiveDate = getEffectiveDate();
  const dateStr = formatDateForDB(effectiveDate); // YYYY-MM-DD

  // 1. Check DB
  const { data: existingRate } = await supabase
    .from('exchange_rates')
    .select('*')
    .eq('date', dateStr)
    .single();

  if (existingRate) {
    return {
      usdBuying: Number(existingRate.usd_buying),
      usdSelling: Number(existingRate.usd_selling),
      eurBuying: Number(existingRate.eur_buying),
      eurSelling: Number(existingRate.eur_selling),
      date: existingRate.date,
    };
  }

  // 2. Fetch from TCMB
  try {
    const rates = await fetchTCMBRates(effectiveDate);
    if (rates) {
      // Save to DB
      await supabase.from('exchange_rates').insert({
        date: dateStr,
        usd_buying: rates.usdBuying,
        usd_selling: rates.usdSelling,
        eur_buying: rates.eurBuying,
        eur_selling: rates.eurSelling,
      });
      return rates;
    }
  } catch (error) {
    console.error("Error fetching TCMB rates:", error);
    // Fallback: Try previous day if today failed (e.g. holiday)
    // This handles the case where "Today" according to logic is a holiday and has no rates.
    // Recursive call with -1 day? Be careful of infinite loops.
    // For now, just return null or throw.
  }

  return null;
}

function getEffectiveDate(): Date {
  const now = new Date();
  // Turkey is UTC+3. 
  // We want to operate in Turkey Time.
  // Create a date object that represents the time in Turkey.
  const trDateString = now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" });
  const trDate = new Date(trDateString);

  const day = trDate.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
  const hours = trDate.getHours();
  const minutes = trDate.getMinutes();
  
  const isBeforeCutoff = hours < 15 || (hours === 15 && minutes < 31);

  // Logic:
  // Weekend (Sat/Sun): Use Friday.
  // Monday before 15:31: Use Friday.
  // Weekday before 15:31: Use Yesterday.
  // Weekday after 15:31: Use Today.

  let targetDate = new Date(trDate);

  if (day === 0) { // Sunday
    targetDate.setDate(trDate.getDate() - 2); // Friday
  } else if (day === 6) { // Saturday
    targetDate.setDate(trDate.getDate() - 1); // Friday
  } else if (day === 1 && isBeforeCutoff) { // Monday morning
    targetDate.setDate(trDate.getDate() - 3); // Friday
  } else if (isBeforeCutoff) { // Tue-Fri morning
    targetDate.setDate(trDate.getDate() - 1); // Yesterday
  } else {
    // Weekday afternoon or Monday afternoon -> Today
    // But if Today is a holiday, fetchTCMBRates will fail (404). 
    // We might need to handle that in the fetch loop.
  }

  // Normalize to midnight
  targetDate.setHours(0, 0, 0, 0);
  return targetDate;
}

async function fetchTCMBRates(date: Date): Promise<ExchangeRate | null> {
  const url = getTCMBUrl(date);
  console.log(`Fetching rates from: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 404) {
            console.warn(`Rates not found for ${date.toISOString().split('T')[0]} (Likely Holiday). Trying previous day.`);
            const prevDate = new Date(date);
            prevDate.setDate(date.getDate() - 1);
            return fetchTCMBRates(prevDate);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const xmlText = await response.text();
    
    // Parse XML using regex (simple and fast for this structure)
    // We need USD and EUR.
    // <Currency CrossOrder="0" Kod="USD" CurrencyCode="USD"> ... <ForexBuying>...</ForexBuying> ... </Currency>
    
    const usdMatch = xmlText.match(/<Currency CrossOrder="0" Kod="USD" CurrencyCode="USD">[\s\S]*?<ForexBuying>([\d.]+)<\/ForexBuying>[\s\S]*?<ForexSelling>([\d.]+)<\/ForexSelling>/);
    const eurMatch = xmlText.match(/<Currency CrossOrder="9" Kod="EUR" CurrencyCode="EUR">[\s\S]*?<ForexBuying>([\d.]+)<\/ForexBuying>[\s\S]*?<ForexSelling>([\d.]+)<\/ForexSelling>/);
    
    if (usdMatch && eurMatch) {
      return {
        usdBuying: parseFloat(usdMatch[1]),
        usdSelling: parseFloat(usdMatch[2]),
        eurBuying: parseFloat(eurMatch[1]),
        eurSelling: parseFloat(eurMatch[2]),
        date: formatDateForDB(date),
      };
    }
  } catch (e) {
    console.error("Fetch error:", e);
  }
  return null;
}

function getTCMBUrl(date: Date): string {
  // Format: https://www.tcmb.gov.tr/kurlar/YYYYMM/DDMMYYYY.xml
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `https://www.tcmb.gov.tr/kurlar/${year}${month}/${day}${month}${year}.xml`;
}

function formatDateForDB(date: Date): string {
  // YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
