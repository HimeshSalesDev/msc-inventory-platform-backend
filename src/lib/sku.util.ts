export type FoamType = '1' | '1.5' | '2';
export type TaperType = '4-2.5' | '5-3' | '6-4';
export type ColorType =
  | 'HydroTex Pro - Oxford Grey'
  | 'HydroTex Pro - Coffee Brown'
  | 'HydroTex Pro - Mahogany'
  | 'Coastal Grey'
  | 'Mayan Brown'
  | 'Bourbon'
  | 'Mahogany';

export type FoamCode = '0' | '1' | '2';
export type TaperCode = 'S' | 'M' | 'T';
export type TransformCode = 'F' | 'X' | 'S' | 'E' | 'N';
export type ColorCode = 1104 | 1239 | 1244 | 3132 | 3218 | 3203 | 3221;

export interface ParsedSKU {
  length?: number;
  width?: number;
  radius?: number;
  skirtLength?: number;
  taper?: string | null; // like `"5"-4"`
  foam?: number | null; // like "1.5"
  colorCode?: ColorCode;
  colorName?: ColorType | null;
}

export interface DimCAndSkirt {
  dimC: number | null;
  skirtLength: number;
}

// =============================================================================
// MAPPING CONSTANTS
// =============================================================================

const FOAM_MAP: Record<FoamType, FoamCode> = {
  '1': '0',
  '1.5': '1',
  '2': '2',
} as const;

const TAPER_MAP: Record<TaperType, TaperCode> = {
  '4-2.5': 'S',
  '5-3': 'M',
  '6-4': 'T',
} as const;

const COLOR_MAP: Record<ColorType, ColorCode> = {
  'HydroTex Pro - Oxford Grey': 1104,
  'HydroTex Pro - Coffee Brown': 1239,
  'HydroTex Pro - Mahogany': 1244,
  'Coastal Grey': 3132,
  'Mayan Brown': 3218,
  Bourbon: 3203,
  Mahogany: 3221,
} as const;

const REVERSE_TRANSFORM_MAP: Record<TransformCode, string> = {
  F: '5',
  X: '6',
  S: '7',
  E: '8',
  N: '9',
} as const;

/**
 * Reverse transform encoded string back to dimensions
 * @param {string} str - Encoded string
 * @returns {number[]} Array of dimension values
 */
function reverseTransformedString(str: string): number[] {
  const result: number[] = [];

  // Process in chunks of 2 characters
  for (let i = 0; i < str.length; i += 2) {
    const pair = str.slice(i, i + 2);
    const firstChar = pair[0] as TransformCode;
    const firstDigit = REVERSE_TRANSFORM_MAP[firstChar];

    if (firstDigit && pair[1]) {
      const parsed = parseInt(firstDigit + pair[1], 10);
      if (!isNaN(parsed)) {
        result.push(parsed);
      }
    }
  }

  return result;
}

/**
 * Reverse taper or foam code back to original value
 * @param {string} key - 'taper' or 'foam'
 * @param {TaperCode | FoamCode} code - Code to decode
 * @returns {TaperType | FoamType | null} Decoded value
 */
function reverseTaperAndFoam(key: 'foam', code: FoamCode): FoamType | null;
function reverseTaperAndFoam(key: 'taper', code: TaperCode): TaperType | null;
function reverseTaperAndFoam(
  key: 'foam' | 'taper',
  code: FoamCode | TaperCode,
): FoamType | TaperType | null {
  if (key === 'foam') {
    const reverseFoamMap = Object.fromEntries(
      Object.entries(FOAM_MAP).map(([label, val]) => [val, label]),
    ) as Record<FoamCode, FoamType>;
    return reverseFoamMap[code as FoamCode] || null;
  }

  if (key === 'taper') {
    const reverseTaperMap = Object.fromEntries(
      Object.entries(TAPER_MAP).map(([label, val]) => [val, label]),
    ) as Record<TaperCode, TaperType>;
    return reverseTaperMap[code as TaperCode] || null;
  }

  return null;
}

