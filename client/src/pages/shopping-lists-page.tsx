// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { type CheckedState } from "@radix-ui/react-checkbox";
import { Link } from "wouter";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  TooltipProvider
} from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, createQueryKey } from "@/lib/queryClient";
import type { Inventory, ShoppingList, ShoppingListItem } from "@/lib/types";
import { Loader2, Search, Plus, ShoppingBag, RefreshCw, Trash, ArrowLeft } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";

// Form schema for creating a new shopping list
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function ShoppingListsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  // Query for shopping lists (excluding default lists)
  const { data: shoppingLists = [] } = useQuery<ShoppingList[]>({
    queryKey: createQueryKey("/api/shopping-lists"),
    select: (data) => data.filter(list => !list.isDefault), // Filter out default lists
  });

  // Query for default low stock list
  const { data: defaultList, isLoading: isLoadingDefaultList } = useQuery<ShoppingList>({
    queryKey: createQueryKey("/api/shopping-lists/default"),
  });

  // Query for inventory items
  const { data: inventory = [] } = useQuery<Inventory[]>({
    queryKey: createQueryKey("/api/inventory"),
  });

  // Query for shopping list items when an active list is selected - with optimized loading
  const { data: shoppingListItems = [], isLoading: isLoadingItems } = useQuery<
    (ShoppingListItem & { inventoryItem?: Inventory })[]
  >({
    queryKey: createQueryKey(`/api/shopping-lists/items/${activeListId}`),
    queryFn: async () => {
      if (!activeListId) return [];
      return await apiRequest("GET", `/api/shopping-lists/${activeListId}/items`);
    },
    enabled: !!activeListId,
    // Optimize loading time by caching responses
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (replaces old cacheTime)
    // Don't refetch on window focus to improve performance
    refetchOnWindowFocus: false,
  });

  // Mutation to create a new shopping list
  const createShoppingListMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return await apiRequest("POST", "/api/shopping-lists", {
        name: data.name,
        isDefault: false,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shopping list created successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/shopping-lists") });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create shopping list: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a shopping list
  const deleteShoppingListMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/shopping-lists/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shopping list deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/shopping-lists") });
      if (activeListId) {
        setActiveListId(null);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete shopping list: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to toggle the completed status of a shopping list item
  const toggleCompletedMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      return await apiRequest("PATCH", `/api/shopping-lists/items/${id}`, {
        completed,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createQueryKey(`/api/shopping-lists/items/${activeListId}`) });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update item: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to refill completed items
  const refillCompletedItemsMutation = useMutation({
    mutationFn: async (listId: number) => {
      return await apiRequest("POST", `/api/shopping-lists/${listId}/refill-completed`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Completed items have been added to inventory",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey(`/api/shopping-lists/items/${activeListId}`) });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/inventory") });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to refill items: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to remove an item from a shopping list
  const removeItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/shopping-lists/items/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item removed from shopping list",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey(`/api/shopping-lists/items/${activeListId}`) });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to remove item: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    createShoppingListMutation.mutate(data);
  };

  const handleDeleteList = (id: number) => {
    deleteShoppingListMutation.mutate(id);
  };

  const handleToggleCompleted = (id: number, completed: boolean) => {
    toggleCompletedMutation.mutate({ id, completed });
  };

  const handleRemoveItem = (id: number) => {
    removeItemMutation.mutate(id);
  };

  const handleRefillCompleted = () => {
    if (activeListId) {
      refillCompletedItemsMutation.mutate(activeListId);
    }
  };
  
  // Handle opening the default low stock list
  const handleOpenDefaultList = () => {
    if (defaultList) {
      setActiveListId(defaultList.id);
    } else {
      toast({
        title: "Loading",
        description: "Please wait while we prepare the low stock list",
      });
    }
  };

  // Get the active shopping list (could be a regular list or the default list)
  const activeList = activeListId === defaultList?.id 
    ? defaultList 
    : shoppingLists.find(list => list.id === activeListId);

  // Filter shopping list items based on search term
  const filteredItems = shoppingListItems.filter(item => 
    item.inventoryItem && item.inventoryItem.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count completed items
  const completedItemsCount = shoppingListItems.filter(item => item.completed === true).length;

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      form.reset();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <DashboardLayout
      title="Shopping Lists"
      actions={
        <div className="flex items-center gap-4">
          {/* Show "New Shopping List" button only on main page */}
          {!activeListId && (
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Shopping List
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Shopping List</DialogTitle>
                  <DialogDescription>
                    Enter a name for your new shopping list.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>List Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Weekly grocery list" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={createShoppingListMutation.isPending}>
                        {createShoppingListMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create List"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
          
          {/* Show different buttons based on context */}
          {activeListId ? (
            <Button variant="outline" onClick={() => setActiveListId(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lists
            </Button>
          ) : (
            <Link href="/inventory">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Inventory
              </Button>
            </Link>
          )}
        </div>
      }
    >
      <TooltipProvider>
        {!activeListId ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Default Low Stock List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Low Stock Items</CardTitle>
                <CardDescription>Items that need to be restocked</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {inventory.filter(item => item.quantity <= (item.minQuantity || 10)).length} items need restocking
                  </p>
                  <Button 
                    onClick={handleOpenDefaultList}
                    className="mt-2"
                    disabled={isLoadingDefaultList}
                  >
                    {isLoadingDefaultList ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingBag className="mr-2 h-4 w-4" />
                    )}
                    View List
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* User Shopping Lists */}
            {shoppingLists.map(list => (
              <Card key={list.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{list.name}</CardTitle>
                      <CardDescription>
                        {list.isDefault ? "Default List" : "Shopping List"}
                      </CardDescription>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will delete the shopping list and all its items. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteList(list.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setActiveListId(list.id)}
                    className="w-full"
                  >
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    View List
                  </Button>
                </CardContent>
              </Card>
            ))}
            
            {/* Empty state if no lists */}
            {shoppingLists.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No Shopping Lists</CardTitle>
                  <CardDescription>Create your first shopping list to get started</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Shopping List
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          // Shopping List Items View
          <div>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href="/inventory">
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Items
                    </Button>
                  </Link>
                  
                  {completedItemsCount > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={handleRefillCompleted}
                      disabled={refillCompletedItemsMutation.isPending}
                    >
                      {refillCompletedItemsMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Refill Completed Items
                    </Button>
                  )}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Status</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingItems ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        <p className="mt-2 text-sm text-muted-foreground">Loading items...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <p className="text-muted-foreground">No items found in this shopping list.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id} className={item.completed === true ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox 
                            checked={item.completed ? true : false} 
                            onCheckedChange={(checked: CheckedState) => 
                              handleToggleCompleted(item.id, checked === true)
                            }
                          />
                        </TableCell>
                        <TableCell className={item.completed === true ? "line-through text-muted-foreground" : ""}>
                          {item.inventoryItem?.name || "Unknown Item"}
                        </TableCell>
                        <TableCell>{item.inventoryItem?.category || "N/A"}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="p-4 text-sm text-muted-foreground">
                Showing {filteredItems.length} of {shoppingListItems.length} items
                {completedItemsCount > 0 && ` (${completedItemsCount} completed)`}
              </div>
            </div>
          </div>
        )}
      </TooltipProvider>
    </DashboardLayout>
  );
}