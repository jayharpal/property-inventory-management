import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, createQueryKey } from "@/lib/queryClient";
import { Owner, Listing, Expense } from "@/lib/types";
import { Loader2, ArrowLeft, Edit, Trash2, User, Mail, Phone, Percent, Home, MapPin, Bed, Bath, Calendar, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function OwnerDetailPage() {
  const [, params] = useRoute<{ id: string }>("/owners/:id");
  const [, navigate] = useLocation(); // UseLocation might be needed later
  const { toast } = useToast();
  const ownerId = params ? parseInt(params.id) : null;

  // --- Queries ---
  const { data: owner, isLoading: isLoadingOwner, error: ownerError } = useQuery<Owner>({
    queryKey: createQueryKey(`/api/owners/${ownerId}`),
    queryFn: async () => {
      if (!ownerId) throw new Error("Owner ID is required");
      return await apiRequest("GET", `/api/owners/${ownerId}`);
    },
    enabled: !!ownerId,
  });

  const { data: listings = [], isLoading: isLoadingListings } = useQuery<Listing[]>({
    queryKey: createQueryKey(`/api/listings?ownerId=${ownerId}`),
    queryFn: async () => {
      if (!ownerId) return [];
      // Assuming the listings endpoint can filter by ownerId
      return await apiRequest("GET", `/api/listings?ownerId=${ownerId}`);
    },
    enabled: !!ownerId,
  });

  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery<Expense[]>({
    queryKey: createQueryKey(`/api/expenses?ownerId=${ownerId}`),
    queryFn: async () => {
        if (!ownerId) return [];
        // Assuming the expenses endpoint can filter by ownerId
        return await apiRequest("GET", `/api/expenses?ownerId=${ownerId}`);
    },
    enabled: !!ownerId,
  });

  // --- Financial Calculations ---
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.totalCost || 0), 0);
  const totalBilled = expenses.reduce((sum, exp) => sum + Number(exp.billedAmount || 0), 0);
  const totalProfit = totalBilled - totalExpenses;

  // --- Loading and Error States ---
  if (isLoadingOwner || isLoadingListings || isLoadingExpenses) {
    return (
      <DashboardLayout title="Loading Owner Details...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (ownerError || !owner) {
    return (
      <DashboardLayout title="Owner Not Found">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">
            The owner you're looking for doesn't exist or could not be loaded.
          </p>
          <Button asChild>
            <Link href="/owners">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Owners
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // --- Helper Functions ---
  const formatCurrency = (amount: number | string | null | undefined) => {
    // Improved check for valid numeric input
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
      return '$0.00'; // Or return 'N/A' or some placeholder
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numericAmount);
  };
  
  const getPropertyTypeBadgeClass = (propertyType: string) => {
    switch (propertyType?.toLowerCase()) {
      // Added hover states for consistency
      case 'apartment': return 'bg-blue-100 text-blue-800 hover:bg-blue-100 hover:text-blue-800';
      case 'house': return 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800';
      case 'condo': return 'bg-purple-100 text-purple-800 hover:bg-purple-100 hover:text-purple-800';
      case 'villa': return 'bg-amber-100 text-amber-800 hover:bg-amber-100 hover:text-amber-800';
      case 'cabin': return 'bg-orange-100 text-orange-800 hover:bg-orange-100 hover:text-orange-800';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100 hover:text-gray-800';
    }
  };

  // --- Render Component ---
  return (
    <DashboardLayout
      title={owner.name}
      subtitle={<span className="flex items-center text-gray-500"><Mail className="h-4 w-4 mr-1.5" /> {owner.email}</span>}
      actions={
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href="/owners">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          {/* TODO: Add Edit/Delete functionality - possibly link back to owners page modal? */}
          {/* 
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button> 
          */}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Owner Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Owner Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center">
                <User className="h-5 w-5 mr-3 text-muted-foreground" />
                <span className="text-base font-medium">{owner.name}</span>
             </div>
             <div className="flex items-center">
                <Mail className="h-5 w-5 mr-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{owner.email}</span>
             </div>
             {owner.phone && (
                <div className="flex items-center">
                   <Phone className="h-5 w-5 mr-3 text-muted-foreground" />
                   <span className="text-sm text-muted-foreground">{owner.phone}</span>
                </div>
             )}
             <div className="flex items-center">
                <Percent className="h-5 w-5 mr-3 text-muted-foreground" />
                 <div>
                    <span className="text-sm text-muted-foreground">Default Markup: </span>
                    <span className="font-medium">{owner.markupPercentage || '0'}%</span>
                 </div>
             </div>
          </CardContent>
        </Card>

        {/* Financial Summary Card (Owner Specific) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>Total expenses and profit across all properties</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
                <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Expenses</div>
                    <div className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
                </div>
                <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Billed</div>
                    <div className="text-xl font-bold">{formatCurrency(totalBilled)}</div>
                </div>
                <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Profit</div>
                    <div className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalProfit)}
                    </div>
                </div>
             </div>
             <div className="text-xs text-muted-foreground pt-3 mt-3 border-t text-center md:text-right">
                 Based on {expenses.length} expense record{expenses.length === 1 ? '' : 's'} across {listings.length} listing{listings.length === 1 ? '' : 's'}
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Listings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Owned Properties ({listings.length})</CardTitle>
          <CardDescription>Listings associated with this owner</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingListings ? (
             <div className="p-6">
                {/* Add keys to skeleton rows */}
                {[...Array(3)].map((_, i) => (
                    <div key={`listing-skeleton-${i}`} className="flex items-center justify-between p-4 border-b last:border-b-0">
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-8 w-16" />
                    </div>
                ))}
             </div>
          ) : listings.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              This owner has no listings.
            </div>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Beds</TableHead>
                    <TableHead className="text-center">Baths</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {listings.map((listing) => (
                    <TableRow 
                        key={listing.id}
                        onClick={() => navigate(`/listings/${listing.id}`)}
                        className="cursor-pointer hover:bg-muted/50"
                    >
                        <TableCell className="font-medium">{listing.name}</TableCell>
                        <TableCell>{listing.address}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={`${getPropertyTypeBadgeClass(listing.propertyType)} border-none`}>
                                {listing.propertyType}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-center">{listing.beds ?? '-'}</TableCell>
                        <TableCell className="text-center">{listing.baths ?? '-'}</TableCell>
                        <TableCell className="text-center">
                            <Badge variant={listing.active ? "default" : "secondary"} className={listing.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {listing.active ? 'Active' : 'Inactive'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                onClick={(e) => e.stopPropagation()} // Prevent row click when clicking button
                            >
                                <Link href={`/listings/${listing.id}`}>View Details</Link>
                            </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
} 