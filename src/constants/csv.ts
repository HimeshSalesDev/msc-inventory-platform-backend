export const REQUIRED_FIELDS = ['SKU', 'QTY'];

export const PREVIEW_NUMERIC_FIELDS = [
  'Length',
  'Foam Density',
  'Skirt',
  'QTY',
];

export const IMPORT_NUMERIC_FIELDS = [
  'Length',
  'Foam Density',
  'Skirt',
  'quantity',
];

export const INBOUND_CSV_FILE_COLUMNS = [
  'SKU',
  'Vendor Description',
  'QTY',
  'Length',
  'Width',
  'Radius',
  'Skirt',
  'Taper',
  'Foam Density',
  'Strip Insert',
  'Shape',
  'Material Number',
  'Material Type',
  'Material Color',
  'PO No',
  'Container No',
  'ETD',
  'ETA',
  'Shipped',
];

export const INBOUND_CSV_FILE_REQUIRED_COLUMNS = [
  'SKU',
  'QTY',
  'Container No',
  'ETA',
];

export const INBOUND_CSV_TO_PRISMA_INVENTORY_MAP = {
  SKU: 'sku',
  'Vendor Description': 'vendorDescription',
  Length: 'length',
  Width: 'width',
  Radius: 'radius',
  Skirt: 'skirt',
  Taper: 'taper',
  'Foam Density': 'foamDensity',
  'Strip Insert': 'stripInsert',
  Shape: 'shape',
  'Material Number': 'materialNumber',
  'Material Type': 'materialType',
  'Material Color': 'materialColor',
  QTY: 'quantity',
  'PO No': 'poNumber',
  'Container No': 'containerNumber',
  ETD: 'etd',
  ETA: 'eta',
  Shipped: 'shipped',
};

export const INBOUND_DATE_FIELDS = ['ETD', 'ETA', 'Offloaded Date'];

export const LOCATION_CSV_FILE_COLUMNS = ['SKU', 'BIN', 'Location', 'QTY'];

export const LOCATION_CSV_TO_SQL_KEY_MAP = {
  SKU: 'sku',
  QTY: 'quantity',
  Location: 'location',
  BIN: 'binNumber',
};

export const LOCATION_CSV_REQUIRED_FIELDS = ['SKU', 'QTY', 'BIN'];
export const LOCATION_CSV_VALIDATION_REQUIRED_FIELDS = [
  'SKU',
  'BIN',
  'Location',
];

export const LOCATION_CSV_PREVIEW_NUMERIC_FIELDS = ['QTY'];
export const LOCATION_IMPORT_NUMERIC_FIELDS = ['quantity'];

export const DEFAULT_LOCATION = 'CA';
