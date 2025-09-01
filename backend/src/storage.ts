import * as schema from "./schema/schema.js";
import { 
  users, type User, type InsertUser, 
  owners, type Owner, type InsertOwner, 
  listings, type Listing, type InsertListing, 
  inventory, type Inventory, type InsertInventory, 
  expenses, type Expense, type InsertExpense, 
  userSettings, type UserSettings, type InsertUserSettings, 
  activityLogs, type ActivityLog, type InsertActivityLog, 
  reports, type Report, type InsertReport,
  // Portfolio and user role management
  portfolios, type Portfolio, type InsertPortfolio,
  invitations, type Invitation, type InsertInvitation,
  // Shopping and inventory management
  shoppingLists, type ShoppingList, type InsertShoppingList,
  shoppingListItems, type ShoppingListItem, type InsertShoppingListItem,
  inventoryRefills, type InventoryRefill, type InsertInventoryRefill,
  // Enums
  type UserRole, userRoleEnum
} from "./schema/schema.js";
import session from "express-session";
import { db } from "./db.js";
import { eq, and, or, lt, lte, desc, isNull, not, inArray } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db.js";

const PostgresSessionStore = connectPg(session);

// Storage interface
export interface IStorage {
  // Schema access for admin routes
  schema: typeof schema;
  
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Portfolios
  getPortfolio(id: number): Promise<Portfolio | undefined>;
  getPortfoliosByUser(userId: number): Promise<Portfolio[]>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  updatePortfolio(id: number, portfolio: Partial<InsertPortfolio>): Promise<Portfolio | undefined>;
  deletePortfolio(id: number): Promise<boolean>;
  
  // Invitations
  getInvitation(id: number): Promise<Invitation | undefined>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  getInvitationsByPortfolio(portfolioId: number): Promise<Invitation[]>;
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  updateInvitation(id: number, invitation: Partial<InsertInvitation>): Promise<Invitation | undefined>;
  deleteInvitation(id: number): Promise<boolean>;
  acceptInvitation(token: string, userId: number): Promise<boolean>;

  // Owners
  getOwners(portfolioId?: number): Promise<Owner[]>;
  getOwner(id: number): Promise<Owner | undefined>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner | undefined>;
  deleteOwner(id: number): Promise<boolean>;
  
