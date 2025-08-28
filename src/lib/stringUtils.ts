export const normalizeKey = (str: string) =>
  str.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');

export function findActualCsvKey(
  row: any,
  expectedKey: string,
): string | undefined {
  return Object.keys(row).find(
    (actualKey) => normalizeKey(actualKey) === normalizeKey(expectedKey),
  );
}