/**
 * Get color code from color name or vice versa
 * @param {ColorType} value - Color name
 * @returns {ColorCode | null} Color code
 */
function replaceColor(value: ColorType): ColorCode | null;
/**
 * Get color name from color code
 * @param {ColorCode} value - Color code
 * @returns {ColorType | null} Color name
 */
function replaceColor(value: ColorCode): ColorType | null;
function replaceColor(
  value: ColorType | ColorCode,
): ColorType | ColorCode | null {
  // If input is a string, return code
  if (typeof value === 'string') {
    return COLOR_MAP[value] || null;
  }

  // If input is a number, return first matching color name
  if (typeof value === 'number') {
    for (const [color, code] of Object.entries(COLOR_MAP)) {
      if (code === value) {
        return color as ColorType;
      }
    }
    return null;
  }

  return null;
}

/**
 * Parse dimension C and skirt length from combined value
 * @param {string|number} value - Combined value
 * @returns {DimCAndSkirt | null} Object with dimC and skirtLength
 */
function parseDimCAndSkirt(value: string | number): DimCAndSkirt | null {
  const valueStr = value.toString().trim();
  const skirtLength = parseInt(valueStr.slice(-1)); // last digit
  const dimC = parseInt(valueStr.slice(0, -1)); // everything before last digit

  if (dimC || skirtLength) {
    return { dimC: dimC >= 1 ? dimC : null, skirtLength };
  }

  return null; // fallback if invalid
}

/**
 * Parse SKU and extract all product information
 * @param {string} sku - SKU string to parse
 * @returns {ParsedSKU|null} Parsed product information
 */
function parseSKU(sku: string): ParsedSKU | null {
  try {
    if (!sku || typeof sku !== 'string') return null;

    const trimmedSKU = sku.trim();
    const parts = trimmedSKU.split('-').map((part) => part.trim());
    if (parts.length < 4) return null;

    const result: ParsedSKU = {};

    // Parse dimensions A and B as length and width
    const dimensionsArray = reverseTransformedString(parts[0]);
    if (dimensionsArray.length) {
      result.length = dimensionsArray[0];
      result.width = dimensionsArray[1] ?? null;
    }

    // Parse dimension C and skirt as radius and skirtLength
    const dimCAndSkirt = parseDimCAndSkirt(parts[1]);
    if (dimCAndSkirt) {
      result.radius = dimCAndSkirt.dimC;
      result.skirtLength = dimCAndSkirt.skirtLength;
    }

    // Parse taper and foam codes
    const taperCode = parts[2][0] as TaperCode;
    const foamCode = parts[2][1] as FoamCode;

    const taperValue = reverseTaperAndFoam('taper', taperCode);
    const foamValue = reverseTaperAndFoam('foam', foamCode);

    if (taperValue) {
      const [major, minor] = taperValue.split('-');
      result.taper = `${major}"-${minor}"`;
    }

    if (foamValue) {
      result.foam = parseFloat(foamValue);
    }

    // Parse color code
    const colorCode = parseInt(parts[3], 10);
    if (!isNaN(colorCode)) {
      const colorName = replaceColor(colorCode as ColorCode);
      if (colorName) {
        result.colorCode = colorCode as ColorCode;
        result.colorName = colorName;
      }
    }

    return result;
  } catch (error) {
    console.error('Error parsing SKU:', error);
    return null;
  }
}

/**
 * Validate SKU format
 * @param {string} sku - SKU to validate
 * @returns {boolean} True if valid SKU format
 */
function validateSKU(sku: string): boolean {
  const parsed = parseSKU(sku);
  return (
    parsed !== null &&
    parsed.length !== undefined &&
    parsed.skirtLength !== undefined &&
    parsed.foam !== null
  );
}

export { parseSKU, validateSKU };
