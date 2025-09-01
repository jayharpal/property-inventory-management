# Database Schema

The Property Management Platform uses PostgreSQL with Drizzle ORM. This document outlines the database schema and relationships.

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Users     │       │   Owners    │       │  Listings   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │       │ id          │       │ id          │
│ username    │       │ name        │       │ name        │
│ password    │       │ email       │       │ address     │
│ email       │       │ phone       │       │ description │
│ firstName   │       │ address     │       │ type        │
│ lastName    │       │ notes       │       │ ownerId     │──┐
│ role        │       └──────┬──────┘       └─────────────┘  │
└─────────────┘              │                    ▲          │
      │                      │                    │          │
      │                      │                    │          │
      ▼                      ▼                    │          │
┌─────────────┐       ┌─────────────┐            │          │
│UserSettings │       │  Reports    │            │          │
├─────────────┤       ├─────────────┤            │          │
│ id          │       │ id          │            │          │
│ userId      │       │ title       │◄───────────┘          │
│ theme       │       │ startDate   │                       │
│ emailNotif  │       │ endDate     │                       │
└─────────────┘       │ ownerIds    │◄──────────────────────┘
                      │ notes       │
      ┌───────────────┤ createdAt   │
      │               └─────────────┘
      │                      ▲
      │                      │
      ▼                      │
┌─────────────┐       ┌─────────────┐
│ Inventory   │       │  Expenses   │
├─────────────┤       ├─────────────┤
│ id          │       │ id          │
│ name        │       │ description │
│ description │       │ amount      │
│ category    │       │ date        │
│ quantity    │       │ category    │
│ threshold   │       │ listingId   │──────────────────────┐
│ unitPrice   │       │ inventoryId │◄───┐                 │
│ listingId   │◄──────┤ notes       │    │                 │
└─────┬───────┘       └─────────────┘    │                 │
      │                                   │                 │
      ▼                                   │                 │
┌─────────────┐                           │                 │
│InventoryRef │                           │                 │
├─────────────┤                           │                 │
│ id          │                           │                 │
│ inventoryId │───────────────────────────┘                 │
│ quantity    │                                             │
│ cost        │                                             │
│ date        │                                             │
│ userId      │                                             │
│ notes       │                                             │
└─────────────┘                                             │
                                                            │
┌─────────────┐       ┌─────────────┐                       │
│ShoppingLists│       │ShoppingItems│                       │
├─────────────┤       ├─────────────┤                       │
│ id          │       │ id          │                       │
│ title       │       │ listId      │───┐                   │
│ userId      │       │ inventoryId │   │                   │
│ isDefault   │──────►│ quantity    │   │                   │
└─────────────┘       │ completed   │   │                   │
                      │ notes       │   │                   │
                      └─────────────┘   │                   │
                            ▲           │                   │
                            │           │                   │
                            └───────────┘                   │
                                                            │
┌─────────────┐                                             │
│ActivityLogs │                                             │
├─────────────┤                                             │
│ id          │                                             │
│ userId      │                                             │
│ action      │                                             │
│ entityType  │                                             │
│ entityId    │◄────────────────────────────────────────────┘
│ details     │
│ timestamp   │
└─────────────┘
```

## Tables

### Users

Stores user account information.

```typescript
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role", { enum: ["admin", "standard_admin", "standard_user"] }).default("standard_user").notNull(),
  companyName:text("company_name").notNull()
});
```

### UserSettings

Stores user preferences and settings.

```typescript
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  theme: text("theme", { enum: ["light", "dark", "system"] }).default("system").notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  defaultView: text("default_view", { enum: ["grid", "table"] }).default("table").notNull()
});
```

### Owners

Stores property owner information.

```typescript
export const owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes")
});
```

### Listings (Properties)

Stores property information.

```typescript
export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  description: text("description"),
  type: text("type", { enum: ["apartment", "house", "condo", "villa", "cabin", "other"] }).notNull(),
  ownerId: integer("owner_id").references(() => owners.id).notNull()
});
```

### Inventory

Stores inventory items for properties.

```typescript
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  quantity: integer("quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  unitPrice: numeric("unit_price"),
  listingId: integer("listing_id").references(() => listings.id).notNull()
});
```

### InventoryRefills

Tracks inventory refill history.

```typescript
export const inventoryRefills = pgTable("inventory_refills", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id").references(() => inventory.id).notNull(),
  quantity: integer("quantity").notNull(),
  cost: numeric("cost"),
  refillDate: timestamp("refill_date").notNull().defaultNow(),
  userId: integer("user_id").references(() => users.id),
  notes: text("notes")
});
```

### Expenses

Tracks property expenses.

```typescript
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: numeric("amount").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  category: text("category").notNull(),
  listingId: integer("listing_id").references(() => listings.id).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id),
  notes: text("notes")
});
```

### Reports

Stores generated expense reports.

```typescript
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  ownerIds: integer("owner_ids").array().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
```

### ShoppingLists

Stores shopping lists for inventory restocking.

```typescript
export const shoppingLists = pgTable("shopping_lists", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
```

### ShoppingListItems

Stores items in shopping lists.

```typescript
export const shoppingListItems = pgTable("shopping_list_items", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").references(() => shoppingLists.id).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id).notNull(),
  quantity: integer("quantity").notNull().default(1),
  completed: boolean("completed").default(false).notNull(),
  notes: text("notes")
});
```

### ActivityLogs

Tracks user activity in the system.

```typescript
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").notNull().defaultNow()
});
```

## Key Relationships

- **Owner to Properties**: One-to-many (an owner can have multiple properties)
- **Property to Inventory**: One-to-many (a property can have multiple inventory items)
- **Property to Expenses**: One-to-many (a property can have multiple expenses)
- **Inventory to Expenses**: One-to-many (an inventory item can be associated with multiple expenses)
- **Inventory to Refills**: One-to-many (an inventory item can have multiple refill records)
- **User to Shopping Lists**: One-to-many (a user can create multiple shopping lists)
- **Shopping List to Items**: One-to-many (a shopping list can contain multiple items)
- **Inventory to Shopping List Items**: One-to-many (an inventory item can be in multiple shopping lists)

## Indexes

The schema includes indexes on foreign keys and frequently queried fields to optimize performance:

- User ID indexes on user-related tables
- Owner ID indexes on property tables
- Listing ID indexes on inventory and expenses tables
- Inventory ID indexes on refills and shopping list items
- Date indexes on expenses and reports tables
