import { z } from 'zod';

// Role types
export const userRoleEnum = z.enum(["standard_user", "standard_admin", "administrator"]);
export type UserRole = z.infer<typeof userRoleEnum>;

// Property type enum
export const propertyTypeEnum = z.enum(["apartment", "house", "condo", "villa", "cabin", "other"]);
export type PropertyType = z.infer<typeof propertyTypeEnum>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: userRoleEnum,
  portfolioId: z.number().optional(),
  createdAt: z.date().optional(),
  companyName: z.string(),
});

// Listing schema
export const listingSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  propertyType: propertyTypeEnum,
  ownerId: z.number(),
  beds: z.number().nullable().optional(),
  baths: z.number().nullable().optional(),
  image: z.string().nullable().optional(),
  active: z.boolean().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Owner schema
export const ownerSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  markupPercentage: z.number(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Expense schema
export const expenseSchema = z.object({
  id: z.number(),
  listingId: z.number(),
  ownerId: z.number(),
  inventoryId: z.number().optional(),
  quantityUsed: z.number().optional(),
  markupPercent: z.number(),
  date: z.date(),
  totalCost: z.number(),
  billedAmount: z.number(),
  notes: z.string().optional(),
});

// Export type definitions
export type User = z.infer<typeof userSchema>;
export type Listing = z.infer<typeof listingSchema>;
export type Owner = z.infer<typeof ownerSchema>;
export type Expense = z.infer<typeof expenseSchema>;

// Form validation schemas
export const listingFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  propertyType: propertyTypeEnum,
  ownerId: z.string().min(1, "Owner is required"),
  beds: z.string().optional(),
  baths: z.string().optional(),
  image: z.string().optional(),
  active: z.boolean().default(true),
});

export type ListingFormValues = z.infer<typeof listingFormSchema>; 