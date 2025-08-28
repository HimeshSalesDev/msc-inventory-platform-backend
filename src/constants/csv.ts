// CSV keys constants

export const PREVIEW_NUMERIC_FIELDS = ['QTY'];

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
  'Container',
  'ETD',
  'ETA',
  'Shipped',
];

export const INBOUND_CSV_FILE_REQUIRED_COLUMNS = [
  'SKU',
  'QTY',
  'Container',
  // 'ETA',
];

export const INBOUND_DATE_FIELDS = ['ETD', 'ETA', 'Offloaded Date'];

export const LOCATION_CSV_REQUIRED_FIELDS = ['SKU', 'QTY', 'BIN'];
export const LOCATION_CSV_VALIDATION_REQUIRED_FIELDS = [
  'SKU',
  'BIN',
  'Location',
];

export const LOCATION_CSV_PREVIEW_NUMERIC_FIELDS = ['QTY'];

export const PRE_ORDER_CSV_FILE_REQUIRED_COLUMNS = ['SKU', 'Production QTY'];

export const PRE_ORDER_PREVIEW_NUMERIC_FIELDS = ['Production QTY'];

export const PRE_ORDER_CSV_FILE_COLUMNS = [
  'SKU',
  'Production QTY',
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
  'PO Number',
  // 'Shipped',
  // 'Available Stock',
  // 'Container No',
  // 'ETA',
];

export const PRE_ORDER_DATE_FIELDS = ['ETA'];

// SQL keys constants

export const IMPORT_INBOUND_NUMERIC_FIELDS = ['quantity'];

export const PRE_ORDER_CSV_TO_PRISMA_INVENTORY_MAP = {
  SKU: 'sku',
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
  'Production QTY': 'quantity',
  'PO Number': 'poNumber',
  // Shipped: 'shipped',
  // 'Available Stock': 'availableStock',
  // 'Container No': 'containerNumber',
  // ETA: 'eta',
};

export const IMPORT_PRE_ORDER_NUMERIC_FIELDS = ['quantity'];

export const LOCATION_CSV_FILE_COLUMNS = [
  'SKU',
  'BIN',
  'Location',
  'QTY',
  'Description',
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
];

export const LOCATION_CSV_TO_SQL_KEY_MAP = {
  SKU: 'sku',
  QTY: 'quantity',
  Location: 'location',
  BIN: 'binNumber',
  Description: 'vendorDescription',
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
};

export const LOCATION_IMPORT_NUMERIC_FIELDS = ['quantity'];

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
  Container: 'containerNumber',
  ETD: 'etd',
  ETA: 'eta',
  Shipped: 'shipped',
};

export const DEFAULT_LOCATION = 'CA';
