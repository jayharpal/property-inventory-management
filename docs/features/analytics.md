# Analytics Dashboard

The analytics dashboard provides visual insights into property expenses, inventory status, and overall financial performance.

## Key Features

### Expense Analytics
- Total expenses by property
- Expense breakdown by category
- Monthly expense trends
- Comparison of expenses across properties

### Inventory Analytics
- Low stock items overview
- Inventory value by property
- Most frequently restocked items
- Inventory expense trends

### Financial Insights
- Total expenses vs. time
- Average monthly expenses
- Highest expense categories
- Expense anomaly detection

### Dashboard Layout
- Overview cards with key metrics
- Interactive charts and graphs
- Filterable time periods
- Responsive design for all device sizes

## Implementation Details

### Data Sources
The analytics dashboard aggregates data from:
- Expense records
- Inventory items and refill history
- Property listings
- Owner information

### Chart Types
- Bar charts for category comparisons
- Line charts for time-based trends
- Pie charts for distribution analysis
- Area charts for cumulative data

### Relevant API Endpoints

#### Analytics Data
- `GET /api/stats/dashboard` - Get overview statistics
- `GET /api/stats/expenses/trend` - Get expense trends over time
- `GET /api/stats/expenses/by-category` - Get expenses grouped by category
- `GET /api/stats/expenses/by-property` - Get expenses grouped by property
- `GET /api/stats/inventory/low-stock` - Get low stock statistics

## Dashboard Sections

### Overview Section
- Total properties managed
- Total owners
- Total expenses (current month)
- Total expenses (year to date)
- Active inventory items
- Low stock items count

### Expense Analysis Section
- Monthly expense trend chart
- Expense breakdown by category
- Top expense properties

### Inventory Section
- Low stock items summary
- Inventory value by property
- Recent inventory refills

## User Experience

The analytics dashboard is designed to:
- Present complex data in easily digestible visuals
- Allow drilling down into specific metrics
- Support decision-making with clear financial insights
- Update in real-time as new data is added
- Provide export options for reports and charts

## Technical Implementation

The dashboard is built using:
- React for component structure
- Recharts for data visualization
- TanStack Query for data fetching
- Tailwind CSS for responsive layout
- Server-side data aggregation for performance
