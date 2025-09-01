import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, setupMockFetch, cleanupMockFetch } from './test-utils';
import AnalyticsPage from '../../client/src/pages/analytics-page';

// Mock dashboard statistics data
const mockDashboardStats = {
  totalOwners: 3,
  totalListings: 5,
  totalExpenses: '3750.65',
  totalInventoryItems: 25,
  lowStockItems: 8,
  expensesByCategory: [
    { category: 'maintenance', total: '1250.30' },
    { category: 'supplies', total: '980.50' },
    { category: 'services', total: '1100.85' },
    { category: 'utilities', total: '419.00' }
  ],
  expensesByMonth: [
    { month: '2024-10-01T00:00:00.000Z', total: '520.75' },
    { month: '2024-11-01T00:00:00.000Z', total: '480.30' },
    { month: '2024-12-01T00:00:00.000Z', total: '550.20' },
    { month: '2025-01-01T00:00:00.000Z', total: '615.40' },
    { month: '2025-02-01T00:00:00.000Z', total: '635.80' },
    { month: '2025-03-01T00:00:00.000Z', total: '948.20' }
  ],
  expensesByProperty: [
    { listing: { address: '123 Main St' }, total: '1250.30' },
    { listing: { address: '456 Elm St' }, total: '980.50' },
    { listing: { address: '789 Oak Ave' }, total: '850.85' },
    { listing: { address: '321 Pine Rd' }, total: '669.00' }
  ],
  expensesByOwner: [
    { owner: { name: 'John Smith' }, total: '1620.35' },
    { owner: { name: 'Jane Doe' }, total: '1350.20' },
    { owner: { name: 'Bob Johnson' }, total: '780.10' }
  ],
  recentExpenses: [
    {
      id: 1,
      description: 'Plumbing repair',
      category: 'maintenance',
      amount: '350.00',
      date: '2025-03-15T14:30:00.000Z',
      listing: { address: '123 Main St' }
    },
    {
      id: 2,
      description: 'Monthly cleaning service',
      category: 'services',
      amount: '175.00',
      date: '2025-03-10T09:15:00.000Z',
      listing: { address: '456 Elm St' }
    }
  ]
};

describe('AnalyticsPage Component', () => {
  beforeEach(() => {
    // Setup API mocks
    setupMockFetch(mockDashboardStats);
  });

  afterEach(() => {
    cleanupMockFetch();
  });
  
  test('renders the analytics page with title', async () => {
    renderWithProviders(<AnalyticsPage />);
    
    // Check if the title is rendered
    expect(screen.getByText(/analytics dashboard/i)).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('$3,750.65')).toBeInTheDocument(); // Total expenses
    });
  });
  
  test('displays summary cards with correct information', async () => {
    renderWithProviders(<AnalyticsPage />);
    
    // Wait for data to load and check summary cards
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // Total owners
      expect(screen.getByText('5')).toBeInTheDocument(); // Total listings
      expect(screen.getByText('$3,750.65')).toBeInTheDocument(); // Total expenses
      expect(screen.getByText('25')).toBeInTheDocument(); // Total inventory items
      expect(screen.getByText('8')).toBeInTheDocument(); // Low stock items
    });
  });
  
  test('renders expense distribution charts', async () => {
    renderWithProviders(<AnalyticsPage />);
    
    // Wait for charts to load
    await waitFor(() => {
      expect(screen.getByText(/expenses by category/i)).toBeInTheDocument();
      expect(screen.getByText(/expenses by month/i)).toBeInTheDocument();
      expect(screen.getByText(/expenses by property/i)).toBeInTheDocument();
      expect(screen.getByText(/expenses by owner/i)).toBeInTheDocument();
    });
    
    // Check for chart data
    await waitFor(() => {
      expect(screen.getByText('maintenance')).toBeInTheDocument();
      expect(screen.getByText('supplies')).toBeInTheDocument();
      expect(screen.getByText('services')).toBeInTheDocument();
      expect(screen.getByText('utilities')).toBeInTheDocument();
    });
  });
  
  test('displays recent expenses table', async () => {
    renderWithProviders(<AnalyticsPage />);
    
    // Wait for recent expenses to load
    await waitFor(() => {
      expect(screen.getByText(/recent expenses/i)).toBeInTheDocument();
      expect(screen.getByText('Plumbing repair')).toBeInTheDocument();
      expect(screen.getByText('Monthly cleaning service')).toBeInTheDocument();
      expect(screen.getByText('$350.00')).toBeInTheDocument();
      expect(screen.getByText('$175.00')).toBeInTheDocument();
    });
  });
  
  test('shows property expense breakdown', async () => {
    renderWithProviders(<AnalyticsPage />);
    
    // Wait for property expenses to load
    await waitFor(() => {
      expect(screen.getByText('123 Main St')).toBeInTheDocument();
      expect(screen.getByText('456 Elm St')).toBeInTheDocument();
      expect(screen.getByText('789 Oak Ave')).toBeInTheDocument();
      expect(screen.getByText('321 Pine Rd')).toBeInTheDocument();
    });
  });
});