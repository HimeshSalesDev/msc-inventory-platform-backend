export const CSV_FILE_COLUMNS = [
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
];

export const REQUIRED_FIELDS = ['SKU', 'Length', 'Skirt', 'Foam Density'];

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

export const CSV_TO_PRISMA_INVENTORY_MAP = {
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
};

export const INBOUND_CSV_FILE_COLUMNS = [
  ...CSV_FILE_COLUMNS,
  'PO No',
  'Container No',
  'ETD',
  'ETA',
  'Shipped',
  'Offloaded Date',
];

export const INBOUND_CSV_TO_PRISMA_INVENTORY_MAP = {
  ...CSV_TO_PRISMA_INVENTORY_MAP,
  'PO No': 'poNumber',
  'Container No': 'containerNumber',
  ETD: 'etd',
  ETA: 'eta',
  Shipped: 'shipped',
  'Offloaded Date': 'offloadedDate',
};
