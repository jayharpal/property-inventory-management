import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, setupMockFetch, cleanupMockFetch } from './test-utils';
import ReportsPage from '../../client/src/pages/reports-page';

// Mock reports data
const mockReports = [
  {
    id: 1,
    title: 'Q1 2025 Report',
    description: 'Quarterly report for all properties',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-03-31T23:59:59Z',
    ownerId: null,
    createdAt: '2025-04-01T15:00:00Z',
    updatedAt: '2025-04-01T15:00:00Z',
    batchId: 1,
    ownerCount: 3
  },
  {
    id: 2,
    title: 'March 2025 - John Smith Properties',
    description: 'Monthly report for John Smith',
    startDate: '2025-03-01T00:00:00Z',
    endDate: '2025-03-31T23:59:59Z',
    ownerId: 1,
    createdAt: '2025-04-01T16:30:00Z',
    updatedAt: '2025-04-01T16:30:00Z',
    batchId: null,
    ownerCount: 1
  }
];

// Mock batch report data
const mockBatchReport = {
  id: 1,
  title: 'Q1 2025 Report',
  description: 'Quarterly report for all properties',
  startDate: '2025-01-01T00:00:00Z',
  endDate: '2025-03-31T23:59:59Z',
  notes: 'This includes all properties managed during Q1 2025',
  createdAt: '2025-04-01T15:00:00Z',
  batchReports: [
    {
      id: 3,
      title: 'Q1 2025 - John Smith',
      description: 'Q1 report for John Smith properties',
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-03-31T23:59:59Z',
      ownerId: 1,
      owner: {
        id: 1,
        name: 'John Smith',
        email: 'john@example.com',
        phone: '555-1234'
      },
      totalExpenses: '1250.45',
      propertyCount: 2
    },
    {
      id: 4,
      title: 'Q1 2025 - Jane Doe',
      description: 'Q1 report for Jane Doe properties',
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-03-31T23:59:59Z',
      ownerId: 2,
      owner: {
        id: 2,
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '555-5678'
      },
      totalExpenses: '980.20',
      propertyCount: 1
    }
  ]
};

describe('ReportsPage Component', () => {
  beforeEach(() => {
    // Setup API mocks for different endpoints
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/reports') && !url.includes('/api/reports/batch/')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: async () => mockReports
        });
      } else if (url.includes('/api/reports/batch/1')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: async () => mockBatchReport
        });
      }
      return Promise.resolve({
        status: 404,
        ok: false
      });
    });
  });

  afterEach(() => {
    cleanupMockFetch();
  });
  
  test('renders the reports page with title', async () => {
    renderWithProviders(<ReportsPage />);
    
    // Check if the title is rendered
    expect(screen.getByText(/reports/i)).toBeInTheDocument();
    
    // Wait for the reports to be loaded
    await waitFor(() => {
      expect(screen.getByText('Q1 2025 Report')).toBeInTheDocument();
      expect(screen.getByText('March 2025 - John Smith Properties')).toBeInTheDocument();
    });
  });
  
  test('displays date ranges for reports', async () => {
    renderWithProviders(<ReportsPage />);
    
    // Wait for reports to load
    await waitFor(() => {
      // Check for formatted date ranges on report cards
      expect(screen.getByText(/Jan 1, 2025 - Mar 31, 2025/i)).toBeInTheDocument();
      expect(screen.getByText(/Mar 1, 2025 - Mar 31, 2025/i)).toBeInTheDocument();
    });
  });
  
  test('navigates to batch report details when clicked', async () => {
    renderWithProviders(<ReportsPage />);
    
    // Wait for reports to load
    await waitFor(() => {
      expect(screen.getByText('Q1 2025 Report')).toBeInTheDocument();
    });
    
    // Click on a batch report
    userEvent.click(screen.getByText('Q1 2025 Report'));
    
    // Check if we navigate to the batch details
    await waitFor(() => {
      expect(screen.getByText('Q1 2025 - John Smith')).toBeInTheDocument();
      expect(screen.getByText('Q1 2025 - Jane Doe')).toBeInTheDocument();
    });
  });
  
  test('shows owner counts on batch reports', async () => {
    renderWithProviders(<ReportsPage />);
    
    // Wait for reports to load
    await waitFor(() => {
      expect(screen.getByText('Q1 2025 Report')).toBeInTheDocument();
    });
    
    // Check for owner count
    const ownerCountElement = screen.getByText(/3 owners/i);
    expect(ownerCountElement).toBeInTheDocument();
  });
});