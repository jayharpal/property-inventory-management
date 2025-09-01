import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Owner } from "@/lib/types";
import { Listing, Expense, listingFormSchema, type ListingFormValues } from "@/lib/schema-types";
import { Loader2, Edit, Trash2, ArrowLeft, Home, MapPin, Bed, Bath, Calendar, Plus } from "lucide-react";
import { createQueryKey } from "@/lib/queryClient";

// Helper function to parse string to number or null
const parseNumeric = (value: string | undefined, isFloat: boolean = false): number | null => {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }
  const num = isFloat ? parseFloat(value) : parseInt(value, 10);
  return isNaN(num) ? null : num;
};

export default function ListingDetailPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, params] = useRoute<{ id: string }>("/listings/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const listingId = params ? parseInt(params.id) : null;

  // Form for editing the listing
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      name: "",
      address: "",
      propertyType: "apartment",
      ownerId: "",
      beds: "",
      baths: "",
      image: "",
      active: true,
    },
  });

  // Queries
  const { data: listing, isLoading: isLoadingListing } = useQuery<Listing>({
    queryKey: createQueryKey(`/api/listings/${listingId}`),
    queryFn: async () => {
      if (!listingId) throw new Error("Listing ID is required");
      const response = await apiRequest("GET", `/api/listings/${listingId}`);
      return response;
    },
    enabled: !!listingId,
  });

  const { data: owners = [], isLoading: isLoadingOwners } = useQuery<Owner[]>({
    queryKey: createQueryKey("/api/owners"),
  });

  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery<Expense[]>({
    queryKey: createQueryKey(`/api/expenses/listing/${listingId}`),
    queryFn: async () => {
      if (!listingId) throw new Error("Listing ID is required");
      return await apiRequest("GET", `/api/expenses/listing/${listingId}`);
    },
    enabled: !!listingId,
  });

  // Initialize form when listing data is loaded
  useEffect(() => {
    if (listing) {
      form.reset({
        name: listing.name,
        address: listing.address,
        propertyType: listing.propertyType,
        ownerId: String(listing.ownerId),
        beds: listing.beds !== null && listing.beds !== undefined ? String(listing.beds) : "",
        baths: listing.baths !== null && listing.baths !== undefined ? String(listing.baths) : "",
        image: listing.image || "",
        active: listing.active === null ? true : listing.active,
      });
    }
  }, [listing, form]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async (values: ListingFormValues) => {
      if (!listingId) throw new Error("Listing ID is required");
      
      const payload = {
        name: values.name,
        address: values.address,
        propertyType: values.propertyType,
        ownerId: Number(values.ownerId),
        beds: values.beds !== null && values.beds !== undefined && values.beds !== "" ? String(values.beds) : undefined,
        baths: values.baths !== null && values.baths !== undefined && values.baths !== "" ? String(values.baths) : undefined,
        image: values.image || "",
        active: values.active,
      };
      
      const response = await apiRequest("PUT", `/api/listings/${listingId}`, payload);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Listing updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/listings") });
      queryClient.invalidateQueries({ queryKey: createQueryKey(`/api/listings/${listingId}`) });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/stats/dashboard") });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update listing: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!listingId) throw new Error("Listing ID is required");
      await apiRequest("DELETE", `/api/listings/${listingId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Listing deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/listings") });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/stats/dashboard") });
      navigate("/listings");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete listing: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ListingFormValues) => {
    updateMutation.mutate(values);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  // Helper calculations for expenses
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.totalCost), 0);
  const totalBilled = expenses.reduce((sum, exp) => sum + Number(exp.billedAmount), 0);
  const totalProfit = totalBilled - totalExpenses;

  // Group expenses by month
  const monthlyExpenses = expenses.reduce<Record<string, { expenses: Expense[]; total: number; billed: number; profit: number }>>(
    (acc, expense) => {
      const date = new Date(expense.date || Date.now());
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      if (!acc[monthYear]) {
        acc[monthYear] = { expenses: [], total: 0, billed: 0, profit: 0 };
      }
      
      acc[monthYear].expenses.push(expense);
      acc[monthYear].total += Number(expense.totalCost);
      acc[monthYear].billed += Number(expense.billedAmount);
      acc[monthYear].profit += Number(expense.billedAmount) - Number(expense.totalCost);
      
      return acc;
    },
    {}
  );

  // Find owner information
  const owner = owners.find((o) => o.id === listing?.ownerId);

  if (isLoadingListing) {
    return (
      <DashboardLayout title="Loading Listing...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!listing) {
    return (
      <DashboardLayout title="Listing Not Found">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-gray-500 mb-4">The listing you're looking for doesn't exist or has been removed.</p>
          <Button asChild>
            <Link href="/listings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Listings
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const getPropertyTypeBadgeClass = (propertyType: string) => {
    switch (propertyType.toLowerCase()) {
      case 'apartment':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100 hover:text-blue-800';
      case 'house':
        return 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800';
      case 'condo':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100 hover:text-purple-800';
      case 'villa':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-100 hover:text-amber-800';
      case 'cabin':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-100 hover:text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100 hover:text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    // Convert to string representation directly to avoid type error
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <DashboardLayout
      title={listing.name}
      subtitle={<span className="flex items-center text-gray-500"><MapPin className="h-4 w-4 mr-1" /> {listing.address}</span>}
      actions={
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href="/listings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Edit Listing</DialogTitle>
                <DialogDescription>
                  Update the listing details.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Beach House" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St, City, State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="propertyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select property type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="apartment">Apartment</SelectItem>
                            <SelectItem value="house">House</SelectItem>
                            <SelectItem value="condo">Condo</SelectItem>
                            <SelectItem value="villa">Villa</SelectItem>
                            <SelectItem value="cabin">Cabin</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ownerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select owner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingOwners ? (
                              <SelectItem value="" disabled>
                                Loading owners...
                              </SelectItem>
                            ) : owners.length === 0 ? (
                              <SelectItem value="" disabled>
                                No owners available
                              </SelectItem>
                            ) : (
                              owners.map((owner) => (
                                <SelectItem key={owner.id} value={owner.id.toString()}>
                                  {owner.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="beds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Beds</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="2" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="baths"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Baths</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.5" placeholder="1.5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/image.jpg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Active Listing</FormLabel>
                          <p className="text-sm text-gray-500">
                            Inactive listings will not appear in reports
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Listing"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will soft delete the listing "{listing.name}". It will no longer appear 
                  in the listings page, but any associated expenses and data will be preserved 
                  for historical reporting.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleDelete}
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Listing"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Property Information</span>
              <Badge className={getPropertyTypeBadgeClass(listing.propertyType)}>
                {listing.propertyType.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
                <div className="flex items-center space-x-4">
                   {listing.beds && (
                     <div className="flex items-center text-sm text-gray-600">
                       <Bed className="h-4 w-4 mr-1.5 text-gray-400" /> 
                       <span>{listing.beds} bed{listing.beds === 1 ? '' : 's'}</span>
                     </div>
                   )}
                   {listing.baths && (
                     <div className="flex items-center text-sm text-gray-600">
                       <Bath className="h-4 w-4 mr-1.5 text-gray-400" /> 
                       <span>{listing.baths} bath{parseFloat(listing.baths.toString()) === 1 ? '' : 's'}</span>
                     </div>
                   )}
                   <div className={`text-xs px-2 py-0.5 rounded-full ${listing.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} inline-block font-medium`}>
                    {listing.active ? 'Active' : 'Inactive'}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-0.5">Address</h4>
                  <p className="text-base font-medium text-gray-800">{listing.address}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-0.5">Owner</h4>
                  <p className="text-base font-medium text-gray-800">{owner?.name || 'Unknown Owner'}</p>
                  {owner?.email && (
                    <p className="text-xs text-gray-500">{owner.email}</p>
                  )}
                  {owner?.phone && (
                    <p className="text-xs text-gray-500">{owner.phone}</p>
                  )}
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-0.5">Owner Markup</h4>
                  <p className="text-base font-medium text-gray-800">{owner?.markupPercentage || '0'}%</p>
                </div>
              </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>Total expenses and profit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Total Expenses</div>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Total Billed</div>
                <div className="text-2xl font-bold">{formatCurrency(totalBilled)}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Total Profit</div>
                <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalProfit)}
                </div>
              </div>
              <div className="text-sm text-gray-500 pt-2 border-t">
                Based on {expenses.length} expense record{expenses.length === 1 ? '' : 's'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="expenses" className="w-full">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="expenses" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Expenses</CardTitle>
              <CardDescription>
                Complete expense history for this property
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingExpenses ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No expenses recorded yet</p>
                  <Button asChild>
                    <Link href="/expenses">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Expense
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Markup</TableHead>
                        <TableHead>Billed</TableHead>
                        <TableHead>Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => {
                        const cost = Number(expense.totalCost);
                        const billed = Number(expense.billedAmount);
                        const profit = billed - cost;
                        return (
                          <TableRow key={expense.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                                {formatDate(typeof expense.date === 'string' ? expense.date : expense.date ? expense.date.toString() : null)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {expense.notes || `Expense #${expense.id}`}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(cost)}
                            </TableCell>
                            <TableCell>
                              {expense.markupPercent}%
                            </TableCell>
                            <TableCell>
                              {formatCurrency(billed)}
                            </TableCell>
                            <TableCell>
                              <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(profit)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="monthly" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary</CardTitle>
              <CardDescription>
                Expenses grouped by month
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingExpenses ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : Object.keys(monthlyExpenses).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No expense data available</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Expenses</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead>Total Billed</TableHead>
                        <TableHead>Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(monthlyExpenses).map(([month, data]) => (
                        <TableRow key={month}>
                          <TableCell>
                            <div className="font-medium">{month}</div>
                          </TableCell>
                          <TableCell>{data.expenses.length}</TableCell>
                          <TableCell>{formatCurrency(data.total)}</TableCell>
                          <TableCell>{formatCurrency(data.billed)}</TableCell>
                          <TableCell>
                            <span className={data.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(data.profit)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}