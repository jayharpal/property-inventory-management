export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  portfolioId?: number;
  createdAt?: Date;
  companyName:string;
}

export interface Report {
  id: number;
  name: string;
  type: 'monthly' | 'batch';
  ownerId?: number;
  ownerName?: string;
  month: number;
  year: number;
  filePath?: string;
  sent: boolean;
  batchId?: string;
  notes?: string;
  generatedAt: Date | null;
  portfolioId?: number;
}

export interface Inventory {
  id: number;
  name: string;
  description?: string;
  quantity: number;
  minQuantity?: number;
  costPrice: number;
  category: string;
  deleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ShoppingList {
  id: number;
  name: string;
  userId: number;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ShoppingListItem {
  id: number;
  shoppingListId: number;
  inventoryId: number;
  quantity: number;
  completed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  inventoryItem?: Inventory;
}

export interface Owner {
  id: number;
  name: string;
  email: string;
  phone?: string;
  markupPercentage: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Listing {
  id: number;
  name: string;
  address: string;
  propertyType: string;
  ownerId: number;
  beds?: number | null;
  baths?: number | null;
  image?: string | null;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Expense {
  id: number;
  listingId: number;
  inventoryId?: number;
  date: Date;
  totalCost: number;
  billedAmount: number;
  notes?: string;
  quantityUsed?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Add UserRole type and enum
export type UserRole = "standard_user" | "standard_admin" | "administrator";
export const userRoleEnum = {
  parse: (value: string): UserRole => {
    if (value === "standard_user" || value === "standard_admin" || value === "administrator") {
      return value as UserRole;
    }
    throw new Error(`Invalid role: ${value}`);
  },
  safeParse: (value: unknown) => {
    if (
      value === "standard_user" || 
      value === "standard_admin" || 
      value === "administrator"
    ) {
      return { success: true, data: value as UserRole };
    }
    return { success: false, error: new Error(`Invalid role: ${value}`) };
  }
};

// Add PropertyType type and enum
export type PropertyType = "apartment" | "house" | "condo" | "villa" | "cabin" | "other";
export const propertyTypeEnum = {
  parse: (value: string): PropertyType => {
    if (["apartment", "house", "condo", "villa", "cabin", "other"].includes(value)) {
      return value as PropertyType;
    }
    throw new Error(`Invalid property type: ${value}`);
  },
  safeParse: (value: unknown) => {
    if (
      value === "apartment" || 
      value === "house" || 
      value === "condo" || 
      value === "villa" || 
      value === "cabin" || 
      value === "other"
    ) {
      return { success: true, data: value as PropertyType };
    }
    return { success: false, error: new Error(`Invalid property type: ${value}`) };
  }
};

// Admin panel types
export interface UserStats {
  total: number;
  byRole: {
    administrators: number;
    standardAdmins: number;
    standardUsers: number;
  };
}

export interface PortfolioStats {
  total: number;
}

export interface OwnerStats {
  total: number;
}

export interface ListingStats {
  total: number;
}

export interface InventoryStats {
  total: number;
  lowStock: number;
}

export interface ExpenseOwnerStat {
  ownerName: string;
  totalExpenses: number;
}

export interface ExpenseStats {
  total: number;
  trend: Array<{
    month: string;
    total: number;
  }>;
  byOwner: Record<string, ExpenseOwnerStat>;
}

export interface AdminDashboardData {
  userStats: UserStats;
  portfolioStats: PortfolioStats;
  ownerStats: OwnerStats;
  listingStats: ListingStats;
  inventoryStats: InventoryStats;
  expenseStats: ExpenseStats;
}

// Define ChartDataPoint for use in DashboardData
export type ChartDataPoint = {
  label: string; // e.g., 'Mon', 'Jan 1', 'Feb \'23'
  expenses: number;
  profit: number;
  listingName: string;
  listingId: number;
  totalProfit: number;
  inventoryId:number;
  inventoryName:string;
};

// Dashboard types
export interface DashboardData {
  // Basic stats - standard fields
  totalListings: number;
  totalOwners: number;
  totalInventoryItems: number;
  monthlyProfit: number;
  monthlyRevenue: number;
  // Alternative field names that might come from the API
  totalProperties?: number;
  properties?: any[];
  activeOwners?: number;
  owners?: any[];
  inventoryCount?: number;
  inventory?: any[];
  profit?: number;
  markup?: number;
  
  // Chart data - updated structure
  expenseChartData: {
    weekData: ChartDataPoint[];
    monthData: ChartDataPoint[];
    yearData: ChartDataPoint[];
  };
  ProfitChartData: {
    weekData: ChartDataPoint[];
    monthData: ChartDataPoint[];
    yearData: ChartDataPoint[];
  };
  ProfitInventoryChartData: {
    weekData: ChartDataPoint[];
    monthData: ChartDataPoint[];
    yearData: ChartDataPoint[];
  };
  expenseTrends?: any; // Keep for potential backward compatibility or remove if not needed
  
  // Recent activity
  recentActivity: Array<{
    id: number;
    action: string;
    details: string;
    timestamp: string;
    userId: number;
    userName?: string;
  }>;
  
  // Recent listings
  recentListings: Array<Listing>;
  
  // Low inventory 
  lowInventoryItems: Array<{
    id: number;
    name: string;
    category: string;
    quantity: number;
    minQuantity: number;
  }>;
}

export interface ActivityLog {
  id: number;
  userId: number;
  action: string;
  details?: string;
  timestamp: Date;
} 