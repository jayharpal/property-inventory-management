# Shopping Lists

The shopping lists feature provides a streamlined way to manage inventory restocking by creating lists of items that need to be purchased.

## Key Features

### List Management
- Create multiple shopping lists for different purposes
- Auto-generated "Low Stock" list for items below threshold
- Custom lists for specialized purchasing needs
- Add, edit, and delete shopping lists

### List Items
- Add inventory items to shopping lists
- Specify purchase quantities
- Add notes for specific requirements
- Mark items as completed when purchased

### Integration with Inventory
- One-click addition of inventory items to shopping lists
- Refill inventory directly from completed shopping list items
- Automatic tracking of expenses when refilling from shopping lists

### Workflow
1. Items detected as low stock appear in the default Low Stock list
2. Users can create custom lists for different purchasing needs
3. Items are marked as completed when purchased
4. Completed items can be used to refill inventory with a single action
5. Inventory is updated and expenses are logged automatically

## Implementation Details

### Shopping Lists Table Schema
- `id`: Unique identifier
- `title`: List name
- `description`: Optional list description
- `userId`: User who owns the list
- `isDefault`: Flag for the auto-generated low stock list
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### Shopping List Items Table Schema
- `id`: Unique identifier
- `shoppingListId`: Reference to the shopping list
- `inventoryItemId`: Reference to the inventory item (optional)
- `name`: Item name (used if not linked to inventory)
- `quantity`: Quantity to purchase
- `notes`: Additional information
- `completed`: Whether the item has been purchased
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### Relevant API Endpoints

#### Shopping Lists
- `GET /api/shopping-lists` - List all shopping lists
- `GET /api/shopping-lists/:id` - Get a specific shopping list
- `GET /api/shopping-lists/default/:userId` - Get default low stock list
- `POST /api/shopping-lists` - Create a new shopping list
- `PATCH /api/shopping-lists/:id` - Update a shopping list
- `DELETE /api/shopping-lists/:id` - Delete a shopping list

#### Shopping List Items
- `GET /api/shopping-lists/:id/items` - Get items in a shopping list
- `POST /api/shopping-list-items` - Add an item to a shopping list
- `PATCH /api/shopping-list-items/:id` - Update a shopping list item
- `PATCH /api/shopping-list-items/:id/complete` - Mark item as completed
- `DELETE /api/shopping-list-items/:id` - Remove an item from a list
- `POST /api/shopping-lists/:id/refill-completed` - Refill inventory from completed items

## User Interface

The shopping lists interface provides:
- List of all shopping lists with filter for default lists
- Detail view of shopping list items with completion checkboxes
- Easy navigation between inventory and shopping lists
- Ability to add items directly from inventory view
- Batch refill action for completed items
