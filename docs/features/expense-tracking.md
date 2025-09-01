# Expense Tracking

The expense tracking system allows users to record, categorize, and analyze property-related expenses.

## Key Features

### Expense Types
Track different types of expenses:
- **Inventory**: Expenses linked to inventory item refills
- **Services**: Costs for external services (cleaning, maintenance, etc.)
- **Utilities**: Recurring utility bills
- **Repairs**: Maintenance and repair costs
- **Custom**: Any other expenses that don't fit standard categories

### Property Assignment
- All expenses are assigned to specific properties
- Properties are linked to owners for expense rollup reporting
- Filter expenses by property or owner

### Date-Based Management
- Record expense dates for accurate period reporting
- Track expenses over time with date-range filtering
- Historical expense analysis

### Notes and Documentation
- Add detailed notes to expenses
- Record vendor information
- Track invoice numbers or reference IDs

## Implementation Details

### Expenses Table Schema
- `id`: Unique identifier
- `description`: Expense description
- `amount`: Cost amount (stored as string for precision)
- `date`: When the expense occurred
- `category`: Expense category
- `listingId`: Property the expense is for
- `inventoryItemId`: Optional link to inventory item
- `notes`: Additional information
- `createdAt`: Record creation timestamp
- `updatedAt`: Last update timestamp

### Relevant API Endpoints

#### Expenses
- `GET /api/expenses` - List all expenses
- `GET /api/expenses/:id` - Get a specific expense
- `GET /api/expenses/listing/:listingId` - Get expenses for a property
- `GET /api/expenses/owner/:ownerId` - Get expenses for an owner
- `POST /api/expenses` - Create a new expense
- `PATCH /api/expenses/:id` - Update an expense
- `DELETE /api/expenses/:id` - Delete an expense

## User Interface

The expense tracking interface provides:
- Table view of all expenses with sorting and filtering
- Form for adding new expenses
- Expense categories selector
- Property assignment dropdown
- Date picker for expense date
- Integration with inventory refill workflow
- Optional link to inventory items

## Integrations

The expense tracking system integrates with:

### Inventory Management
- Expenses are automatically created when inventory is refilled
- Inventory items can be selected when logging expenses

### Reporting
- Expenses form the basis of owner expense reports
- Custom date ranges for expense reporting
- Owner-specific expense summaries

### Analytics
- Expense breakdown by category
- Expense trends over time
- Property-specific expense analysis
