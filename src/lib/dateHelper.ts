import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Register plugin
dayjs.extend(customParseFormat);

const DATE_FORMATS = [
  'M/D/YYYY', // 7/29/2025
  'MM/D/YYYY', // 07/9/2025
  'M/DD/YYYY', // 7/09/2025
  'MM/DD/YYYY', // 07/29/2025
  'YYYY-MM-DD', // 2025-07-29 (ISO)
  'YYYY/MM/DD', // 2025/07/29
  'D/M/YYYY', // 29/7/2025
  'DD/M/YYYY', // 29/07/2025
  'D/MM/YYYY', // 9/07/2025
  'DD/MM/YYYY', // 29/07/2025
];

/**
 * Converts a date string in various common formats to ISO format (YYYY-MM-DD).
 *
 * This function uses Day.js with the customParseFormat plugin to parse and normalize
 * incoming date strings that may appear in a variety of formats commonly found in U.S. or international CSV data.
 * If the input date is valid, it returns a standardized 'YYYY-MM-DD' string; otherwise, it returns null.
 *
 * Supported formats include:
 * - M/D/YYYY          (e.g., 7/29/2025)
 * - MM/D/YYYY         (e.g., 07/9/2025)
 *
 * @param value - The raw date string to format.
 * @returns A string in 'YYYY-MM-DD' format if valid; otherwise, null.
 *
 * @example
 * formatDateToYMD('7/29/2025'); // Returns '2025-07-29'
 * formatDateToYMD('2025/07/29'); // Returns '2025-07-29'
 * formatDateToYMD('invalid date'); // Returns null
 */
export const formatDateToYMD = (value: string): string | null => {
  if (!value) return null;
  const parsed = dayjs(value, DATE_FORMATS, true);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
};
