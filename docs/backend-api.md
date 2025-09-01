# Backend API Documentation

The Property Management Platform provides a RESTful API for interacting with the system's data and functionality.

## Authentication Endpoints

### `POST /api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "username": "newuser",
  "password": "securepassword",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

**Response:**
```json
{
  "id": 1,
  "username": "newuser",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

### `POST /api/auth/login`
Authenticate a user and create a session.

**Request Body:**
```json
{
  "username": "newuser",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "id": 1,
  "username": "newuser",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

### `POST /api/auth/logout`
End the current user session.

**Response:**
```json
{
  "success": true
}
```

## Owner Endpoints

### `GET /api/owners`
Get a list of all property owners.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "555-1234",
    "address": "123 Main St",
    "notes": "Prefers communication via email"
  }
]
```

### `GET /api/owners/:id`
Get details for a specific owner.

**Response:**
```json
{
  "id": 1,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "555-1234",
  "address": "123 Main St",
  "notes": "Prefers communication via email"
}
```

### `POST /api/owners`
Create a new owner.

**Request Body:**
```json
{
  "name": "New Owner",
  "email": "owner@example.com",
  "phone": "555-5678",
  "address": "456 Oak Ave",
  "notes": "New client referred by Jane"
}
```

### `PATCH /api/owners/:id`
Update an existing owner.

**Request Body:**
```json
{
  "email": "updated@example.com",
  "notes": "Updated notes"
}
```

### `DELETE /api/owners/:id`
Delete an owner.

## Listing (Property) Endpoints

### `GET /api/listings`
Get a list of all properties.

### `GET /api/listings/owner/:ownerId`
Get properties belonging to a specific owner.

### `GET /api/listings/:id`
Get details for a specific property.

### `POST /api/listings`
Create a new property.

**Request Body:**
```json
{
  "name": "Beach House",
  "address": "789 Beach Rd",
  "description": "3BR/2BA beach property",
  "type": "house",
  "ownerId": 1
}
```

### `PATCH /api/listings/:id`
Update an existing property.

### `DELETE /api/listings/:id`
Delete a property.

## Inventory Endpoints

### `GET /api/inventory`
Get a list of all inventory items.

### `GET /api/inventory/low-stock`
Get items with quantity below their threshold.

### `GET /api/inventory/:id`
Get details for a specific inventory item.

### `POST /api/inventory`
Create a new inventory item.

**Request Body:**
```json
{
  "name": "Toilet Paper",
  "description": "2-ply toilet paper rolls",
  "category": "supplies",
  "quantity": 24,
  "lowStockThreshold": 10,
  "unitPrice": "0.75",
  "listingId": 1
}
```

### `PATCH /api/inventory/:id`
Update an existing inventory item.

### `DELETE /api/inventory/:id`
Delete an inventory item.

### `POST /api/inventory/:id/refill`
Refill an inventory item quantity.

**Request Body:**
```json
{
  "quantity": 12,
  "cost": "9.99",
  "notes": "Monthly restock"
}
```

### `POST /api/inventory/batch-refill`
Refill multiple inventory items at once.

## Shopping List Endpoints

### `GET /api/shopping-lists`
Get all shopping lists.

### `GET /api/shopping-lists/:id`
Get a specific shopping list.

### `GET /api/shopping-lists/default/:userId`
Get the default low stock shopping list.

### `POST /api/shopping-lists`
Create a new shopping list.

### `PATCH /api/shopping-lists/:id`
Update a shopping list.

### `DELETE /api/shopping-lists/:id`
Delete a shopping list.

### `GET /api/shopping-lists/:id/items`
Get items in a shopping list.

### `POST /api/shopping-list-items`
Add an item to a shopping list.

### `PATCH /api/shopping-list-items/:id`
Update a shopping list item.

### `DELETE /api/shopping-list-items/:id`
Remove an item from a shopping list.

### `PATCH /api/shopping-list-items/:id/complete`
Mark a shopping list item as completed.

### `POST /api/shopping-lists/:id/refill-completed`
Refill inventory from completed shopping list items.

## Expense Endpoints

### `GET /api/expenses`
Get all expenses.

### `GET /api/expenses/listing/:listingId`
Get expenses for a specific property.

### `GET /api/expenses/owner/:ownerId`
Get all expenses for properties owned by a specific owner.

### `GET /api/expenses/:id`
Get a specific expense.

### `POST /api/expenses`
Create a new expense.

**Request Body:**
```json
{
  "description": "Plumbing repair",
  "amount": "150.00",
  "date": "2025-04-01T12:00:00Z",
  "category": "repairs",
  "listingId": 1,
  "notes": "Fixed leaking sink"
}
```

### `PATCH /api/expenses/:id`
Update an expense.

### `DELETE /api/expenses/:id`
Delete an expense.

## Report Endpoints

### `GET /api/reports`
Get all reports.

### `GET /api/reports/owner/:ownerId`
Get reports for a specific owner.

### `GET /api/reports/:id`
Get a specific report.

### `POST /api/reports`
Create a new report.

**Request Body:**
```json
{
  "title": "Q1 Expense Report",
  "startDate": "2025-01-01",
  "endDate": "2025-03-31",
  "ownerIds": [1, 2],
  "notes": "Quarterly expense summary"
}
```

### `PATCH /api/reports/:id`
Update a report.

### `DELETE /api/reports/:id`
Delete a report.

### `GET /api/reports/:id/download`
Download a report as PDF.

### `POST /api/reports/email`
Email a report.

**Request Body:**
```json
{
  "reportId": 1,
  "email": "owner@example.com",
  "message": "Here is your quarterly expense report."
}
```

## User Settings Endpoints

### `GET /api/user/settings`
Get settings for the current user.

### `POST /api/user/settings`
Create or update user settings.

**Request Body:**
```json
{
  "theme": "dark",
  "emailNotifications": true,
  "defaultView": "table"
}
```

## Analytics Endpoints

### `GET /api/stats/dashboard`
Get overview statistics for the dashboard.

### `GET /api/stats/expenses/trend`
Get expense trends over time.

### `GET /api/stats/expenses/by-category`
Get expenses grouped by category.

### `GET /api/stats/expenses/by-property`
Get expenses grouped by property.

### `GET /api/stats/inventory/low-stock`
Get low stock statistics.
