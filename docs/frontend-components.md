# Frontend Components

This document outlines the key components used in the Property Management Platform frontend.

## Page Components

These components represent full pages in the application:

### Dashboard Page
- **Path**: `/`
- **Component**: `DashboardPage`
- **Purpose**: Main dashboard with overview metrics
- **Features**: Quick stats cards, recent activity, charts

### Inventory Page
- **Path**: `/inventory`
- **Component**: `InventoryPage`
- **Purpose**: Manage inventory items for properties
- **Features**: 
  - Item list with filtering and sorting
  - Add/edit inventory items
  - Low stock indicators
  - Refill functionality

### Shopping Lists Page
- **Path**: `/shopping-lists`
- **Component**: `ShoppingListsPage`
- **Purpose**: Manage shopping lists for restocking inventory
- **Features**:
  - List of all shopping lists
  - Default low stock list
  - Create custom lists
  - Add items to lists
  - Mark items as completed
  - Refill inventory from completed items

### Expenses Page
- **Path**: `/expenses`
- **Component**: `ExpensesPage`
- **Purpose**: Record and manage property expenses
- **Features**:
  - List of all expenses with filtering
  - Add new expenses
  - Categorize expenses
  - Link expenses to inventory items
  - Assign expenses to properties

### Reports Page
- **Path**: `/reports`
- **Component**: `ReportsPage`
- **Purpose**: Generate and manage expense reports
- **Features**:
  - List of all reports
  - Create new reports
  - Download reports as PDF
  - Email reports to owners

### Batch Report Page
- **Path**: `/reports/batch/:id`
- **Component**: `BatchReportPage`
- **Purpose**: View and manage batch reports
- **Features**:
  - List of reports in the batch
  - Batch-wide actions (download all, etc.)

### Owner Report Page
- **Path**: `/reports/:id`
- **Component**: `OwnerReportPage`
- **Purpose**: View individual owner report
- **Features**:
  - Detailed expense breakdown
  - Property-specific expense tables
  - Download and email options

### Analytics Page
- **Path**: `/analytics`
- **Component**: `AnalyticsPage`
- **Purpose**: Visual analytics of expenses and inventory
- **Features**:
  - Expense trends over time
  - Category breakdown charts
  - Property comparison charts
  - Inventory value analysis

### Settings Page
- **Path**: `/settings`
- **Component**: `SettingsPage`
- **Purpose**: User profile and application settings
- **Features**:
  - User profile information
  - Theme settings
  - Notification preferences
  - Sign out functionality

## Layout Components

### Dashboard Layout
- **Component**: `DashboardLayout`
- **Purpose**: Main application layout with navigation
- **Features**:
  - Sidebar navigation
  - Header with user menu
  - Main content area

### Sidebar
- **Component**: `Sidebar`
- **Purpose**: Navigation menu for the application
- **Features**:
  - Links to all main sections
  - Collapsible on mobile
  - Active route highlighting

### Header
- **Component**: `Header`
- **Purpose**: Top bar with user controls
- **Features**:
  - User profile dropdown
  - Quick actions
  - Mobile menu toggle

## UI Components

### Data Display

#### DataTable
- **Component**: `DataTable`
- **Purpose**: Display tabular data with sorting and pagination
- **Used in**: Inventory, Expenses, Reports pages

#### StatusBadge
- **Component**: `StatusBadge`
- **Purpose**: Visual indicator for status (low stock, etc.)
- **Used in**: Inventory, Shopping List pages

#### ExpenseCard
- **Component**: `ExpenseCard`
- **Purpose**: Display expense information
- **Used in**: Expenses, Report pages

#### PropertyCard
- **Component**: `PropertyCard`
- **Purpose**: Display property information
- **Used in**: Dashboard, Reports pages

#### StatsCard
- **Component**: `StatsCard`
- **Purpose**: Display key metrics with icons
- **Used in**: Dashboard, Analytics pages

### Data Input

#### InventoryForm
- **Component**: `InventoryForm`
- **Purpose**: Add/edit inventory items
- **Used in**: Inventory page

#### ExpenseForm
- **Component**: `ExpenseForm`
- **Purpose**: Add/edit expenses
- **Used in**: Expenses page

#### ReportForm
- **Component**: `ReportForm`
- **Purpose**: Generate reports
- **Used in**: Reports page

#### ShoppingListForm
- **Component**: `ShoppingListForm`
- **Purpose**: Create shopping lists
- **Used in**: Shopping Lists page

### Visualization

#### ExpenseChart
- **Component**: `ExpenseChart`
- **Purpose**: Visualize expense data
- **Used in**: Analytics, Dashboard pages

#### CategoryPieChart
- **Component**: `CategoryPieChart`
- **Purpose**: Show expense breakdown by category
- **Used in**: Analytics page

#### TrendLineChart
- **Component**: `TrendLineChart`
- **Purpose**: Show trends over time
- **Used in**: Analytics, Dashboard pages

## Hooks and Utilities

### Custom Hooks

#### useInventory
- **Purpose**: Fetch and manage inventory data
- **Features**: List, filter, sort, create, update inventory items

#### useExpenses
- **Purpose**: Fetch and manage expense data
- **Features**: List, filter, sort, create, update expenses

#### useReports
- **Purpose**: Fetch and manage report data
- **Features**: List, generate, download reports

#### useShoppingLists
- **Purpose**: Fetch and manage shopping list data
- **Features**: List, create, update shopping lists and items

### Utility Functions

#### formatCurrency
- **Purpose**: Format numbers as currency

#### formatDate
- **Purpose**: Format dates in consistent format

#### calculateStockStatus
- **Purpose**: Determine stock status based on quantity and threshold
