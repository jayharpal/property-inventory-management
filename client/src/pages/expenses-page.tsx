// @ts-nocheck
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, createQueryKey } from "@/lib/queryClient";
import { Expense, Inventory, Listing, Owner } from "@/lib/types";
import { Loader2, Search, Plus, FileText, Pencil, Trash2, Calendar, LayoutGrid, Table2, Check, ChevronsUpDown, CalendarIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatInTimeZone } from 'date-fns-tz';
import { cn } from "@/lib/utils";

const formSchema = z.object({
  listingId: z.string().min(1, "Listing is required"),
  // date: z.string().optional(),
  inventoryId: z.string().optional(),
  quantityUsed: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    {
      message: "Quantity must be greater than 0",
    }
  ),
  markupPercent: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    {
      message: "Markup must be a positive number",
    }
  ),
  totalCost: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    {
      message: "Cost must be greater than 0",
    }
  ),
  notes: z.string().optional(),
  expenseType: z.enum(["inventory", "custom", "service"]),
  serviceType: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ExpensesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [expenseType, setExpenseType] = useState<"inventory" | "custom" | "service">("inventory");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const { toast } = useToast();

  // Popover states for create form
  const [propertyPopoverOpen, setPropertyPopoverOpen] = useState(false);
  const [inventoryPopoverOpen, setInventoryPopoverOpen] = useState(false);

  // Popover states for edit form
  const [editPropertyPopoverOpen, setEditPropertyPopoverOpen] = useState(false);
  const [editInventoryPopoverOpen, setEditInventoryPopoverOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      listingId: "",
      inventoryId: "",
      quantityUsed: "2",
      markupPercent: "15",
      date: new Date(),
      totalCost: "0",
      notes: "",
      expenseType: "inventory",
    },
  });

  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery<Expense[]>({
    queryKey: createQueryKey("/api/expenses"),
  });

  const { data: listings = [] } = useQuery<Listing[]>({
    queryKey: createQueryKey("/api/listings"),
  });

  const { data: owners = [] } = useQuery<Owner[]>({
    queryKey: createQueryKey("/api/owners"),
  });

  const { data: inventory = [] } = useQuery<Inventory[]>({
    queryKey: createQueryKey("/api/inventory"),
  });

  // Create a second form for editing
  const editForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      listingId: "",
      inventoryId: "",
      quantityUsed: "2",
      markupPercent: "18",
      date: new Date(),
      totalCost: "0",
      notes: "",
      expenseType: "inventory",
    },
  });

  useEffect(() => {
    if (selectedExpense && isEditMode) {
      editForm.setValue(
        "date",
        selectedExpense.date
          ? new Date(selectedExpense.date).toISOString().split("T")[0]
          : ""
      );
    }
  }, [selectedExpense, isEditMode, editForm]);

  // useEffect(() => {
  //   if (selectedExpense && isEditMode) {
  //     if (selectedExpense.date) {
  //       const dateObj = new Date(selectedExpense.date);

  //       // Local timezone ma date banavo
  //       const localDate = new Date(
  //         dateObj.getTime() - dateObj.getTimezoneOffset() * 60000
  //       )
  //         .toISOString()
  //         .split("T")[0];

  //       editForm.setValue("date", localDate);
  //     } else {
  //       editForm.setValue("date", "");
  //     }
  //   }
  // }, [selectedExpense, isEditMode, editForm]);


  function getLocalPcTimeString(dateString) {
    const now = new Date();

    const pad = (n, w = 2) => String(n).padStart(w, "0");

    let year, month, day;

    if (dateString) {
      const parts = dateString.split("-");
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      year = now.getFullYear();
      month = pad(now.getMonth() + 1);
      day = pad(now.getDate());
    }

    const hour = pad(now.getHours());
    const minute = pad(now.getMinutes());
    const second = pad(now.getSeconds());
    const millis = String(now.getMilliseconds()).padStart(3, "0");

    return `${year}-${month}-${day}T${hour}:${minute}:${second}.${millis}`;
  }


  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Calculate billed amount as a string to ensure it's handled correctly
      const totalCost = parseFloat(values.totalCost);
      const markupPercent = parseFloat(values.markupPercent);
      const billedAmount = totalCost * (1 + markupPercent / 100);
      
      // Get the owner ID from the selected listing
      const selectedListing = listings.find(l => l.id === parseInt(values.listingId));
      if (!selectedListing) {
        throw new Error("Selected property not found");
      }
      
      // Prepare notes field to handle service type if needed
      let notes = values.notes;
      if (values.expenseType === "service" && values.serviceType) {
        // Prefix service notes with service type for easy identification
        notes = `Service: ${values.serviceType}${notes ? ' - ' + notes : ''}`;
      }
      
      const payload = {
        listingId: parseInt(values.listingId),
        ownerId: selectedListing.ownerId,
        inventoryId: values.expenseType === "inventory" && values.inventoryId ? 
          parseInt(values.inventoryId) : undefined,
        quantityUsed: parseInt(values.quantityUsed),
        markupPercent: values.markupPercent, // Send as string
        totalCost: values.totalCost, // Send as string
        billedAmount: billedAmount.toFixed(2), // Convert to string with 2 decimal places
        notes: notes,
        date: getLocalPcTimeString(values.date)
        // The portfolioId will be added by the backend based on the authenticated user
      };
      
      return await apiRequest("POST", "/api/expenses", payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense created successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/expenses") });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/inventory") });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/stats/dashboard") });
      setIsDialogOpen(false);
      form.reset({
        listingId: "",
        inventoryId: "",
        quantityUsed: "1",
        markupPercent: "15",
        totalCost: "0",
        notes: "",
        expenseType: "inventory",
        serviceType: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create expense: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (values: FormValues & { id: number }) => {
      const { id, ...formData } = values;
      
      // Calculate billed amount as a string to ensure it's handled correctly
      const totalCost = parseFloat(formData.totalCost);
      const markupPercent = parseFloat(formData.markupPercent);
      const billedAmount = totalCost * (1 + markupPercent / 100);
      
      // Get the owner ID from the selected listing
      const selectedListing = listings.find(l => l.id === parseInt(formData.listingId));
      if (!selectedListing) {
        throw new Error("Selected property not found");
      }
      
      // Prepare notes field to handle service type if needed
      let notes = formData.notes;
      if (formData.expenseType === "service" && formData.serviceType) {
        // Prefix service notes with service type for easy identification
        notes = `Service: ${formData.serviceType}${notes ? ' - ' + notes.replace(/^Service: \w+ - /, '') : ''}`;
      } else if (formData.expenseType !== "service" && notes && notes.startsWith("Service:")) {
        // If switching from service to another type, clean up the service prefix
        notes = notes.replace(/^Service: \w+ - /, '');
      }
      
      const payload = {
        listingId: parseInt(formData.listingId),
        ownerId: selectedListing.ownerId,
        inventoryId: formData.expenseType === "inventory" && formData.inventoryId ? 
          parseInt(formData.inventoryId) : undefined,
        quantityUsed: parseInt(formData.quantityUsed),
        markupPercent: formData.markupPercent, // Send as string
        totalCost: formData.totalCost, // Send as string
        billedAmount: billedAmount.toFixed(2), // Convert to string with 2 decimal places
        notes: notes,
        date: getLocalPcTimeString(formData.date)
      };
      
      return await apiRequest("PUT", `/api/expenses/${id}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/expenses") });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/stats/dashboard") });
      setIsDetailsDialogOpen(false);
      setSelectedExpense(null);
      setIsEditMode(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update expense: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/expenses") });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/stats/dashboard") });
      setIsDetailsDialogOpen(false);
      setIsDeleteAlertOpen(false);
      setSelectedExpense(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete expense: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });
  
  const parseAsLocalDate = (isoString:any) => {
      const localString = isoString.replace('Z', '');
      return new Date(localString);
  };

  const filteredExpenses = expenses
    .filter(
      (expense) => {
        const listing = listings.find(l => l.id === expense.listingId);
        const owner = owners.find(o => o.id === expense.ownerId);
        const item = expense.inventoryId ? inventory.find(i => i.id === expense.inventoryId) : null;
        
        return (
          (listing && listing.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (owner && owner.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (expense.notes && expense.notes.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
    )
    // Sort expenses by ID in descending order (newest first)
    .sort((a, b) => parseAsLocalDate(b.date) - parseAsLocalDate(a.date));

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  // Owner information is now derived from the property selection

  const handleInventoryChange = (inventoryId: string) => {
    const item = inventory.find(i => i && i.id === parseInt(inventoryId));
    if (item) {
      // Cap the quantity used to the available inventory
      let quantity = form.getValues("quantityUsed");
      const qtyNum = parseInt(quantity || "1");
      const cappedQty = Math.min(qtyNum, item.quantity);
      
      // Update the quantity if it was capped
      if (qtyNum !== cappedQty) {
        form.setValue("quantityUsed", cappedQty.toString());
        quantity = cappedQty.toString();
      }
      
      const totalCost = parseFloat(item.costPrice.toString()) * parseInt(quantity || "1");
      form.setValue("totalCost", totalCost.toString());
      form.setValue("markupPercent", item.defaultMarkup.toString());
    }
  };

  const handleQuantityChange = () => {
    const inventoryId = form.getValues("inventoryId");
    if (inventoryId) {
      handleInventoryChange(inventoryId);
    }
  };

  const handleEditQuantityChange = () => {
    const inventoryId = editForm.getValues("inventoryId");
    if (inventoryId) {
      handleEditInventoryChange(inventoryId);
    }
  };

  // Owner information is now derived from the property selection

  const handleEditInventoryChange = (inventoryId: string) => {
    const item = inventory.find(i => i && i.id === parseInt(inventoryId));
    if (item) {
      // Cap the quantity used to the available inventory
      let quantity = editForm.getValues("quantityUsed");
      const qtyNum = parseInt(quantity || "1");
      const cappedQty = Math.min(qtyNum, item.quantity);
      
      // Update the quantity if it was capped
      if (qtyNum !== cappedQty) {
        editForm.setValue("quantityUsed", cappedQty.toString());
        quantity = cappedQty.toString();
      }
      
      const totalCost = parseFloat(item.costPrice.toString()) * parseInt(quantity || "1");
      editForm.setValue("totalCost", totalCost.toString());
      editForm.setValue("markupPercent", item.defaultMarkup.toString());
    }
  };

  const calculateBilledAmount = (cost: string, markup: string): string => {
    if (!cost || !markup) return "0.00";
    const costValue = parseFloat(cost);
    const markupValue = parseFloat(markup);
    if (isNaN(costValue) || isNaN(markupValue)) return "0.00";
    return (costValue + (costValue * markupValue / 100)).toFixed(2);
  };
  
  // Extract service type from notes field (format: "Service: cleaning - Additional details")
  const extractServiceType = (notes: string): string => {
    if (notes.startsWith("Service:")) {
      const match = notes.match(/Service: (\w+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return "other";
  };
  
  // Format service type to be more readable (capitalize first letter)
  const formatServiceType = (serviceType: string): string => {
    return serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
  };

  const handleViewDetails = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsEditMode(false);
    
    // Set proper expense type for the form
    let expType = "custom";
    if (expense.inventoryId) {
      expType = "inventory";
    } else if (expense.notes && expense.notes.startsWith("Service:")) {
      expType = "service";
    }
    setExpenseType(expType as "inventory" | "custom" | "service");
    
    // Reset and populate the edit form
    editForm.reset({
      listingId: expense.listingId.toString(),
      inventoryId: expense.inventoryId ? expense.inventoryId.toString() : "",
      quantityUsed: expense.quantityUsed ? expense.quantityUsed.toString() : "1",
      markupPercent: expense.markupPercent.toString(),
      totalCost: expense.totalCost.toString(),
      notes: expense.notes || "",
      expenseType: expType as "inventory" | "custom" | "service",
      serviceType: expType === "service" ? extractServiceType(expense.notes || "") : "",
    });
    
    setIsDetailsDialogOpen(true);
  };

  const handleEditExpense = () => {
    setIsEditMode(true);
  };

  const handleUpdateExpense = (values: FormValues) => {
    if (selectedExpense) {
      updateMutation.mutate({
        ...values,
        id: selectedExpense.id,
      });
    }
  };

  const handleDeleteExpense = () => {
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = () => {
    if (selectedExpense) {
      deleteMutation.mutate(selectedExpense.id);
    }
  };

  return (
    <DashboardLayout
      title="Expense Tracking"
      actions={
        <>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Log Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Log New Expense</DialogTitle>
                <DialogDescription>
                  Record an expense for inventory usage, services, or custom items.
                </DialogDescription>
              </DialogHeader>
              <Tabs 
                defaultValue="inventory" 
                value={expenseType}
                onValueChange={(value) => {
                  setExpenseType(value as "inventory" | "custom" | "service");
                  form.setValue("expenseType", value as "inventory" | "custom" | "service");
                }}
              >
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="inventory">Inventory Item</TabsTrigger>
                  <TabsTrigger value="service">Service</TabsTrigger>
                  <TabsTrigger value="custom">Custom Expense</TabsTrigger>
                </TabsList>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <input type="hidden" {...form.register("expenseType")} />
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <input
                              type="date"
                              value={field.value ? new Date(field.value).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="border border-gray-300 rounded px-3 py-2"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="listingId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Property</FormLabel>
                          <Popover open={propertyPopoverOpen} onOpenChange={setPropertyPopoverOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value
                                    ? listings.find(
                                        (listing) => listing.id.toString() === field.value
                                      )?.name
                                    : "Select property"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                <CommandInput placeholder="Search property..." />
                                <CommandList>
                                  <CommandEmpty>No property found.</CommandEmpty>
                                  <CommandGroup>
                                    {listings
                                      .filter(listing => listing && listing.id)
                                      .map((listing) => {
                                        const owner = owners.find(o => o.id === listing.ownerId);
                                        return (
                                          <CommandItem
                                            value={listing.name}
                                            key={listing.id}
                                            onSelect={() => {
                                              field.onChange(listing.id.toString());
                                              form.setValue("listingId", listing.id.toString());
                                              if (owner) {
                                                form.setValue("markupPercent", owner.markupPercentage.toString());
                                              }
                                              setPropertyPopoverOpen(false);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                listing.id.toString() === field.value
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              )}
                                            />
                                            {listing.name} {owner ? `(${owner.name})` : ""}
                                          </CommandItem>
                                        );
                                      })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <TabsContent value="inventory" className="space-y-4 pt-4">
                      <FormField
                        control={form.control}
                        name="inventoryId"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Inventory Item</FormLabel>
                            <Popover open={inventoryPopoverOpen} onOpenChange={setInventoryPopoverOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-full justify-between",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value
                                      ? inventory.find(
                                          (item) => item.id.toString() === field.value
                                        )?.name
                                      : "Select inventory item"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                  <CommandInput placeholder="Search inventory item..." />
                                  <CommandList>
                                    <CommandEmpty>No inventory item found.</CommandEmpty>
                                    <CommandGroup>
                                      {inventory
                                        .filter(item => item && item.id && item.quantity > 0)
                                        .map((item) => (
                                          <CommandItem
                                            value={item.name}
                                            key={item.id}
                                            onSelect={() => {
                                              field.onChange(item.id.toString());
                                              form.setValue("inventoryId", item.id.toString());
                                              handleInventoryChange(item.id.toString());
                                              setInventoryPopoverOpen(false);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                item.id.toString() === field.value
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              )}
                                            />
                                            {item.name} ({item.quantity} in stock)
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="quantityUsed"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity Used</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleQuantityChange();
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="markupPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Markup (%)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="service" className="space-y-4 pt-4">
                      <FormField
                        control={form.control}
                        name="serviceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select service type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="cleaning">House Cleaning</SelectItem>
                                <SelectItem value="yardwork">Yard Work/Landscaping</SelectItem>
                                <SelectItem value="spa">Spa/Hot Tub Maintenance</SelectItem>
                                <SelectItem value="plumbing">Plumbing</SelectItem>
                                <SelectItem value="locksmith">Locksmith</SelectItem>
                                <SelectItem value="electrical">Electrical</SelectItem>
                                <SelectItem value="pest">Pest Control</SelectItem>
                                <SelectItem value="other">Other Service</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="totalCost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Service Cost ($)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0.01" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="markupPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Markup (%)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Details</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter details about the service provided..." 
                                className="resize-none" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    
                    <TabsContent value="custom" className="space-y-4 pt-4">
                      <FormField
                        control={form.control}
                        name="totalCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cost ($)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0.01" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={editForm.control}
                          name="markupPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Markup (%)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="quantityUsed"
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
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter details about this expense..." 
                                className="resize-none" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    
                    <div className="bg-muted/50 p-4 rounded-md">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Cost:</span>
                        <span>
                          ${form.watch("totalCost") ? parseFloat(form.watch("totalCost")).toFixed(2) : "0.00"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Markup ({form.watch("markupPercent") || 0}%):</span>
                        <span>
                          ${form.watch("totalCost") && form.watch("markupPercent") 
                            ? (parseFloat(form.watch("totalCost")) * parseFloat(form.watch("markupPercent")) / 100).toFixed(2) 
                            : "0.00"}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Billed to owner:</span>
                        <span>
                          ${calculateBilledAmount(form.watch("totalCost") || "0", form.watch("markupPercent") || "0")}
                        </span>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Log Expense"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </Tabs>
            </DialogContent>
          </Dialog>
        </>
      }
    >
      <div className="mb-6">
        <div className="flex space-x-4">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search expenses..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-1 border rounded-md">
            <Button 
              variant={viewMode === "card" ? "default" : "ghost"} 
              size="icon" 
              className="h-9 w-9"
              onClick={() => setViewMode("card")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === "table" ? "default" : "ghost"} 
              size="icon" 
              className="h-9 w-9"
              onClick={() => setViewMode("table")}
            >
              <Table2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoadingExpenses ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="h-5 bg-gray-200 rounded mb-4 w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2 w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4 w-2/3"></div>
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-muted-foreground mb-4">No expenses found</div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Your First Expense
          </Button>
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredExpenses
            .filter(expense => expense && expense.id) // Only include valid expenses
            .map((expense) => {
              const listing = listings.find(l => l && l.id === expense.listingId);
              const owner = owners.find(o => o && o.id === expense.ownerId);
              const item = expense.inventoryId ? inventory.find(i => i && i.id === expense.inventoryId) : null;
            
            return (
              <Card key={expense.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between">
                    <span>
                      {listing?.name || "Unknown Property"}
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {format(new Date(expense.date || new Date()), "MMM d, yyyy")}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Owner: {owner?.name || "Unknown"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="mb-2">
                    <span className="font-medium">
                      {item ? item.name : 
                       expense.notes && expense.notes.startsWith("Service:") ? 
                        `Service: ${formatServiceType(extractServiceType(expense.notes))}` : 
                        expense.notes ? "Custom: " + expense.notes.substring(0, 30) + (expense.notes.length > 30 ? "..." : "") :
                        "Custom Expense"}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {expense.quantityUsed && expense.quantityUsed > 1 && !expense.notes?.startsWith("Service:") ? 
                        `× ${expense.quantityUsed}` : ""}
                    </span>
                  </div>
                  {expense.notes && (
                    <>
                      {item && (
                        <p className="text-sm text-muted-foreground italic mb-3">"{expense.notes}"</p>
                      )}
                      {expense.notes.startsWith("Service:") && (
                        <p className="text-sm text-muted-foreground italic mb-3">
                          "{expense.notes.replace(/^Service: \w+ - /, "")}"
                        </p>
                      )}
                    </>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Cost: ${parseFloat(expense.totalCost.toString()).toFixed(2)}</span>
                    <span>Markup: {parseFloat(expense.markupPercent.toString())}%</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t flex justify-between">
                  <div className="font-medium">
                    Billed: ${parseFloat(expense.billedAmount.toString()).toFixed(2)}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary h-8 px-2 py-1"
                    onClick={() => handleViewDetails(expense)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Markup</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses
                .filter(expense => expense && expense.id) // Only include valid expenses
                .map((expense) => {
                  const listing = listings.find(l => l && l.id === expense.listingId);
                  const owner = owners.find(o => o && o.id === expense.ownerId);
                  const item = expense.inventoryId ? inventory.find(i => i && i.id === expense.inventoryId) : null;
                  const cost = parseFloat(expense.totalCost.toString());
                  const markup = parseFloat(expense.markupPercent.toString());
                  const billed = parseFloat(expense.billedAmount.toString());
                  return (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {formatInTimeZone((expense.date || new Date()), 'UTC', 'MMM d, yyyy')}
                        {/*  {format((expense.date || new Date()), "MMM d, yyyy")} */}
                      </TableCell>
                      <TableCell>{listing?.name || "Unknown"}</TableCell>
                      <TableCell>{owner?.name || "Unknown"}</TableCell>
                      <TableCell>
                        {item ? (
                          <span>
                            {item.name}
                            {expense.quantityUsed && expense.quantityUsed > 1 ? ` × ${expense.quantityUsed}` : ""}
                          </span>
                        ) : expense.notes && expense.notes.startsWith("Service:") ? (
                          <span>
                            {`Service: ${formatServiceType(extractServiceType(expense.notes))}`}
                            <span className="block text-xs text-muted-foreground">
                              {expense.notes.replace(/^Service: \w+ - /, "")}
                            </span>
                          </span>
                        ) : (
                          expense.notes || "Custom Expense"
                        )}
                      </TableCell>
                      <TableCell className="text-right">${cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{markup}%</TableCell>
                      <TableCell className="text-right">${billed.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleViewDetails(expense)}
                        >
                          <FileText className="h-4 w-4" />
                          <span className="sr-only">View details</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {/* Expense Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Expense" : "Expense Details"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Update expense information."
                : `View details for this expense (${format(new Date(selectedExpense?.date || new Date()), "MMM d, yyyy")})`
              }
            </DialogDescription>
          </DialogHeader>

          {selectedExpense && !isEditMode && (
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <div>
                  <p className="text-sm text-muted-foreground">Property</p>
                  <p className="font-medium">
                    {listings.find(l => l && l.id === selectedExpense.listingId)?.name || "Unknown"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="font-medium">
                    {owners.find(o => o && o.id === selectedExpense.ownerId)?.name || "Unknown"}
                  </p>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Item</p>
                <p className="font-medium">
                  {selectedExpense.inventoryId 
                    ? inventory.find(i => i && i.id === selectedExpense.inventoryId)?.name 
                    : selectedExpense.notes && selectedExpense.notes.startsWith("Service:")
                      ? `Service: ${formatServiceType(extractServiceType(selectedExpense.notes))}` 
                      : "Custom Expense"
                  }
                  {selectedExpense.quantityUsed && selectedExpense.quantityUsed > 1 && 
                   !selectedExpense.notes?.startsWith("Service:") && 
                   ` × ${selectedExpense.quantityUsed}`}
                </p>
              </div>
              
              {selectedExpense.notes && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {selectedExpense.notes.startsWith("Service:") ? "Service Details" : "Notes"}
                  </p>
                  <p className="italic">
                    {selectedExpense.notes.startsWith("Service:") 
                      ? selectedExpense.notes.replace(/^Service: \w+ - /, "")
                      : selectedExpense.notes
                    }
                  </p>
                </div>
              )}
              
              <div className="bg-muted/50 p-4 rounded-md mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Cost:</span>
                  <span>${parseFloat(selectedExpense.totalCost.toString()).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Markup ({parseFloat(selectedExpense.markupPercent.toString())}%):</span>
                  <span>
                    ${(parseFloat(selectedExpense.totalCost.toString()) * 
                      parseFloat(selectedExpense.markupPercent.toString()) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Billed to owner:</span>
                  <span>${parseFloat(selectedExpense.billedAmount.toString()).toFixed(2)}</span>
                </div>
              </div>
              
              <DialogFooter className="flex justify-between gap-2">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDeleteExpense}
                    className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsDetailsDialogOpen(false)}
                  >
                    Close
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleEditExpense}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}

          {selectedExpense && isEditMode && (
            <Tabs 
              defaultValue={selectedExpense.inventoryId ? "inventory" : "custom"} 
              value={expenseType}
              onValueChange={(value) => {
                setExpenseType(value as "inventory" | "custom" | "service");
                editForm.setValue("expenseType", value as "inventory" | "custom" | "service");
              }}
            >
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="inventory">Inventory Item</TabsTrigger>
                <TabsTrigger value="service">Service</TabsTrigger>
                <TabsTrigger value="custom">Custom Expense</TabsTrigger>
              </TabsList>
              
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(handleUpdateExpense)} className="space-y-4">
                  <input type="hidden" {...editForm.register("expenseType")} />
                  <FormField
                    control={editForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <input
                            type="date"
                            {...field}
                            className="border border-gray-300 rounded px-3 py-2"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="listingId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Property</FormLabel>
                        <Popover open={editPropertyPopoverOpen} onOpenChange={setEditPropertyPopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? listings.find(
                                      (listing) => listing.id.toString() === field.value
                                    )?.name
                                  : "Select property"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Search property..." />
                              <CommandList>
                                <CommandEmpty>No property found.</CommandEmpty>
                                <CommandGroup>
                                  {listings
                                    .filter(listing => listing && listing.id)
                                    .map((listing) => {
                                      const owner = owners.find(o => o.id === listing.ownerId);
                                      return (
                                        <CommandItem
                                          value={listing.name}
                                          key={listing.id}
                                          onSelect={() => {
                                            field.onChange(listing.id.toString());
                                            editForm.setValue("listingId", listing.id.toString());
                                            if (owner) {
                                              editForm.setValue("markupPercent", owner.markupPercentage.toString());
                                            }
                                            setEditPropertyPopoverOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              listing.id.toString() === field.value
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                          {listing.name} {owner ? `(${owner.name})` : ""}
                                        </CommandItem>
                                      );
                                    })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <TabsContent value="inventory" className="space-y-4 pt-4">
                    <FormField
                      control={editForm.control}
                      name="inventoryId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Inventory Item</FormLabel>
                          <Popover open={editInventoryPopoverOpen} onOpenChange={setEditInventoryPopoverOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value
                                    ? inventory.find(
                                        (item) => item.id.toString() === field.value
                                      )?.name
                                    : "Select inventory item"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                <CommandInput placeholder="Search inventory item..." />
                                <CommandList>
                                  <CommandEmpty>No inventory item found.</CommandEmpty>
                                  <CommandGroup>
                                    {inventory
                                      .filter(item => item && item.id) // Show all, even if quantity is 0 for editing
                                      .map((item) => (
                                        <CommandItem
                                          value={item.name}
                                          key={item.id}
                                          onSelect={() => {
                                            field.onChange(item.id.toString());
                                            editForm.setValue("inventoryId", item.id.toString());
                                            handleEditInventoryChange(item.id.toString());
                                            setEditInventoryPopoverOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              item.id.toString() === field.value
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                          {item.name} ({item.quantity} in stock)
                                        </CommandItem>
                                      ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="quantityUsed"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity Used</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  handleEditQuantityChange();
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="markupPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Markup (%)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" step="0.1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="service" className="space-y-4 pt-4">
                    <FormField
                      control={editForm.control}
                      name="serviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select service type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cleaning">House Cleaning</SelectItem>
                              <SelectItem value="yardwork">Yard Work/Landscaping</SelectItem>
                              <SelectItem value="spa">Spa/Hot Tub Maintenance</SelectItem>
                              <SelectItem value="plumbing">Plumbing</SelectItem>
                              <SelectItem value="locksmith">Locksmith</SelectItem>
                              <SelectItem value="electrical">Electrical</SelectItem>
                              <SelectItem value="pest">Pest Control</SelectItem>
                              <SelectItem value="other">Other Service</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="totalCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Cost ($)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0.01" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="markupPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Markup (%)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" step="0.1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={editForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Details</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter details about the service provided..." 
                              className="resize-none" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="custom" className="space-y-4 pt-4">
                    <FormField
                      control={editForm.control}
                      name="totalCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost ($)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0.01" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="markupPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Markup (%)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" step="0.1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="quantityUsed"
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
                    </div>
                    
                    <FormField
                      control={editForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter details about this expense..." 
                              className="resize-none" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <div className="bg-muted/50 p-4 rounded-md">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Cost:</span>
                      <span>
                        ${editForm.watch("totalCost") ? parseFloat(editForm.watch("totalCost")).toFixed(2) : "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Markup ({editForm.watch("markupPercent") || 0}%):</span>
                      <span>
                        ${editForm.watch("totalCost") && editForm.watch("markupPercent") 
                          ? (parseFloat(editForm.watch("totalCost")) * parseFloat(editForm.watch("markupPercent")) / 100).toFixed(2) 
                          : "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Billed to owner:</span>
                      <span>
                        ${calculateBilledAmount(editForm.watch("totalCost") || "0", editForm.watch("markupPercent") || "0")}
                      </span>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsEditMode(false)}
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
                        "Update Expense"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense
              and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 dark:bg-red-800 focus:ring-red-600 dark:focus:ring-red-700 hover:bg-red-700 dark:hover:bg-red-900"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
