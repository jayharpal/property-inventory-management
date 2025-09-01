import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, createQueryKey } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
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
import { Inventory } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
type InventoryItem = {
  id: number;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
};
type LowInventoryProps = {
  items: InventoryItem[];
};


export default function LowInventory({ items }: LowInventoryProps) {
  const { toast } = useToast();
  const [reorderingIds, setReorderingIds] = useState<Set<number>>(new Set());
  const [isRefillDialogOpen, setIsRefillDialogOpen] = useState(false);
  const [refillItem, setRefillItem] = useState<Inventory | null>(null);
  
  const [DataItem, setDataItem] = useState<any>(items);

  // const reorderMutation = useMutation({
  //   mutationFn: async (itemId: number) => {
  //     // Here we'd usually submit a reorder request to an API
  //     // For this demo, we'll simulate a successful reorder by updating the item
  //     const item = items.find(i => i.id === itemId);
  //     if (!item) throw new Error("Item not found");
      
  //     const newQuantity = item.minQuantity * 2; // Reorder to twice the min quantity
  //     const res = await apiRequest("PUT", `/api/inventory/${itemId}`, {
  //       quantity: newQuantity
  //     });
  //     return res;
  //   },
  //   onMutate: (itemId: number) => {
  //     setReorderingIds(prev => new Set(prev).add(itemId));
  //   },
  //   onSuccess: (_, itemId) => {
  //     toast({
  //       title: "Reorder successful",
  //       description: "The inventory item has been restocked.",
  //     });
      
  //     // Remove from reordering state
  //     setReorderingIds(prev => {
  //       const newSet = new Set(prev);
  //       newSet.delete(itemId);
  //       return newSet;
  //     });
      
  //     // Refresh inventory data
  //     queryClient.invalidateQueries({ queryKey: createQueryKey("/api/stats/dashboard") });
  //     queryClient.invalidateQueries({ queryKey: createQueryKey("/api/inventory") });
  //     queryClient.invalidateQueries({ queryKey: createQueryKey("/api/inventory/low") });
  //   },
  //   onError: (error: Error, itemId) => {
  //     toast({
  //       title: "Reorder failed",
  //       description: error.message,
  //       variant: "destructive",
  //     });
      
  //     // Remove from reordering state
  //     setReorderingIds(prev => {
  //       const newSet = new Set(prev);
  //       newSet.delete(itemId);
  //       return newSet;
  //     });
  //   }
  // });
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
      onMutate: (id: any) => {
          setReorderingIds(prev => new Set(prev).add(id));
      },  
      onSuccess: (_,id:any) => {
        toast({
          title: "Success",
          description: "Inventory item refilled successfully",
        });
         GetData();
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
        setReorderingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        
      },
      onError: (error:Error,id:any) => {
        toast({
          title: "Error",
          description: `Failed to refill inventory item: ${(error as Error).message}`,
          variant: "destructive",
        });
        setReorderingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      },
    });
    const onRefillSubmit = (values: RefillFormValues) => {
     if (!refillItem) return;
    refillMutation.mutate({
      id: refillItem.id,
      quantityToAdd: parseInt(values.quantity, 10),
      cost: values.cost || undefined,
      notes: values.notes || undefined
    });
  };
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
    const refillForm = useForm<RefillFormValues>({
      resolver: zodResolver(refillFormSchema),
      defaultValues: {
        quantity: "1",
        cost: "",
        notes: "",
      },
    });
    const handleRefill = (item:any) => {
      setRefillItem(item);
      refillForm.reset({
        quantity: "1",
        cost: "",
        notes: "",
      });
      setIsRefillDialogOpen(true);
    };
  // const handleReorder = (itemId: number) => {
  //   reorderMutation.mutate(itemId);
  // };
  const getStatusBadge = (current: number, min: number) => {
    if (current === 0) return "bg-red-100 text-red-800";
    if (current <= min / 2) return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };
  
  const getStatusText = (current: number, min: number) => {
    if (current === 0) return "Out of Stock";
    if (current <= min / 2) return "Critical";
    return "Low";
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'kitchen supplies':
        return 'fa-coffee';
      case 'cleaning supplies':
        return 'fa-soap';
      case 'bathroom supplies':
        return 'fa-toilet-paper';
      case 'bedroom supplies':
        return 'fa-bed';
      case 'office supplies':
        return 'fa-paperclip';
      default:
        return 'fa-box';
    }
  };

  async function GetData(){
     const inventory = await apiRequest("GET", "/api/inventory");
     //var itemsnew:any = [];
                  if (Array.isArray(inventory)) {
                    items = inventory
                      .filter(item => item.quantity <= (item.minQuantity || 10))
                      .slice(0, 5)
                      .map(item => ({
                        id: item.id,
                        name: item.name,
                        category: item.category,
                        quantity: item.quantity,
                        minQuantity: item.minQuantity || 10
                      }));
                  }
                  setDataItem(items);
  }
  return (
    <>
    <Card className="shadow">
      <CardHeader className="px-5 py-4 border-b border-border flex justify-between items-center">
        <CardTitle className="text-lg font-medium leading-6 text-foreground">Low Inventory Items</CardTitle>
        <Link href="/inventory">
          <Button variant="link" className="text-sm font-medium text-primary hover:text-primary/80">
            View all
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="overflow-hidden p-0">
        {DataItem.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">No low inventory items found</p>
            <Link href="/inventory">
              <Button variant="link" className="mt-2 text-primary hover:text-primary/80">
                Manage inventory
              </Button>
            </Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Item
                </th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Remaining
                </th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {DataItem.map((item:any) => (
                <tr key={item.id} className="hover:bg-accent/50">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-muted rounded-md">
                        <i className={`fas ${getCategoryIcon(item.category)} text-muted-foreground`}></i>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">{item.name}</div>
                        <div className="text-sm text-muted-foreground">{item.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">{item.quantity}</div>
                    <div className="text-xs text-muted-foreground">Min: {item.minQuantity}</div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(item.quantity, item.minQuantity)}`}>
                      {getStatusText(item.quantity, item.minQuantity)}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="link"
                      className="text-primary hover:text-primary/80"
                      // onClick={() => handleReorder(item.id)}
                      onClick={() => handleRefill(item)} 
                      disabled={reorderingIds.has(item.id)}
                    >
                      {reorderingIds.has(item.id) ? "Refilling..." : "Refill"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
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
    </>
  );
}
