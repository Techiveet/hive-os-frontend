/**
 * Ethiopian Calendar Conversion Utility
 * Converts Gregorian dates to Ethiopian dates.
 */
export interface EthiopianDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
  monthNameAmharic: string;
}

const ethiopianMonthNames = [
  "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
  "Megabit", "Miyaziya", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"
];

const ethiopianMonthNamesAmharic = [
  "መስከረም", "ጥቅምት", "ህዳር", "ታህሳስ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ"
];

/**
 * Converts a Gregorian Date object to an Ethiopian date.
 * Uses direct time delta from a known epoch (September 12, 1971 UTC)
 */
export function toEthiopianDate(date: Date): EthiopianDate {
  try {
    const o = 24 * 3600 * 1000; // 1 day in ms
    const u = 365 * o; // 365 days in ms
    const M = 366 * o; // 366 days in ms
    const s = 3 * u + M; // 1461 days in ms (4 years)
    
    // Ethiopian epoch base we'll use: September 12, 1971 UTC which was Meskerem 1, 1964
    const epoch = Date.UTC(1971, 8, 12); 
    // Use local year, month, date to avoid timezone shift errors (e.g. UTC+3 making midnight fall into the previous day)
    const e = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - epoch;
    
    const n = Math.floor(e / s);
    let i = Math.floor((e - n * s) / u);
    if (i === 4) i = 3;
    
    const a = Math.floor((e - n * s - i * u) / (30 * o));
    const h = Math.floor((e - n * s - i * u - a * 30 * o) / o);
    
    const etYear = i + 4 * n + 1964;
    const etMonth = a + 1;
    const etDay = h + 1;

    return {
      year: etYear,
      month: etMonth,
      day: etDay,
      monthName: ethiopianMonthNames[etMonth - 1] || "Unknown",
      monthNameAmharic: ethiopianMonthNamesAmharic[etMonth - 1] || "Unknown"
    };
  } catch (err) {
    console.error("Error converting date", err);
    return {
      year: date.getFullYear(),
      month: 1,
      day: 1,
      monthName: "Unknown",
      monthNameAmharic: "Unknown"
    };
  }
}

/**
 * Formats an Ethiopian date string.
 */
export function formatEthiopian(date: Date, locale: 'en' | 'am' = 'en'): string {
  const et = toEthiopianDate(date);
  if (locale === 'am') {
    return `${et.monthNameAmharic} ${et.day} ቀን ${et.year} ዓ.ም`;
  }
  return `${et.monthName} ${et.day}, ${et.year}`;
}
