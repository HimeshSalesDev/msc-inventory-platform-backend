import {
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { OrderUpdateDto } from './dto/order-update.dto';

export const OrderUpdateApiOperation = ApiOperation({
  summary: 'Update an existing order and adjust inventory quantities',
  description: `
This endpoint updates an existing order by transitioning from the old order to a new one. The operation is performed atomically within a single transaction to ensure data consistency.

Process:
1. Reverses the old order allocation (restores previous quantities)
2. Applies the new order allocation (allocates new quantities)
3. Validates inventory availability at each step
4. Maintains audit trail through webhook logging

Order Types Supported:
- **inventory**: Manages in-hand and allocated quantities
- **inbound**: Manages pre-booked quantities against inbound shipments
- **custom**: Creates custom order records

Important Notes:
- For inbound and custom orders, "id" must be provided for both updated and new orders
- All quantity validations are performed before any database changes
`,
});

export const OrderUpdateApiBody = ApiBody({
  type: OrderUpdateDto,
  description: `
Order update payload containing both the old order to reverse and new order to apply.

Structure:
- updated: The existing order details to be reversed
- new: The new order details to be applied

Each order object contains:
- sku: SKU of the item (string)
- qty: Quantity as string to handle large numbers
- type: Order type [inventory, custom, inbound]
- id: Required only when type = inbound or custom (for both updated and new)
`,
  examples: {
    inventoryUpdateExample: {
      summary: 'Inventory order update',
      description: 'Update inventory order from 100 to 150 units',
      value: {
        updated: {
          sku: 'SKU-12345',
          qty: '100',
          type: 'inventory',
        },
        new: {
          sku: 'SKU-12345',
          qty: '150',
          type: 'inventory',
        },
      },
    },
    inboundUpdateExample: {
      summary: 'Inbound order update',
      description: 'Update inbound order quantity and change inbound batch',
      value: {
        updated: {
          sku: 'SKU-98765',
          qty: '200',
          type: 'inbound',
          id: 'inbound-batch-001',
        },
        new: {
          sku: 'SKU-98765',
          qty: '300',
          type: 'inbound',
          id: 'inbound-batch-002',
        },
      },
    },
    customUpdateExample: {
      summary: 'Custom order update',
      description: 'Update custom order quantity',
      value: {
        updated: {
          sku: 'SKU-11111',
          qty: '50',
          type: 'custom',
          id: 'custom-batch-001',
        },
        new: {
          sku: 'SKU-11111',
          qty: '75',
          type: 'custom',
          id: 'custom-batch-002',
        },
      },
    },
    differentSkuExample: {
      summary: 'Different SKU update',
      description: 'Change order from one SKU to another (same type required)',
      value: {
        updated: {
          sku: 'SKU-OLD-123',
          qty: '100',
          type: 'inventory',
        },
        new: {
          sku: 'SKU-NEW-456',
          qty: '100',
          type: 'inbound',
          id: 'inbound-batch-002',
        },
      },
    },
  },
});

export const OrderUpdateApiOkResponse = ApiOkResponse({
  description: 'Order updated successfully with detailed transaction results',
  schema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'OK',
        description: 'Operation status indicator',
      },
      reversed: {
        type: 'object',
        description: 'Details of the reversed (old) order',
        properties: {
          sku: { type: 'string', example: 'SKU-12345' },
          reversed: {
            type: 'object',
            properties: {
              inHandQuantity: {
                type: 'number',
                example: 1100,
                description: 'Updated in-hand quantity after reversal',
              },
              allocatedQuantity: {
                type: 'number',
                example: 900,
                description: 'Updated allocated quantity after reversal',
              },
            },
          },
          data: {
            type: 'object',
            description: 'Complete updated inventory record',
          },
        },
      },
      applied: {
        type: 'object',
        description: 'Details of the applied (new) order',
        properties: {
          sku: { type: 'string', example: 'SKU-12345' },
          applied: {
            type: 'object',
            properties: {
              inHandQuantity: {
                type: 'number',
                example: 950,
                description: 'Final in-hand quantity after new allocation',
              },
              allocatedQuantity: {
                type: 'number',
                example: 1050,
                description: 'Final allocated quantity after new allocation',
              },
            },
          },
          data: {
            type: 'object',
            description: 'Complete final inventory record',
          },
        },
      },
      summary: {
        type: 'object',
        description: 'Summary of the order update operation',
        properties: {
          oldOrder: {
            type: 'object',
            properties: {
              sku: { type: 'string', example: 'SKU-12345' },
              qty: { type: 'string', example: '100' },
              type: { type: 'string', example: 'inventory' },
              id: {
                type: 'string',
                example: 'inbound-001',
                description: 'Present only for inbound orders',
              },
            },
          },
          newOrder: {
            type: 'object',
            properties: {
              sku: { type: 'string', example: 'SKU-12345' },
              qty: { type: 'string', example: '150' },
              type: { type: 'string', example: 'inventory' },
              id: {
                type: 'string',
                example: 'inbound-002',
                description: 'Present only for inbound orders',
              },
            },
          },
          quantityChange: {
            type: 'number',
            example: 50,
            description:
              'Net quantity change (positive = increase, negative = decrease)',
          },
        },
      },
    },
  },
});

export const OrderUpdateApiBadRequestResponse = ApiBadRequestResponse({
  description: 'Invalid input data or business rule violations',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 400 },
      message: {
        type: 'array',
        items: { type: 'string' },
        examples: [
          'Both updated and new order objects are required',
          'Updated quantity must be a valid positive number',
        ],
      },
      error: { type: 'string', example: 'Bad Request' },
    },
  },
});

export const OrderUpdateApiNotFoundResponse = ApiNotFoundResponse({
  description: 'Required resource not found',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 404 },
      message: {
        type: 'string',
        examples: [
          'Inventory not found for reversal',
          'Inventory not found for new order',
        ],
      },
      error: { type: 'string', example: 'Not Found' },
    },
  },
});

export const OrderUpdateApiInternalServerErrorResponse =
  ApiInternalServerErrorResponse({
    description: 'Internal server error during order update process',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: {
          type: 'string',
          examples: ['Order update failed: Database transaction failed'],
        },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  });
