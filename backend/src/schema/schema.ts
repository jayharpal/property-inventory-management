import { pgTable, text, serial, integer, decimal, timestamp, boolean, json, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Role types
export const userRoleEnum = z.enum(["standard_user", "standard_admin", "administrator"]);
export type UserRole = z.infer<typeof userRoleEnum>;

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  companyName: text("company_name").notNull(),
  role: text("role").$type<UserRole>().notNull().default("standard_admin"),
  portfolioId: integer("portfolio_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  portfolioId: true,
  companyName:true
}).extend({
  role: userRoleEnum.optional()
});

// Portfolio model to manage shared access between users
export const portfolios = pgTable("portfolios", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull(), // Reference to the user who owns the portfolio
  createdBy: integer("created_by").notNull(), // Reference to the user who created the portfolio
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPortfolioSchema = createInsertSchema(portfolios).pick({
  name: true,
  ownerId: true,
  createdBy: true,
});

// Invitation model for inviting users to portfolios
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  portfolioId: integer("portfolio_id").notNull(),
  role: text("role").$type<UserRole>().notNull().default("standard_user"),
  token: text("token").notNull().unique(),
  accepted: boolean("accepted").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvitationSchema = createInsertSchema(invitations)
  .pick({
    email: true,
    portfolioId: true,
    role: true,
  })
  .extend({
    // Add these fields as optional for usage in internal storage functions
    token: z.string().optional(),
    expiresAt: z.date().optional(),
  });

// Owner model
export const owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  markupPercentage: decimal("markup_percentage").notNull().default("15"),
  portfolioId: integer("portfolio_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOwnerSchema = createInsertSchema(owners).pick({
  name: true,
  email: true,
  phone: true,
  markupPercentage: true,
  portfolioId: true,
});

// Property type enum for listings
export const propertyTypeEnum = z.enum(["apartment", "house", "condo", "villa", "cabin", "other"]);
export type PropertyType = z.infer<typeof propertyTypeEnum>;

// Listing model
export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  propertyType: text("property_type").notNull().default("apartment"),
  ownerId: integer("owner_id").notNull(),
  beds: integer("beds"),
  baths: decimal("baths"),
  image: text("image"),
  active: boolean("active").default(true),
  portfolioId: integer("portfolio_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertListingSchema = createInsertSchema(listings, {
  beds: z.coerce.number().optional(),
  baths: z.coerce.number().optional(),
  image: z.string().nullable().optional(),
  ownerId: z.coerce.number(),
  portfolioId: z.coerce.number()
}).pick({
  name: true,
  address: true,
  propertyType: true,
  ownerId: true,
  beds: true,
  baths: true,
  image: true,
  active: true,
  portfolioId: true,
});

// Inventory model
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  costPrice: decimal("cost_price").notNull(),
  defaultMarkup: decimal("default_markup").notNull().default("15"),
  quantity: integer("quantity").notNull().default(0),
  vendor: text("vendor"),
  minQuantity: integer("min_quantity").default(10),
  deleted: boolean("deleted").default(false).notNull(),
  portfolioId: integer("portfolio_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInventorySchema = createInsertSchema(inventory).pick({
  name: true,
  category: true,
  costPrice: true,
  defaultMarkup: true,
  quantity: true,
  vendor: true,
  minQuantity: true,
  deleted: true,
  portfolioId: true,
});

// Expense model
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull(),
  ownerId: integer("owner_id").notNull(),
  inventoryId: integer("inventory_id"), // nullable for custom expenses
  quantityUsed: integer("quantity_used").default(1),
  markupPercent: decimal("markup_percent").notNull().default("15"),
  date: timestamp("date"),
  totalCost: decimal("total_cost").notNull(),
  billedAmount: decimal("billed_amount").notNull(),
  notes: text("notes"),
  portfolioId: integer("portfolio_id").notNull(),
});

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  listingId: true,
  ownerId: true,
  inventoryId: true,
  quantityUsed: true,
  markupPercent: true,
  date: true,
  totalCost: true,
  billedAmount: true,
  notes: true,
  portfolioId: true,
});

// Settings model (replacing platform integrations)
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  theme: text("theme").default("light"),
  emailNotifications: boolean("email_notifications").default(true),
  defaultMarkup: decimal("default_markup").default("15"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).pick({
  userId: true,
  theme: true,
  emailNotifications: true,
  defaultMarkup: true,
});

// Activity Log
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  userId: true,
  action: true,
  details: true,
});

// Report model
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "monthly", "owner", "property" 
  ownerId: integer("owner_id"),
  month: integer("month"),
  year: integer("year"),
  filePath: text("file_path"),
  generatedAt: timestamp("generated_at").defaultNow(),
  sent: boolean("sent").default(false),
  batchId: text("batch_id"),
  notes: text("notes"),
  portfolioId: integer("portfolio_id").notNull(),
});

export const insertReportSchema = createInsertSchema(reports).pick({
  name: true,
  type: true,
  ownerId: true,
  month: true,
  year: true,
  filePath: true,
  sent: true,
  batchId: true,
  notes: true,
  generatedAt: true,
  portfolioId: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

export type Owner = typeof owners.$inferSelect;
export type InsertOwner = z.infer<typeof insertOwnerSchema>;

export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

// Shopping Lists
export const shoppingLists = pgTable("shopping_lists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").references(() => users.id),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertShoppingListSchema = createInsertSchema(shoppingLists).pick({
  name: true,
  userId: true,
  isDefault: true,
});

// Shopping List Items
export const shoppingListItems = pgTable("shopping_list_items", {
  id: serial("id").primaryKey(),
  shoppingListId: integer("shopping_list_id").references(() => shoppingLists.id).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id).notNull(),
  quantity: integer("quantity").notNull().default(1),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems).pick({
  shoppingListId: true,
  inventoryId: true,
  quantity: true,
  completed: true,
});

// Inventory Refill Log
export const inventoryRefills = pgTable("inventory_refills", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id").references(() => inventory.id).notNull(),
  quantity: integer("quantity").notNull(),
  cost: decimal("cost").default("0"),
  refillDate: timestamp("refill_date").defaultNow(),
  notes: text("notes"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInventoryRefillSchema = createInsertSchema(inventoryRefills).pick({
  inventoryId: true,
  quantity: true,
  cost: true,
  refillDate: true,
  notes: true,
  userId: true,
});

// Types for the new tables
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;

export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;

export type InventoryRefill = typeof inventoryRefills.$inferSelect;
export type InsertInventoryRefill = z.infer<typeof insertInventoryRefillSchema>;
