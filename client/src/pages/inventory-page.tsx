// @ts-nocheck
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, createQueryKey } from "@/lib/queryClient";
import { Inventory, ShoppingList } from "@/lib/types";
import { Loader2, Search, Plus, Edit, AlertCircle, Trash, RefreshCw, ShoppingCart } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

// Re-add the predefined categories
const predefinedCategories = [
  "Cleaning Supplies",
  "Laundry Supplies",
  "Bathroom Supplies",
  "Toiletries",
  "Kitchen Supplies",
  "Outdoor Supplies",
  "Office Supplies",
  "Maintenance",
  "Linens",
  "Decor",
  "Electronics",
  "Other"
];

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.string().optional(),
  costPrice: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    {
      message: "Cost price must be a positive number",
    }
  ),
  defaultMarkup: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    {
      message: "Markup must be a positive number",
    }
  ),
  quantity: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    {
      message: "Quantity must be a positive number",
    }
  ),
  minQuantity: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    {
      message: "Minimum quantity must be a positive number",
    }
  ),
  vendor: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Refill form schema
const refillFormSchema = z.object({
  quantity: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    {
      message: "Quantity must be a positive number greater than 0",
    }
  ),
  cost: z.string().refine(
    (val) => val === "" || (!isNaN(Number(val)) && Number(val) >= 0),
    {
      message: "Cost must be a positive number or empty",
    }
  ).optional(),
  notes: z.string().optional(),
});

type RefillFormValues = z.infer<typeof refillFormSchema>;

// Shopping list item form schema
const shoppingListItemSchema = z.object({
  quantity: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    {
      message: "Quantity must be a positive number greater than 0",
    }
  ),
});

