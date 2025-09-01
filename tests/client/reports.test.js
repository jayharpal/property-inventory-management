import { setupMockFetch, cleanupMockFetch, createMockData } from './test-utils';

// Create mock reports
const mockReports = [
  {
    id: 1,
    ownerId: 1,
    title: 'Monthly Expense Report',
    dateRange: 'March 2025',
    generatedAt: new Date().toISOString(),
    totalExpenses: '225.50',
    batchId: null,
    reportUrl: '/temp-reports/report_1_3_2025_1743176521383.pdf',
  },
  {
    id: 2,
    ownerId: 2,
    title: 'Quarterly Expense Report',
    dateRange: 'Q1 2025',
    generatedAt: new Date().toISOString(),
    totalExpenses: '450.75',
    batchId: 1,
    reportUrl: '/temp-reports/report_2_3_2025_1743445255620.pdf',
  },
  {
    id: 3,
    ownerId: 3,
    title: 'Annual Expense Report',
    dateRange: '2024',
    generatedAt: new Date().toISOString(),
    totalExpenses: '1200.00',
    batchId: 1,
    reportUrl: '/temp-reports/report_3_3_2025_1743445255620.pdf',
  },
];

// Create mock report batches
const mockReportBatches = [
  {
    id: 1,
    title: 'Q1 Reports Batch',
    generatedAt: new Date().toISOString(),
    notes: 'Quarterly reports for all owners',
    ownerCount: 2,
    reports: [mockReports[1], mockReports[2]],
  },
];

// Create mock owners
const mockOwners = [
  createMockData.owner({
    id: 1,
    name: 'John Doe',
  }),
  createMockData.owner({
    id: 2,
    name: 'Jane Smith',
  }),
  createMockData.owner({
    id: 3,
    name: 'Bob Johnson',
  }),
];

// Mock API responses for report endpoints
const mockResponses = {
  '/api/reports': mockReports,
  '/api/reports/1': mockReports[0],
  '/api/reports/batches': mockReportBatches,
  '/api/reports/batches/1': mockReportBatches[0],
  '/api/reports/owner/1': [mockReports[0]],
  '/api/reports/batch/1': [mockReports[1], mockReports[2]],
  '/api/owners': mockOwners,
};

describe('Reports API Calls', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = setupMockFetch(mockResponses);
  });

  afterEach(() => {
    cleanupMockFetch(originalFetch);
  });

  it('fetches all reports', async () => {
    const response = await fetch('/api/reports');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(3);
    expect(data[0].title).toBe('Monthly Expense Report');
  });

  it('fetches a specific report by ID', async () => {
    const response = await fetch('/api/reports/1');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.id).toBe(1);
    expect(data.title).toBe('Monthly Expense Report');
    expect(data.ownerId).toBe(1);
  });

  it('fetches reports for a specific owner', async () => {
    const response = await fetch('/api/reports/owner/1');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0].ownerId).toBe(1);
  });

  it('fetches all report batches', async () => {
    const response = await fetch('/api/reports/batches');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0].title).toBe('Q1 Reports Batch');
    expect(data[0].ownerCount).toBe(2);
  });

  it('fetches a specific report batch by ID', async () => {
    const response = await fetch('/api/reports/batches/1');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.id).toBe(1);
    expect(data.title).toBe('Q1 Reports Batch');
    expect(Array.isArray(data.reports)).toBe(true);
    expect(data.reports.length).toBe(2);
  });

  it('fetches reports in a specific batch', async () => {
    const response = await fetch('/api/reports/batch/1');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
    expect(data[0].batchId).toBe(1);
    expect(data[1].batchId).toBe(1);
  });

  it('generates a new report', async () => {
    // Mock POST request response
    const newReportMock = {
      id: 4,
      ownerId: 1,
      title: 'New Generated Report',
      dateRange: 'April 2025',
      generatedAt: new Date().toISOString(),
      totalExpenses: '175.25',
      batchId: null,
      reportUrl: '/temp-reports/report_1_4_2025_1743576521383.pdf',
    };
    
    // Override fetch for this test only
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/api/reports/generate') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => newReportMock,
        });
      }
      
      // Default mock response
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });
    });
    
    const reportParams = {
      ownerId: 1,
      title: 'New Generated Report',
      startDate: '2025-04-01',
      endDate: '2025-04-30',
    };
    
    const response = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportParams),
    });
    
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.id).toBe(4);
    expect(data.title).toBe('New Generated Report');
    expect(data.ownerId).toBe(1);
    expect(data.reportUrl).toBeDefined();
  });

  it('generates a new report batch', async () => {
    // Mock POST request response
    const newBatchMock = {
      id: 2,
      title: 'New Batch Report',
      generatedAt: new Date().toISOString(),
      notes: 'Test batch report',
      ownerCount: 3,
      reports: [
        {
          id: 5,
          ownerId: 1,
          title: 'New Generated Report 1',
          dateRange: 'April 2025',
          generatedAt: new Date().toISOString(),
          totalExpenses: '175.25',
          batchId: 2,
          reportUrl: '/temp-reports/report_1_4_2025_1743576521383.pdf',
        },
        {
          id: 6,
          ownerId: 2,
          title: 'New Generated Report 2',
          dateRange: 'April 2025',
          generatedAt: new Date().toISOString(),
          totalExpenses: '225.50',
          batchId: 2,
          reportUrl: '/temp-reports/report_2_4_2025_1743576521383.pdf',
        },
        {
          id: 7,
          ownerId: 3,
          title: 'New Generated Report 3',
          dateRange: 'April 2025',
          generatedAt: new Date().toISOString(),
          totalExpenses: '300.75',
          batchId: 2,
          reportUrl: '/temp-reports/report_3_4_2025_1743576521383.pdf',
        },
      ],
    };
    
    // Override fetch for this test only
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/api/reports/generate-batch') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => newBatchMock,
        });
      }
      
      // Default mock response
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });
    });
    
    const batchParams = {
      title: 'New Batch Report',
      ownerIds: [1, 2, 3],
      startDate: '2025-04-01',
      endDate: '2025-04-30',
      notes: 'Test batch report',
    };
    
    const response = await fetch('/api/reports/generate-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchParams),
    });
    
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.id).toBe(2);
    expect(data.title).toBe('New Batch Report');
    expect(data.ownerCount).toBe(3);
    expect(Array.isArray(data.reports)).toBe(true);
    expect(data.reports.length).toBe(3);
  });

  it('deletes a report batch', async () => {
    // Mock DELETE request response
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/api/reports/batches/1') && options.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });
      }
      
      // Default mock response
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });
    });
    
    const response = await fetch('/api/reports/batches/1', {
      method: 'DELETE',
    });
    
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
  });
});