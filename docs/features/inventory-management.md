# Inventory Management

The inventory management system allows users to track supply levels across properties and ensure timely restocking.

## Key Features

### Inventory Items
- Track supplies and equipment for properties
- Assign items to specific properties
- Set low stock thresholds for automatic alerts
- Track item costs for expense reporting

### Categories
Items can be categorized for better organization:
- Supplies (consumables like cleaning products)
- Equipment (durable items like tools)
- Amenities (guest-facing items)
- Furniture
- Other

### Stock Monitoring
- Visual indicators for low and critical stock levels
- Automatic flagging of items that need reordering
- Stock level history tracking

### Refill Process
Inventory can be refilled through:
1. Individual item refill
   - Update quantity directly from item view
   - Record cost and notes for expense tracking
2. Batch refill
   - Process multiple items at once
   - Integration with shopping lists

## Implementation Details

### Inventory Table Schema
- `id`: Unique identifier
- `name`: Item name
- `description`: Optional item description
- `category`: Item category
- `quantity`: Current quantity in stock
- `lowStockThreshold`: Level that triggers low stock alert
- `unitPrice`: Cost per unit
- `listingId`: Property the item belongs to
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### Inventory Refills
Each refill operation is recorded in the `inventory_refills` table:
- `id`: Unique identifier
- `inventoryId`: Reference to inventory item
- `quantity`: Amount added to inventory
- `cost`: Total cost of the refill
- `notes`: Additional information
- `userId`: User who performed the refill
- `refillDate`: When the refill occurred

### Relevant API Endpoints

#### Inventory Items
- `GET /api/inventory` - List all inventory items
- `GET /api/inventory/:id` - Get a specific inventory item
- `GET /api/inventory/low-stock` - Get items with low stock
- `POST /api/inventory` - Create a new inventory item
- `PATCH /api/inventory/:id` - Update an inventory item
- `DELETE /api/inventory/:id` - Delete an inventory item

#### Inventory Refills
- `GET /api/inventory-refills` - List all refill records
- `GET /api/inventory-refills/:inventoryId` - Get refills for a specific item
- `POST /api/inventory/:id/refill` - Refill a specific inventory item
- `POST /api/inventory/batch-refill` - Refill multiple items at once

## User Interface

The inventory management interface provides:
- Sortable and filterable tables of inventory items
- Search functionality
- Low stock filter toggle
- Category filtering
- Quick refill actions
- Integration with shopping lists