type ShoppingListItemFormValues = z.infer<typeof shoppingListItemSchema>;

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefillDialogOpen, setIsRefillDialogOpen] = useState(false);
  const [isShoppingListDialogOpen, setIsShoppingListDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("inventory");
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [refillItem, setRefillItem] = useState<Inventory | null>(null);
  const [shoppingListItem, setShoppingListItem] = useState<Inventory | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      costPrice: "0",
      defaultMarkup: "15",
      quantity: "0",
      minQuantity: "10",
      vendor: "",
    },
  });
  
  const refillForm = useForm<RefillFormValues>({
    resolver: zodResolver(refillFormSchema),
    defaultValues: {
      quantity: "1",
      cost: "",
      notes: "",
    },
  });
  
  const shoppingListForm = useForm<ShoppingListItemFormValues>({
    resolver: zodResolver(shoppingListItemSchema),
    defaultValues: {
      quantity: "1"
    },
  });
  
  // Query for shopping lists with user-specific keys
  const { data: shoppingLists = [] } = useQuery<ShoppingList[]>({
    queryKey: createQueryKey("/api/shopping-lists"),
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/shopping-lists");
      // Ensure we return an array
      return Array.isArray(response) ? response : [];
    },
  });
  
  // Default shopping list state
  const [selectedShoppingList, setSelectedShoppingList] = useState<number | null>(null);

  // Load inventory data
  const { data: inventoryItems = [], isLoading, error, refetch } = useQuery({
    queryKey: createQueryKey("/api/inventory"),
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory");
      return Array.isArray(response) ? response : [];
    },
  });

  // Load categories for dropdown - MERGE predefined with fetched
  const { data: fetchedCategories = [], isLoading: isLoadingCategories } = useQuery<string[]>({
    queryKey: createQueryKey("/api/categories"),
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/categories");
        // Ensure we return an array of strings derived from the response
        return Array.isArray(response) ? response.map(cat => String(cat.name || cat)) : [];
      } catch (fetchError) {
        console.error("Failed to fetch categories:", fetchError);
        toast({
          title: "Warning",
          description: "Could not load dynamic categories. Using defaults.",
          variant: "destructive",
        })
        return []; // Return empty on error
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Memoized, combined, unique, and sorted list of categories
  const categoriesData = useMemo(() => {
    const combined = new Set([...predefinedCategories, ...fetchedCategories]);
    return Array.from(combined).sort();
  }, [fetchedCategories]);

  // Load vendors for dropdown
  const { data: vendors = [] } = useQuery({
    queryKey: createQueryKey("/api/vendors"),
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/vendors");
      // Ensure we return an array
      return Array.isArray(response) ? response : [];
    },
  });

  // Create item mutation
  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Convert quantity and minQuantity back to numbers if needed by API
      const payload = {
        ...values,
        costPrice: values.costPrice, // Keep as string if API handles conversion
        defaultMarkup: values.defaultMarkup, // Keep as string if API handles conversion
        quantity: parseInt(values.quantity, 10),
        minQuantity: parseInt(values.minQuantity, 10),
      };
      return await apiRequest("POST", "/api/inventory", payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory item created successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/inventory") });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/dashboard") });
      setIsDialogOpen(false);
      form.reset({
        name: "",
        category: "",
        costPrice: "0",
        defaultMarkup: "15",
        quantity: "0",
        minQuantity: "10",
        vendor: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create inventory item: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Update item mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: {id: number } & FormValues) => {
       const payload = {
        ...values,
        costPrice: values.costPrice,
        defaultMarkup: values.defaultMarkup,
        quantity: parseInt(values.quantity, 10),
        minQuantity: parseInt(values.minQuantity, 10),
      };
      return await apiRequest("PUT", `/api/inventory/${id}`, payload);
    },
     onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory item updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/inventory") });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/dashboard") });
      setIsDialogOpen(false);
      form.reset({
        name: "",
        category: "",
        costPrice: "0",
        defaultMarkup: "15",
        quantity: "0",
        minQuantity: "10",
        vendor: "",
      });
      setEditingItem(null); // Clear editing state on success
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update inventory item: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Delete item mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/inventory/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory item deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/inventory") });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/dashboard") });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete inventory item: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Refill inventory mutation - Use POST based on docs
  const refillMutation = useMutation({
    mutationFn: async ({ id, quantityToAdd, cost, notes }: {id: number, quantityToAdd: number, cost?: string, notes?: string }) => {
      // Endpoint might be /api/inventory/refill or /api/inventory/:id/refill
      // Let's try POST to /api/inventory/refill with id in body, more RESTful for creating a refill record
      const payload = {
        inventoryId: id,
        quantity: quantityToAdd,
        cost: cost || undefined,
        notes: notes || undefined,
        // Assuming backend gets userId
      };
      return await apiRequest("POST", `/api/inventory/refill`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory item refilled successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/inventory") });
      // Also invalidate refill logs if such a query exists
      // queryClient.invalidateQueries({ queryKey: createQueryKey("/api/inventory-refills") });
      setIsRefillDialogOpen(false);
      refillForm.reset({
        quantity: "1",
        cost: "",
        notes: "",
      });
      setRefillItem(null); // Clear refill item state
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to refill inventory item: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Add to shopping list mutation - Correct endpoint and payload
  const addToShoppingListMutation = useMutation({
    mutationFn: async ({ listId, itemId, quantity }: { listId: number, itemId: number, quantity: number }) => {
      const payload = {
        shoppingListId: listId,
        inventoryId: itemId,
        quantity: quantity,
        completed: false // Default to not completed
      };
      // Use the documented endpoint
      return await apiRequest("POST", `/api/shopping-lists/items`, payload);
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: "Item added to shopping list",
      });
      // Invalidate items for the specific list
      queryClient.invalidateQueries({ queryKey: createQueryKey(`/api/shopping-lists/items/${variables.listId}`) });
      setIsShoppingListDialogOpen(false);
      setShoppingListItem(null);
      shoppingListForm.reset({
        quantity: "1",
      });
      setSelectedShoppingList(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add item to shopping list: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Create new shopping list mutation - Enhance onSuccess
  const createShoppingListMutation = useMutation({
    mutationFn: async (name: string) => {
      const payload = {
        name,
        isDefault: false
      };
      return await apiRequest("POST", "/api/shopping-lists", payload);
    },
    onSuccess: (newList) => {
      toast({
        title: "Success",
        description: "New shopping list created",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/shopping-lists") });
      setSelectedShoppingList(newList.id); // Select the new list
      // If an item was being added, add it to the newly created list
      if (shoppingListItem) {
          const quantity = parseInt(shoppingListForm.getValues().quantity, 10);
          if (!isNaN(quantity) && quantity > 0) {
             addToShoppingListMutation.mutate({ 
                listId: newList.id, 
                itemId: shoppingListItem.id, 
                quantity: quantity 
             });
          }
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create shopping list: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Helper function to check if an item has low stock
  const isLowStock = (item: Inventory) => {
    if (!item) return false;
    const minQty = item.minQuantity ?? 10;
    return item.quantity <= minQty;
  };
  
  const filteredInventory = Array.isArray(inventoryItems) ? inventoryItems.filter(
    (item) => {
      if (!item) return false;
      
      // First apply the search filter
      const matchesSearch = 
        (item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (item.vendor && item.vendor.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Apply category filter
      const matchesCategory = 
        categoryFilter === "all" || item.category === categoryFilter;
      
      // Apply low stock filter
      const matchesLowStock = !showLowStockOnly || isLowStock(item);
      
      // All filters must match
      return matchesSearch && matchesCategory && matchesLowStock;
    }
  ) : [];

  const onSubmit = (values: FormValues) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  // Show loading state if no user available yet
  if (!user) {
    return (
      <DashboardLayout title="Inventory">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading user data...</span>
        </div>
      </DashboardLayout>
    );
  }

  const handleEdit = (item: Inventory) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      category: item.category,
      costPrice: item.costPrice.toString(),
      defaultMarkup: item.defaultMarkup.toString(),
      quantity: item.quantity.toString(),
      minQuantity: (item.minQuantity ?? 10).toString(), // Use nullish coalescing
      vendor: item.vendor || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };
  
  const handleRefill = (item: Inventory) => {
    setRefillItem(item);
    refillForm.reset({
      quantity: "1",
      cost: "",
      notes: "",
    });
    setIsRefillDialogOpen(true);
  };
  
  const onRefillSubmit = (values: RefillFormValues) => {
     if (!refillItem) return;
    refillMutation.mutate({
      id: refillItem.id,
      quantityToAdd: parseInt(values.quantity, 10),
      cost: values.cost || undefined,
      notes: values.notes || undefined
    });
  };
  
  const handleAddToShoppingList = (item: Inventory) => {
    setShoppingListItem(item);
    shoppingListForm.reset({
      quantity: "1"
    });
    if (shoppingLists.length === 1) {
      setSelectedShoppingList(shoppingLists[0].id);
    }
    setIsShoppingListDialogOpen(true);
  };
  
  const onShoppingListSubmit = () => {
    if (!shoppingListItem || !selectedShoppingList) return;
    const quantity = parseInt(shoppingListForm.getValues().quantity, 10);
     if (isNaN(quantity) || quantity <= 0) {
        shoppingListForm.setError("quantity", { message: "Quantity must be a positive number" });
        return;
    }
    addToShoppingListMutation.mutate({
      listId: selectedShoppingList,
      itemId: shoppingListItem.id,
      quantity: quantity
    });
  };
  
  const getStatusBadge = (quantity: number, minQuantity?: number | null) => {
    // Default min quantity to 10 if not provided or null
    const minQty = minQuantity ?? 10;
    
    if (quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (quantity <= minQty / 2) {
      return <Badge variant="destructive">Critical</Badge>;
    } else if (quantity <= minQty) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Low</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">In Stock</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'kitchen supplies':
        return 'fa-coffee';
      case 'bathroom supplies':
        return 'fa-toilet-paper';
      case 'bedroom supplies':
        return 'fa-bed';
      case 'cleaning supplies':
        return 'fa-soap';
      case 'office supplies':
        return 'fa-paperclip';
      case 'toiletries':
        return 'fa-pump-soap';
      case 'electronics':
        return 'fa-plug';
      default:
        return 'fa-box';
    }
  };

  return (
    <TooltipProvider>
      <DashboardLayout
        title="Inventory Management"
        actions={
          <>
            {/* Use Link component for SPA navigation */}
            <Link href="/shopping-lists">
              <Button variant="outline" className="mr-4">
                <ShoppingCart className="mr-2 h-4 w-4" />
                View Shopping Lists
              </Button>
            </Link>

            {/* Refill Dialog */}
            <Dialog open={isRefillDialogOpen} onOpenChange={(open) => {
              setIsRefillDialogOpen(open);
              if (!open) {
                setRefillItem(null);
                refillForm.reset({
                  quantity: "1",
                  cost: "",
                  notes: "",
                });
              }
            }}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Refill Inventory Item</DialogTitle>
                  <DialogDescription>
                    {refillItem && (
                      <>Add stock to <span className="font-medium">{refillItem.name}</span>.</>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <Form {...refillForm}>
                  <form onSubmit={refillForm.handleSubmit(onRefillSubmit)} className="space-y-4">
                    <FormField
                      control={refillForm.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity to Add</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={refillForm.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost (Optional)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormDescription>
                            Cost for this refill purchase. Leave empty to use the default cost price.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={refillForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter any notes about this refill" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={refillMutation.isPending}>
                        {refillMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Refilling...
                          </>
                        ) : (
                          "Refill Item"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            
            {/* Shopping List Dialog */}
            <Dialog open={isShoppingListDialogOpen} onOpenChange={(open) => {
              setIsShoppingListDialogOpen(open);
              if (!open) {
                setShoppingListItem(null);
                shoppingListForm.reset({
                  quantity: "1",
                });
                setSelectedShoppingList(null);
              }
            }}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add to Shopping List</DialogTitle>
                  <DialogDescription>
                    {shoppingListItem && (
                      <>Add <span className="font-medium">{shoppingListItem.name}</span> to a shopping list</>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Select Shopping List</Label>
                    <Select
                      value={selectedShoppingList?.toString() || ""}
                      onValueChange={(value) => setSelectedShoppingList(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a shopping list" />
                      </SelectTrigger>
                      <SelectContent>
                        {shoppingLists.map((list) => (
                          <SelectItem key={list.id} value={list.id.toString()}>
                            {list.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {shoppingLists.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        No shopping lists available. Create one below.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Create new shopping list"
                      id="new-list"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          createShoppingListMutation.mutate(e.currentTarget.value.trim());
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={(e) => {
                        const input = document.getElementById('new-list') as HTMLInputElement;
                        if (input.value.trim()) {
                          createShoppingListMutation.mutate(input.value.trim());
                          input.value = '';
                        }
                      }}
                      disabled={createShoppingListMutation.isPending}
                    >
                      {createShoppingListMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </div>
                  <Form {...shoppingListForm}>
                    <form className="space-y-4">
                      <FormField
                        control={shoppingListForm.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          disabled={!selectedShoppingList || addToShoppingListMutation.isPending}
                          onClick={onShoppingListSubmit}
                        >
                          {addToShoppingListMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            "Add to Shopping List"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Edit/Add Inventory Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingItem(null);
                form.reset({
                  name: "",
                  category: "",
                  costPrice: "0",
                  defaultMarkup: "15",
                  quantity: "0",
                  minQuantity: "10",
                  vendor: "",
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Inventory Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}</DialogTitle>
                  <DialogDescription>
                    {editingItem
                      ? "Update the inventory item details."
                      : "Enter the details for the new inventory item."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Coffee Pods" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categoriesData.length === 0 ? (
                                <SelectItem value="_none" disabled>
                                  No categories available
                                </SelectItem>
                              ) : (
                                categoriesData.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
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
                        name="costPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cost Price ($)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="defaultMarkup"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Markup (%)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" step="0.1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity in Stock</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="minQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="vendor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Supplier name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter className="flex justify-between">
                      <div>
                        {editingItem && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button type="button" variant="destructive">
                                Delete Item
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will soft delete the inventory item. It will no longer appear in the inventory list,
                                  but will still be available for historical expense data and analytics.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    if (editingItem) {
                                      handleDelete(editingItem.id);
                                      setIsDialogOpen(false);
                                    }
                                  }}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                          {createMutation.isPending || updateMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {editingItem ? "Updating..." : "Creating..."}
                            </>
                          ) : (
                            editingItem ? "Update Item" : "Create Item"
                          )}
                        </Button>
                      </div>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </>
        }
      >
        <div className="mb-6 space-y-4">
          {/* Search bar and filters row */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search inventory by name, category or vendor..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Category Filter */}
            <div className="w-full md:w-[200px]">
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoriesData.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Low Stock Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="low-stock-filter"
                checked={showLowStockOnly}
                onCheckedChange={setShowLowStockOnly}
              />
              <label 
                htmlFor="low-stock-filter" 
                className="text-sm font-medium flex items-center cursor-pointer whitespace-nowrap"
              >
                Show Low Stock Only
              </label>
            </div>
          </div>
          
          {/* Active filters display */}
          <div className="flex items-center">
            <div>
              {categoryFilter !== "all" && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 mr-2">
                  Category: {categoryFilter}
                </Badge>
              )}
              {showLowStockOnly && (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                  {filteredInventory.length} low stock item(s)
                </Badge>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-10 bg-muted rounded mb-4" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted/50 rounded mb-2" />
            ))}
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-muted-foreground mb-4">
              {showLowStockOnly && categoryFilter !== "all"
                ? `No low stock ${categoryFilter} items found`
                : showLowStockOnly
                  ? "No low stock inventory items found"
                  : categoryFilter !== "all"
                    ? `No ${categoryFilter} items found`
                    : "No inventory items found"}
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Inventory Item
            </Button>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-md bg-muted/50 flex items-center justify-center text-muted-foreground mr-3">
                          <i className={`fas ${getCategoryIcon(item.category)}`}></i>
                        </div>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.vendor && (
                            <div className="text-xs text-muted-foreground">Vendor: {item.vendor}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <div>${parseFloat(item.costPrice.toString()).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        Markup: {parseFloat(item.defaultMarkup.toString())}%
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{item.quantity}</div>
                      <div className="text-xs text-muted-foreground">
                        Min: {item.minQuantity || 10}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.quantity, item.minQuantity)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {/* Refill Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRefill(item)} 
                              className="text-green-600 hover:text-green-700"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Refill inventory</TooltipContent>
                        </Tooltip>
                        
                        {/* Add to Shopping List Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleAddToShoppingList(item)} 
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Add to shopping list</TooltipContent>
                        </Tooltip>
                        
                        {/* Edit Button */}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        {/* Delete Button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will soft delete the inventory item. It will no longer appear in the inventory list, 
                                but will still be available for historical expense data and analytics.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(item.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 text-sm text-muted-foreground">
              Showing {filteredInventory.length} of {inventoryItems.length} inventory items
            </div>
          </div>
        )}
      </DashboardLayout>
    </TooltipProvider>
  );
}