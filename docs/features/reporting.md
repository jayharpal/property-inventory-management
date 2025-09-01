# Reporting System

The reporting system generates comprehensive expense reports for property owners, providing clear visibility into property-related costs.

## Key Features

### Report Generation
- Create reports for specific date ranges
- Generate reports for individual owners or multiple owners (batches)
- Include detailed expense breakdowns by property
- Add custom notes to reports

### Report Formats
- View reports in the web interface
- Download reports as PDF documents
- Send reports via email

### Batch Reports
- Create report batches for multiple owners
- Generate all reports in a batch with one action
- Apply consistent date ranges across all reports in a batch

### Historical Access
- Store generated reports for future reference
- Access previous reports by date range or owner
- Track report distribution

## Implementation Details

### Reports Table Schema
- `id`: Unique identifier
- `title`: Report title
- `startDate`: Beginning of report period
- `endDate`: End of report period
- `ownerId`: Owner the report is for (null for batch reports)
- `batchId`: Optional batch identifier for grouped reports
- `notes`: Additional information
- `createdAt`: When the report was generated
- `updatedAt`: Last update timestamp

### Relevant API Endpoints

#### Reports
- `GET /api/reports` - List all reports
- `GET /api/reports/:id` - Get a specific report
- `GET /api/reports/owner/:ownerId` - Get reports for an owner
- `POST /api/reports` - Create a new report
- `PATCH /api/reports/:id` - Update a report
- `DELETE /api/reports/:id` - Delete a report
- `GET /api/reports/:id/download` - Download a report as PDF
- `POST /api/reports/email` - Send a report by email

## Report Generation Process

1. **Selection**: User selects date range and owner(s)
2. **Generation**: System queries all expenses within the date range for the selected owner(s)
3. **Organization**: Expenses are grouped by property
4. **Summary**: Total expenses are calculated for each property and overall
5. **Presentation**: Report is formatted for viewing
6. **Distribution**: Report can be downloaded as PDF or emailed to recipients

## Report Content

Each report includes:
- Report title and generation date
- Owner information
- Date range covered
- Summary of total expenses
- Number of properties included
- Detailed breakdown by property
- Expense tables with date, description, category, and amount
- Property subtotals
- Optional notes

## User Interface

The reporting interface provides:
- List of all generated reports
- Filters for date range and owners
- Form for creating new reports
- Batch report creation workflow
- Preview of report content
- Download and email options
- Deletion of outdated reports