  // Listings
  getListings(): Promise<Listing[]>;
  getListingsByOwner(ownerId: number): Promise<Listing[]>;
  getListing(id: number): Promise<Listing | undefined>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: number, listing: Partial<InsertListing>): Promise<Listing | undefined>;
  deleteListing(id: number): Promise<boolean>;
  
  // Inventory
  getInventory(portfolioId?: number): Promise<Inventory[]>;
  getInventoryItem(id: number): Promise<Inventory | undefined>;
  createInventoryItem(inventoryItem: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, inventoryItem: Partial<InsertInventory>): Promise<Inventory | undefined>;
  deleteInventoryItem(id: number): Promise<boolean>;
  getLowInventoryItems(portfolioId?: number): Promise<Inventory[]>;
  
  // Inventory Refills
  getInventoryRefills(inventoryId?: number): Promise<InventoryRefill[]>;
  getInventoryRefill(id: number): Promise<InventoryRefill | undefined>;
  createInventoryRefill(refill: InsertInventoryRefill): Promise<InventoryRefill>;
  deleteInventoryRefill(id: number): Promise<boolean>;
  refillInventoryItem(inventoryId: number, quantity: number, cost?: string, notes?: string, userId?: number): Promise<Inventory>;
  batchRefillInventory(refills: InsertInventoryRefill[]): Promise<Inventory[]>;
  
  // Shopping Lists
  getShoppingLists(userId?: number): Promise<ShoppingList[]>;
  getShoppingList(id: number): Promise<ShoppingList | undefined>;
  createShoppingList(list: InsertShoppingList): Promise<ShoppingList>;
  updateShoppingList(id: number, list: Partial<InsertShoppingList>): Promise<ShoppingList | undefined>;
  deleteShoppingList(id: number): Promise<boolean>;
  getDefaultLowStockList(userId: number): Promise<ShoppingList>;
  
  // Shopping List Items
  getShoppingListItems(listId: number): Promise<(ShoppingListItem & { inventoryItem?: Inventory })[]>;
  getShoppingListItem(id: number): Promise<ShoppingListItem | undefined>;
  addItemToShoppingList(item: InsertShoppingListItem): Promise<ShoppingListItem>;
  updateShoppingListItem(id: number, item: Partial<InsertShoppingListItem>): Promise<ShoppingListItem | undefined>;
  removeItemFromShoppingList(id: number): Promise<boolean>;
  markItemAsCompleted(id: number, completed: boolean): Promise<ShoppingListItem | undefined>;
  refillCompletedItems(listId: number, userId?: number): Promise<Inventory[]>;
  
  // Expenses
  getExpenses(): Promise<Expense[]>;
  getExpensesByListing(listingId: number): Promise<Expense[]>;
  getExpensesByOwner(ownerId: number): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  
  // User Settings
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined>;
  
  // Activity Logs
  getActivityLogs(userId: number): Promise<ActivityLog[]>;
  getAllActivityLogs(): Promise<ActivityLog[]>;
  createActivityLog(activityLog: InsertActivityLog & { timestamp?: Date }): Promise<ActivityLog>;
  
  // Reports
  getReports(portfolioId?: number): Promise<Report[]>;
  getReportsByOwner(ownerId: number): Promise<Report[]>;
  getReport(id: number): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: number, report: Partial<InsertReport>): Promise<Report | undefined>;
  deleteReport(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  schema = schema;

  constructor() {
    try {
      console.log('Setting up session store...');
      
      // Attempt to use PostgreSQL session store
      this.sessionStore = new PostgresSessionStore({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true,
        pruneSessionInterval: 60 // prune expired sessions every minute
      });
      
      console.log('Using PostgreSQL session store for persistence');
    } catch (error) {
      console.error('Error initializing PostgreSQL session store:', error);
      // Create a fallback memory store
      console.log('Using memory store as fallback');
      const MemoryStore = session.MemoryStore;
      this.sessionStore = new MemoryStore();
      console.warn('WARNING: Using in-memory session store. Sessions will be lost on restart.');
    }
  }
  
  // Admin methods
  async getAllUsers(): Promise<User[]> {
    // Limit to 1000 users for performance
    return db.select().from(users).limit(1000);
  }
  
  async getAllPortfolios(): Promise<Portfolio[]> {
    // Limit to 1000 portfolios for performance
    return db.select().from(portfolios).limit(1000);
  }
  
  async getAllActivityLogs(): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).orderBy(desc(activityLogs.id)).limit(1000);
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Prepare insert values with proper typing
    const insertValues = {
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      firstName: insertUser.firstName,
      lastName: insertUser.lastName,
      companyName:insertUser.companyName,
      // For any field that uses an enum, parse it through the zod enum validator
      role: userRoleEnum.parse(insertUser.role || 'standard_admin'), // Default to standard_admin if not provided
      portfolioId: insertUser.portfolioId
    };
    
    const [user] = await db.insert(users).values(insertValues).returning();
    return user;
  }
  
  async updateUser(id: number, updatedUser: Partial<InsertUser>): Promise<User | undefined> {
    // Create a clean update object
    const updateValues: any = {
      updatedAt: new Date()
    };
    
    // Copy non-enum fields
    if (updatedUser.username !== undefined) updateValues.username = updatedUser.username;
    if (updatedUser.password !== undefined) updateValues.password = updatedUser.password;
    if (updatedUser.email !== undefined) updateValues.email = updatedUser.email;
    if (updatedUser.firstName !== undefined) updateValues.firstName = updatedUser.firstName;
    if (updatedUser.lastName !== undefined) updateValues.lastName = updatedUser.lastName;
    if (updatedUser.portfolioId !== undefined) updateValues.portfolioId = updatedUser.portfolioId;
    if (updatedUser.companyName !== undefined) updateValues.companyName = updatedUser.companyName;

    // Handle role field with proper enum parsing
    if (updatedUser.role !== undefined) {
      try {
        updateValues.role = userRoleEnum.parse(updatedUser.role);
      } catch (error) {
        throw new Error(`Invalid role: ${updatedUser.role}`);
      }
    }
    
    const [user] = await db
      .update(users)
      .set(updateValues)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  // Portfolios
  async getPortfolio(id: number): Promise<Portfolio | undefined> {
    const [portfolio] = await db.select().from(portfolios).where(eq(portfolios.id, id));
    return portfolio;
  }
  
  async getPortfoliosByUser(userId: number): Promise<Portfolio[]> {
    try {
      // Get portfolios that the user is directly connected to
      const userResult = await db.select({portfolioId: users.portfolioId}).from(users).where(eq(users.id, userId));
      const portfolioIds = userResult.map(u => u.portfolioId).filter(id => id !== null) as number[];
      
      // Also get portfolios that the user created
      const createdPortfolios = await db.select().from(portfolios).where(eq(portfolios.createdBy, userId));
      
      // Combine all unique portfolios
      const allPortfolios = [...createdPortfolios];
      
      // If user has a portfolioId, add that portfolio if not already included
      if (portfolioIds.length > 0) {
        const additionalPortfolios = await db.select().from(portfolios)
          .where(inArray(portfolios.id, portfolioIds));
        
        // Add any portfolios not already included
        for (const portfolio of additionalPortfolios) {
          if (!allPortfolios.some(p => p.id === portfolio.id)) {
            allPortfolios.push(portfolio);
          }
        }
      }
      
      return allPortfolios;
    } catch (error) {
      console.error("Error in getPortfoliosByUser:", error);
      // Return empty array rather than letting the error propagate
      return [];
    }
  }
  
  async createPortfolio(insertPortfolio: InsertPortfolio): Promise<Portfolio> {
    const [portfolio] = await db.insert(portfolios).values(insertPortfolio).returning();
    return portfolio;
  }
  
  async updatePortfolio(id: number, updatedPortfolio: Partial<InsertPortfolio>): Promise<Portfolio | undefined> {
    const [portfolio] = await db
      .update(portfolios)
      .set({...updatedPortfolio, updatedAt: new Date()})
      .where(eq(portfolios.id, id))
      .returning();
    return portfolio;
  }
  
  async deletePortfolio(id: number): Promise<boolean> {
    const result = await db.delete(portfolios).where(eq(portfolios.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Invitations
  async getInvitation(id: number): Promise<Invitation | undefined> {
    const [invitation] = await db.select().from(invitations).where(eq(invitations.id, id));
    return invitation;
  }
  
  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const [invitation] = await db.select().from(invitations).where(eq(invitations.token, token));
    return invitation;
  }
  
  async getInvitationsByPortfolio(portfolioId: number): Promise<Invitation[]> {
    return db.select().from(invitations).where(eq(invitations.portfolioId, portfolioId));
  }
  
  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    // Generate token and set expiry date (24 hours from now)
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Prepare values for insert
    const insertValues = {
      email: invitation.email,
      portfolioId: invitation.portfolioId,
      token: token,
      expiresAt: expiresAt,
      // Cast role to a specific enum member
      role: userRoleEnum.parse(invitation.role || 'standard_user'), // Default to standard_user if not provided
      accepted: false  // Always start with accepted=false
    };
    
    const [newInvitation] = await db.insert(invitations).values(insertValues).returning();
    return newInvitation;
  }
  
  async updateInvitation(id: number, updatedInvitation: Partial<InsertInvitation>): Promise<Invitation | undefined> {
    // Create a clean update object
    const updateValues: any = {};
    
    // Copy fields from the update request
    if (updatedInvitation.email !== undefined) updateValues.email = updatedInvitation.email;
    if (updatedInvitation.portfolioId !== undefined) updateValues.portfolioId = updatedInvitation.portfolioId;
    
    // For resends, always generate a new token and expiry date
    // Generate token and set expiry date (24 hours from now)
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Add these to update values
    updateValues.token = token;
    updateValues.expiresAt = expiresAt;
    
    // Handle accepted field explicitly
    if ('accepted' in updatedInvitation) updateValues.accepted = Boolean(updatedInvitation.accepted);
    
    // Handle role field with proper enum parsing
    if (updatedInvitation.role !== undefined) {
      try {
        updateValues.role = userRoleEnum.parse(updatedInvitation.role);
      } catch (error) {
        throw new Error(`Invalid role: ${updatedInvitation.role}`);
      }
    }
    
    const [invitation] = await db
      .update(invitations)
      .set(updateValues)
      .where(eq(invitations.id, id))
      .returning();
    return invitation;
  }
  
  async deleteInvitation(id: number): Promise<boolean> {
    const result = await db.delete(invitations).where(eq(invitations.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  async acceptInvitation(token: string, userId: number): Promise<boolean> {
    // Get the invitation
    const invitation = await this.getInvitationByToken(token);
    if (!invitation || invitation.accepted || new Date(invitation.expiresAt) < new Date()) {
      return false;
    }
    
    // Mark invitation as accepted
    const [updatedInvitation] = await db
      .update(invitations)
      .set({ accepted: true })
      .where(eq(invitations.id, invitation.id))
      .returning();
    
    if (!updatedInvitation) {
      return false;
    }
    
    // Process the user role safely
    const userRole = userRoleEnum.parse(invitation.role);
    
    // Update user to be part of the portfolio
    await this.updateUser(userId, { 
      portfolioId: invitation.portfolioId,
      role: userRole
    });
    
    return true;
  }

  //userprofile
  async updateUserProfile(id: number, updateuserprofile: Partial<schema.InsertUser>): Promise<User | undefined> {
    const [userprofile] = await db
      .update(users)
      .set(updateuserprofile)
      .where(eq(users.id, id))
      .returning();
    return userprofile;
  }

  async updateUserPassword(id: number, data: { password: string }): Promise<User | undefined> {
    const [userprofile] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return userprofile;
  }

  // Owners
  async getOwners(portfolioId?: number): Promise<Owner[]> {
    if (portfolioId) {
      return db.select().from(owners).where(eq(owners.portfolioId, portfolioId));
    }
    return db.select().from(owners);
  }

  async getOwner(id: number): Promise<Owner | undefined> {
    const [owner] = await db.select().from(owners).where(eq(owners.id, id));
    return owner;
  }

  async createOwner(insertOwner: InsertOwner): Promise<Owner> {
    const [owner] = await db.insert(owners).values(insertOwner).returning();
    return owner;
  }

  async updateOwner(id: number, updatedOwner: Partial<InsertOwner>): Promise<Owner | undefined> {
    const [owner] = await db
      .update(owners)
      .set(updatedOwner)
      .where(eq(owners.id, id))
      .returning();
    return owner;
  }

  async deleteOwner(id: number): Promise<boolean> {
    const result = await db.delete(owners).where(eq(owners.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Listings
  async getListings(portfolioId?: number): Promise<Listing[]> {
    if (portfolioId) {
      // Join with listings table to filter by portfolioId
      const results = await db.select()
        .from(listings)
        .where(eq(listings.portfolioId, portfolioId));
      return results;
    }
    // Just return all listings
    return db.select().from(listings);
  }

  async getListingsByOwner(ownerId: number): Promise<Listing[]> {
    return db.select().from(listings).where(eq(listings.ownerId, ownerId));
  }

  async getListing(id: number): Promise<Listing | undefined> {
    const [listing] = await db.select().from(listings).where(eq(listings.id, id));
    return listing;
  }

  async createListing(insertListing: InsertListing): Promise<Listing> {
    // Prepare data for DB insertion, converting numbers to strings where necessary for decimal fields
    const dataForDb = {
      ...insertListing,
      // beds is integer, Drizzle might handle number directly, but explicit string is safer for consistency if needed elsewhere
      beds: insertListing.beds !== undefined && insertListing.beds !== null ? insertListing.beds : undefined, 
      // baths is decimal, Drizzle expects string for decimal types
      baths: insertListing.baths !== undefined && insertListing.baths !== null ? String(insertListing.baths) : undefined,
      // image can be string or null, Zod schema handles optionality
      image: insertListing.image !== undefined ? insertListing.image : null,
    };
    // Ensure all required fields that are not directly in insertListing but are in the table (like portfolioId)
    // are correctly typed and present if needed. insertListing should already conform to InsertListing type.

    // @ts-ignore
    const [listing] = await db.insert(listings).values(dataForDb).returning();
    return listing;
  }

  async updateListing(id: number, updatedListingData: Partial<InsertListing>): Promise<Listing | undefined> {
    // Explicitly construct the object for Drizzle, ensuring correct types
    const dataForSet: { [key: string]: any } = {};

    // Iterate over keys in the input data (which is Zod-coerced InsertListing)
    for (const key in updatedListingData) {
      if (Object.prototype.hasOwnProperty.call(updatedListingData, key)) {
        const value = updatedListingData[key as keyof InsertListing];

        if (key === 'beds') {
          dataForSet.beds = (value !== undefined && value !== null) ? Number(value) : null;
        } else if (key === 'baths') {
          dataForSet.baths = (value !== undefined && value !== null) ? String(value) : null;
        } else if (key === 'image') {
          dataForSet.image = (value !== undefined) ? value : null; // string or null
        } else if (value !== undefined) {
          // For other keys, assign if value is not undefined
          // This includes name, address, propertyType, ownerId, active, portfolioId
          // Zod schema already coerced ownerId and portfolioId to number if they were strings
          dataForSet[key] = value;
        }
      }
    }
    
    // Ensure there's something to update if dataForSet is empty after processing
    if (Object.keys(dataForSet).length === 0) {
      // If nothing to update, maybe just refetch and return the listing?
      // Or throw an error, or handle as per your application logic for empty updates.
      // For now, just proceed, Drizzle might handle empty set gracefully or not.
      // Consider fetching and returning if no actual changes are made.
      console.warn(`UpdateListing called for ID ${id} with no effectively changed data after type conversion.`);
    }

    const [listing] = await db
      .update(listings)
      .set(dataForSet) // Pass the explicitly typed object
      .where(eq(listings.id, id))
      .returning();
    return listing;
  }

  async deleteListing(id: number): Promise<boolean> {
    const result = await db.delete(listings).where(eq(listings.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Inventory
  async getInventory(portfolioId?: number): Promise<Inventory[]> {
    if (portfolioId) {
      return db.select()
        .from(inventory)
        .where(
          and(
            eq(inventory.deleted, false),
            eq(inventory.portfolioId, portfolioId)
          )
        )
        .orderBy(desc(inventory.createdAt));
    }
    return db.select()
      .from(inventory)
      .where(eq(inventory.deleted, false))
      .orderBy(desc(inventory.createdAt));
  }

  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    const [item] = await db.select().from(inventory).where(eq(inventory.id, id));
    return item;
  }

  async createInventoryItem(insertInventory: InsertInventory): Promise<Inventory> {
    const [item] = await db.insert(inventory).values(insertInventory).returning();
    return item;
  }

  async updateInventoryItem(id: number, updatedInventory: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const [item] = await db
      .update(inventory)
      .set(updatedInventory)
      .where(eq(inventory.id, id))
      .returning();
    return item;
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    const result = await db.delete(inventory).where(eq(inventory.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  async getLowInventoryItems(portfolioId?: number): Promise<Inventory[]> {
    const conditions = [
      or(
        // Items with quantity less than minQuantity (defined low stock level)
        lt(inventory.quantity, inventory.minQuantity),
        // Also include items with quantity <= 5 as generally low stock
        lte(inventory.quantity, 5)
      ),
      eq(inventory.deleted, false)
    ];
    
    if (portfolioId) {
      conditions.push(eq(inventory.portfolioId, portfolioId));
    }
    
    return db
      .select()
      .from(inventory)
      .where(and(...conditions))
      .orderBy(desc(inventory.createdAt));
  }

  // Expenses
  async getExpenses(portfolioId?: number): Promise<Expense[]> {
    if (portfolioId) {
      // Join with expenses table to filter by portfolioId
      const results = await db.select()
        .from(expenses)
        .where(eq(expenses.portfolioId, portfolioId));
      return results;
    }
    // Just return all expenses
    return db.select().from(expenses);
  }

  async getExpensesByListing(listingId: number): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.listingId, listingId));
  }

  async getExpensesByOwner(ownerId: number): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.ownerId, ownerId));
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(insertExpense).returning();
    return expense;
  }

  async updateExpense(id: number, updatedExpense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [expense] = await db
      .update(expenses)
      .set(updatedExpense)
      .where(eq(expenses.id, id))
      .returning();
    return expense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // User Settings
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings;
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const [userSetting] = await db
      .insert(userSettings)
      .values(settings)
      .returning();
    return userSetting;
  }

  async updateUserSettings(userId: number, updatedSettings: Partial<InsertUserSettings>): Promise<UserSettings | undefined> {
    const [settings] = await db
      .update(userSettings)
      .set({...updatedSettings, updatedAt: new Date()})
      .where(eq(userSettings.userId, userId))
      .returning();
    return settings;
  }

  // Activity Logs
  async getActivityLogs(userId: number): Promise<ActivityLog[]> {
    return db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.timestamp));
  }

  async createActivityLog(insertLog: InsertActivityLog & { timestamp?: Date }): Promise<ActivityLog> {
    const values = { 
      ...insertLog,
      // Use provided timestamp or default to current time
      timestamp: insertLog.timestamp || new Date()
    };
    
    const [log] = await db
      .insert(activityLogs)
      .values(values)
      .returning();
    return log;
  }

  // Reports
  async getReports(portfolioId?: number): Promise<Report[]> {
    try {
      if (portfolioId) {
        console.log(`Getting reports filtered by portfolioId: ${portfolioId}`);
        const result = await db.select().from(reports).where(eq(reports.portfolioId, portfolioId));
        console.log(`Found ${result.length} reports for portfolio ${portfolioId}`);
        return result;
      }
      
      console.log('Getting all reports (no portfolio filter)');
      const result = await db.select().from(reports);
      console.log(`Found ${result.length} total reports`);
      return result;
    } catch (error) {
      console.error('Error in getReports:', error);
      return [];
    }
  }

  async getReportsByOwner(ownerId: number): Promise<Report[]> {
    return db
      .select()
      .from(reports)
      .where(eq(reports.ownerId, ownerId));
  }
  
  async getReport(id: number): Promise<Report | undefined> {
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, id));
    return report;
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const [report] = await db
      .insert(reports)
      .values(insertReport)
      .returning();
    return report;
  }

  async updateReport(id: number, updatedReport: Partial<InsertReport>): Promise<Report | undefined> {
    const [report] = await db
      .update(reports)
      .set(updatedReport)
      .where(eq(reports.id, id))
      .returning();
    return report;
  }
  
  async deleteReport(id: number): Promise<boolean> {
    const result = await db.delete(reports).where(eq(reports.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Inventory Refills
  async getInventoryRefills(inventoryId?: number): Promise<InventoryRefill[]> {
    if (inventoryId) {
      return db
        .select()
        .from(inventoryRefills)
        .where(eq(inventoryRefills.inventoryId, inventoryId))
        .orderBy(desc(inventoryRefills.refillDate));
    }
    return db
      .select()
      .from(inventoryRefills)
      .orderBy(desc(inventoryRefills.refillDate));
  }

  async getInventoryRefill(id: number): Promise<InventoryRefill | undefined> {
    const [refill] = await db
      .select()
      .from(inventoryRefills)
      .where(eq(inventoryRefills.id, id));
    return refill;
  }

  async createInventoryRefill(refill: InsertInventoryRefill): Promise<InventoryRefill> {
    const [createdRefill] = await db
      .insert(inventoryRefills)
      .values(refill)
      .returning();
    return createdRefill;
  }

  async deleteInventoryRefill(id: number): Promise<boolean> {
    const result = await db.delete(inventoryRefills).where(eq(inventoryRefills.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async refillInventoryItem(
    inventoryId: number,
    quantity: number,
    cost?: string,
    notes?: string,
    userId?: number
  ): Promise<Inventory> {
    // First get the current inventory item
    const [item] = await db
      .select()
      .from(inventory)
      .where(eq(inventory.id, inventoryId));

    if (!item) {
      throw new Error(`Inventory item with ID ${inventoryId} not found`);
    }

    // Create a refill record
    await this.createInventoryRefill({
      inventoryId,
      quantity,
      cost: cost || "0",
      notes: notes || undefined,
      userId,
      refillDate: new Date(),
    });

    // Update the inventory quantity
    const newQuantity = item.quantity + quantity;
    const [updatedItem] = await db
      .update(inventory)
      .set({ quantity: newQuantity })
      .where(eq(inventory.id, inventoryId))
      .returning();

    return updatedItem;
  }

  async batchRefillInventory(refills: InsertInventoryRefill[]): Promise<Inventory[]> {
    const updatedItems: Inventory[] = [];

    // Process each refill one by one
    for (const refill of refills) {
      const { inventoryId, quantity, cost, notes, userId } = refill;
      const updatedItem = await this.refillInventoryItem(
        inventoryId,
        quantity,
        cost?.toString(),
        notes || undefined,
        userId || undefined
      );
      updatedItems.push(updatedItem);
    }

    return updatedItems;
  }

  // Shopping Lists
  async getShoppingLists(userId?: number): Promise<ShoppingList[]> {
    if (userId) {
      return db
        .select()
        .from(shoppingLists)
        .where(eq(shoppingLists.userId, userId))
        .orderBy(desc(shoppingLists.updatedAt));
    }
    return db
      .select()
      .from(shoppingLists)
      .orderBy(desc(shoppingLists.updatedAt));
  }

  async getShoppingList(id: number): Promise<ShoppingList | undefined> {
    const [list] = await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.id, id));
    return list;
  }

  async createShoppingList(list: InsertShoppingList): Promise<ShoppingList> {
    const [createdList] = await db
      .insert(shoppingLists)
      .values(list)
      .returning();
    return createdList;
  }

  async updateShoppingList(id: number, updatedList: Partial<InsertShoppingList>): Promise<ShoppingList | undefined> {
    const [list] = await db
      .update(shoppingLists)
      .set({ ...updatedList, updatedAt: new Date() })
      .where(eq(shoppingLists.id, id))
      .returning();
    return list;
  }

  async deleteShoppingList(id: number): Promise<boolean> {
    // First delete all items in the list
    await db.delete(shoppingListItems).where(eq(shoppingListItems.shoppingListId, id));
    
    // Then delete the list itself
    const result = await db.delete(shoppingLists).where(eq(shoppingLists.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getDefaultLowStockList(userId: number): Promise<ShoppingList> {
    // Try to find an existing default low stock list
    const [existingList] = await db
      .select()
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.userId, userId),
          eq(shoppingLists.isDefault, true)
        )
      );

    let list: ShoppingList;
    if (existingList) {
      list = existingList;
    } else {
      // Create a new default list if none exists
      const [newList] = await db
        .insert(shoppingLists)
        .values({
          name: "Low Stock Items",
          userId,
          isDefault: true,
        })
        .returning();
      list = newList;
    }

    // Get low stock items
    const lowStockItems = await this.getLowInventoryItems();
    
    // Get current items in the list
    const existingItems = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, list.id));

    // Add low stock items to the list if they're not already there
    for (const item of lowStockItems) {
      const existingItem = existingItems.find(
        listItem => listItem.inventoryId === item.id
      );
      
      if (!existingItem) {
        // Calculate quantity needed to reach the minimum level
        const quantityNeeded = Math.max(
          (item.minQuantity || 10) - item.quantity,
          1 // Always add at least 1
        );
        
        // Add item to shopping list
        await this.addItemToShoppingList({
          shoppingListId: list.id,
          inventoryId: item.id,
          quantity: quantityNeeded,
          completed: false,
        });
      }
    }

    return list;
  }

  // Shopping List Items
  async getShoppingListItems(listId: number): Promise<(ShoppingListItem & { inventoryItem?: Inventory })[]> {
    const items = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, listId))
      .orderBy(desc(shoppingListItems.createdAt));

    // Fetch the inventory items for each shopping list item
    const itemsWithInventory = await Promise.all(
      items.map(async (item) => {
        const [inventoryItem] = await db
          .select()
          .from(inventory)
          .where(eq(inventory.id, item.inventoryId));
        return { ...item, inventoryItem };
      })
    );

    return itemsWithInventory;
  }

  async getShoppingListItem(id: number): Promise<ShoppingListItem | undefined> {
    const [item] = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.id, id));
    return item;
  }

  async addItemToShoppingList(item: InsertShoppingListItem): Promise<ShoppingListItem> {
    // Check if this item is already in the list
    const [existingItem] = await db
      .select()
      .from(shoppingListItems)
      .where(
        and(
          eq(shoppingListItems.shoppingListId, item.shoppingListId),
          eq(shoppingListItems.inventoryId, item.inventoryId)
        )
      );

    if (existingItem) {
      // Update the existing item quantity instead of creating a new one
      const [updatedItem] = await db
        .update(shoppingListItems)
        .set({ 
          quantity: existingItem.quantity + (item.quantity || 1),
          updatedAt: new Date()
        })
        .where(eq(shoppingListItems.id, existingItem.id))
        .returning();
      return updatedItem;
    }

    // Create a new item
    const [createdItem] = await db
      .insert(shoppingListItems)
      .values(item)
      .returning();
    return createdItem;
  }

  async updateShoppingListItem(id: number, updatedItem: Partial<InsertShoppingListItem>): Promise<ShoppingListItem | undefined> {
    const [item] = await db
      .update(shoppingListItems)
      .set({ ...updatedItem, updatedAt: new Date() })
      .where(eq(shoppingListItems.id, id))
      .returning();
    return item;
  }

  async removeItemFromShoppingList(id: number): Promise<boolean> {
    const result = await db.delete(shoppingListItems).where(eq(shoppingListItems.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async markItemAsCompleted(id: number, completed: boolean): Promise<ShoppingListItem | undefined> {
    const [item] = await db
      .update(shoppingListItems)
      .set({ completed, updatedAt: new Date() })
      .where(eq(shoppingListItems.id, id))
      .returning();
    return item;
  }

  async refillCompletedItems(listId: number, userId?: number): Promise<Inventory[]> {
    // Get all completed items in the list
    const completedItems = await db
      .select()
      .from(shoppingListItems)
      .where(
        and(
          eq(shoppingListItems.shoppingListId, listId),
          eq(shoppingListItems.completed, true)
        )
      );

    if (completedItems.length === 0) {
      return [];
    }

    // Prepare refills for each completed item
    const refills: InsertInventoryRefill[] = completedItems.map(item => ({
      inventoryId: item.inventoryId,
      quantity: item.quantity,
      cost: "0", // Default cost, this can be updated later
      userId: userId || undefined,
      refillDate: new Date(),
    }));

    // Process the refills
    const updatedInventory = await this.batchRefillInventory(refills);

    // Mark the items as uncompleted after refilling
    await Promise.all(
      completedItems.map(item =>
        db
          .update(shoppingListItems)
          .set({ completed: false, updatedAt: new Date() })
          .where(eq(shoppingListItems.id, item.id))
      )
    );

    return updatedInventory;
  }
}

export const storage = new DatabaseStorage();
