import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, setupMockFetch, cleanupMockFetch } from './test-utils';
import ExpensesPage from '../../client/src/pages/expenses-page';

// Mock expenses data
const mockExpenses = [
  {
    id: 1,
    description: 'Plumbing repair',
    category: 'maintenance',
    amount: '350.00',
    date: '2025-03-15T14:30:00.000Z',
    listingId: 1,
    listing: {
      id: 1,
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      ownerId: 1,
      owner: {
        id: 1,
        name: 'John Smith'
      }
    },
    inventoryItemId: null,
    inventoryItem: null
  },
  {
    id: 2,
    description: 'Monthly cleaning service',
    category: 'services',
    amount: '175.00',
    date: '2025-03-10T09:15:00.000Z',
    listingId: 2,
    listing: {
      id: 2,
      address: '456 Elm St',
      city: 'Anytown',
      state: 'CA',
      ownerId: 2,
      owner: {
        id: 2,
        name: 'Jane Doe'
      }
    },
    inventoryItemId: null,
    inventoryItem: null
  },
  {
    id: 3,
    description: 'Toilet paper restock',
    category: 'supplies',
    amount: '24.99',
    date: '2025-03-08T11:45:00.000Z',
    listingId: 1,
    listing: {
      id: 1,
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      ownerId: 1,
      owner: {
        id: 1,
        name: 'John Smith'
      }
    },
    inventoryItemId: 1,
    inventoryItem: {
      id: 1,
      name: 'Toilet Paper'
    }
  }
];

// Mock listings data for form
const mockListings = [
  {
    id: 1,
    address: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    ownerId: 1
  },
  {
    id: 2,
    address: '456 Elm St',
    city: 'Anytown',
    state: 'CA',
    ownerId: 2
  }
];

// Mock inventory data for form
const mockInventory = [
  {
    id: 1,
    name: 'Toilet Paper',
    category: 'supplies',
    quantity: 24,
    unitPrice: '0.75'
  },
  {
    id: 2,
    name: 'Hand Soap',
    category: 'supplies',
    quantity: 5,
    unitPrice: '3.99'
  }
];

describe('ExpensesPage Component', () => {
  beforeEach(() => {
    // Setup API mocks for different endpoints
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/expenses')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: async () => mockExpenses
        });
      } else if (url.includes('/api/listings')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: async () => mockListings
        });
      } else if (url.includes('/api/inventory')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: async () => mockInventory
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
  
  test('renders the expenses page with title', async () => {
    renderWithProviders(<ExpensesPage />);
    
    // Check if the title is rendered
    expect(screen.getByText(/expenses/i)).toBeInTheDocument();
    
    // Wait for the expenses to be loaded
    await waitFor(() => {
      expect(screen.getByText('Plumbing repair')).toBeInTheDocument();
      expect(screen.getByText('Monthly cleaning service')).toBeInTheDocument();
      expect(screen.getByText('Toilet paper restock')).toBeInTheDocument();
    });
  });
  
  test('displays expense details with proper formatting', async () => {
    renderWithProviders(<ExpensesPage />);
    
    // Wait for expenses to load
    await waitFor(() => {
      // Check amounts are formatted as currency
      expect(screen.getByText('$350.00')).toBeInTheDocument();
      expect(screen.getByText('$175.00')).toBeInTheDocument();
      expect(screen.getByText('$24.99')).toBeInTheDocument();
      
      // Check categories are displayed
      expect(screen.getByText('maintenance')).toBeInTheDocument();
      expect(screen.getByText('services')).toBeInTheDocument();
      expect(screen.getByText('supplies')).toBeInTheDocument();
      
      // Check property information
      expect(screen.getAllByText('123 Main St').length).toBeGreaterThan(0);
      expect(screen.getByText('456 Elm St')).toBeInTheDocument();
    });
  });
  
  test('shows inventory item information for inventory-related expenses', async () => {
    renderWithProviders(<ExpensesPage />);
    
    // Wait for expenses to load
    await waitFor(() => {
      expect(screen.getByText('Toilet paper restock')).toBeInTheDocument();
    });
    
    // Check that inventory item info is displayed
    const inventoryItem = screen.getByText('Toilet Paper');
    expect(inventoryItem).toBeInTheDocument();
  });
  
  test('opens new expense form when add button is clicked', async () => {
    renderWithProviders(<ExpensesPage />);
    
    // Wait for expenses to load
    await waitFor(() => {
      expect(screen.getByText('Plumbing repair')).toBeInTheDocument();
    });
    
    // Click on add expense button
    const addButton = screen.getByText(/add expense/i);
    userEvent.click(addButton);
    
    // Check that form appears
    await waitFor(() => {
      expect(screen.getByText(/log new expense/i)).toBeInTheDocument();
      
      // Form fields
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/property/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });
  });
});