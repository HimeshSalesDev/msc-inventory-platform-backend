export const normalizeKey = (str: string) =>
  str.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
