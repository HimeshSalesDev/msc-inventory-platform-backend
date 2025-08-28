import dayjs from 'dayjs';

export function normalizeNumber(value: any): number | null {
  if (!value) return null;

  const str = value.toString().trim();

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

export function normalizeDate(value: any): string | null {
  if (!value) return null;

  let str = value.toString().trim();

  // Sometimes it's just month/day (e.g., "8/22")
  if (/^\d{1,2}\/\d{1,2}$/.test(str)) {
    // Assume current year if missing
    str = `${str}/2025`;
  }

  const date = dayjs(str, ['M/D/YYYY', 'MM/DD/YYYY', 'M/D/YY'], true);
  return date.isValid() ? date.format('YYYY-MM-DD') : null;
}

export function normalizeString(value: any): string | null {
  if (!value) return null;
  return (value.toString().trim() || null) as string | null;
}

export function validateRow(row: any, index: number, requiredFields: string[]) {
  const errors: string[] = [];

  // Required field validation
  for (const field of requiredFields) {
    if (!row[field] || row[field].toString().trim() === '') {
      errors.push(`${field} is required`);
    }
  }

  return errors;
}
