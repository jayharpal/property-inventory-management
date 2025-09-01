import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Card,
  CardContent,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Owner, Listing } from "@/lib/types";
import { Loader2, Search, Plus, User, Edit, Trash } from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { apiRequest, queryClient, createQueryKey } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Form schema and type definitions
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  propertyType: z.string().optional(),
  ownerId: z.string().min(1, "Owner is required"),
  beds: z.string().optional(),
  baths: z.string().optional(),
  image: z.string().optional(),
  active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

// Helper function to parse string to number or null
const parseNumeric = (value: string | undefined, isFloat: boolean = false): number | null => {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }
  const num = isFloat ? parseFloat(value) : parseInt(value, 10);
  return isNaN(num) ? null : num;
};

export default function ListingsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState("all");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Load owners and listings data
  const { data: owners = [], isLoading: ownersLoading } = useQuery<Owner[]>({
    queryKey: createQueryKey("/api/owners"),
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/owners");
      // Ensure we return an array
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: listings = [], isLoading: listingsLoading } = useQuery<Listing[]>({
    queryKey: createQueryKey("/api/listings"),
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/listings");
      // Ensure we return an array
      return Array.isArray(response) ? response : [];
    },
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      propertyType: "",
      ownerId: "",
      beds: "",
      baths: "",
      image: "",
      active: true,
    },
  });

  // Create new listing mutation
  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        name: values.name,
        address: values.address,
        propertyType: values.propertyType,
        ownerId: parseInt(values.ownerId, 10),
        beds: values.beds !== null && values.beds !== undefined && values.beds !== "" ? String(values.beds) : undefined,
        baths: values.baths !== null && values.baths !== undefined && values.baths !== "" ? String(values.baths) : undefined,
        image: values.image || "",
        active: values.active,
      };
      
      return await apiRequest("POST", "/api/listings", payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Property listing created successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/listings") });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/dashboard") });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create property listing: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Update listing mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: { id: number } & FormValues) => {
      const payload = {
        name: values.name,
        address: values.address,
        propertyType: values.propertyType,
        ownerId: parseInt(values.ownerId, 10),
        beds: values.beds !== null && values.beds !== undefined && values.beds !== "" ? String(values.beds) : undefined,
        baths: values.baths !== null && values.baths !== undefined && values.baths !== "" ? String(values.baths) : undefined,
        image: values.image || "",
        active: values.active,
      };
      
      return await apiRequest("PUT", `/api/listings/${id}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Property listing updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/listings") });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/dashboard") });
      setIsDialogOpen(false);
      setIsEditMode(false);
      setSelectedListing(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update property listing: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Delete listing mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/listings/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Property listing deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/listings") });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/dashboard") });
      setIsDeleteDialogOpen(false);
      setSelectedListing(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete property listing: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Check for ownerId from URL parameters on location change
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1] || '');
    const ownerId = searchParams.get("ownerId");
    if (ownerId && ownerId !== selectedOwner) {
      console.log(`Setting selected owner from URL: ${ownerId}`);
      setSelectedOwner(ownerId);
    } else if (!ownerId && selectedOwner !== "all") {
      // If URL param is removed but state still has an owner, reset to 'all'
      // This handles browser back/forward navigation
      console.log("URL param removed, resetting owner filter.");
    }
  }, [location]);

  // Filter listings based on search term and selected owner
  const filteredListings = Array.isArray(listings) ? listings.filter(listing => {
    if (!listing) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = listing.name?.toLowerCase().includes(searchLower) ||
      listing.address?.toLowerCase().includes(searchLower) || false;
    
    const matchesOwner = selectedOwner === "all" || 
      (listing.ownerId?.toString() === selectedOwner);
      
    const matchesActiveStatus = activeFilter === "all" ||
      (activeFilter === "active" && listing.active) ||
      (activeFilter === "inactive" && !listing.active);

    return matchesSearch && matchesOwner && matchesActiveStatus;
  }).sort((a, b) => b.id - a.id) : [];

  const onSubmit = (values: any) => {
    if (isEditMode && selectedListing) {
      updateMutation.mutate({ id: selectedListing.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (listing: Listing) => {
    setSelectedListing(listing);
    setIsEditMode(true);
    form.reset({
      name: listing.name,
      address: listing.address,
      propertyType: listing.propertyType,
      ownerId: listing.ownerId.toString(),
      beds: listing.beds ? listing.beds.toString() : "",
      baths: listing.baths ? listing.baths.toString() : "",
      image: listing.image || "",
      active: listing.active === undefined ? true : listing.active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (listing: Listing) => {
    setSelectedListing(listing);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedListing) {
      deleteMutation.mutate(selectedListing.id);
    }
  };

  const getPropertyTypeBadgeClass = (propertyType: string) => {
    switch (propertyType.toLowerCase()) {
      case 'apartment':
        return 'bg-blue-100 text-blue-800';
      case 'house':
        return 'bg-green-100 text-green-800';
      case 'condo':
        return 'bg-purple-100 text-purple-800';
      case 'villa':
        return 'bg-amber-100 text-amber-800';
      case 'cabin':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRowClick = (listingId: number) => {
    navigate(`/listings/${listingId}`);
  };

  // Show loading state if no user available yet
  if (!user) {
    return (
      <DashboardLayout title="Listings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading user data...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Listings"
      actions={
        <>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setIsEditMode(false);
              setSelectedListing(null);
              form.reset({
                name: "",
                address: "",
                propertyType: "",
                ownerId: "",
                beds: "",
                baths: "",
                image: "",
                active: true,
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Listing
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>{isEditMode ? "Edit Listing" : "Add New Listing"}</DialogTitle>
                <DialogDescription>
                  {isEditMode 
                    ? "Update the details for this property listing." 
                    : "Enter the details for the new property listing."}
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
                          value={field.value || ""}
                          defaultValue={field.value}
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
                  {/* <FormField
                    control={form.control}
                    name="ownerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select owner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ownersLoading ? (
                              <SelectItem value="_loading" disabled>
                                Loading owners...
                              </SelectItem>
                            ) : owners.length === 0 ? (
                              <SelectItem value="_none" disabled>
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
                  /> */}

                  <FormField
                    control={form.control}
                    name="ownerId"
                    render={({ field }) => {
                      const [search, setSearch] = useState("");
                      const [showDropdown, setShowDropdown] = useState(false);

                      const filteredOwners = owners
                        .filter((owner) =>
                          owner.name.toLowerCase().includes(search.toLowerCase())
                        )
                        .sort((a, b) => a.name.localeCompare(b.name));

                      const selectedOwner = owners.find(
                        (o) => o.id.toString() === field.value
                      );

                      const handleSelect = (owner: { id: number; name: string }) => {
                        field.onChange(owner.id.toString());
                        setSearch(owner.name);
                        setShowDropdown(false);
                      };

                      return (
                        <FormItem className="flex flex-col relative">
                          <FormLabel>Owner</FormLabel>

                          <FormControl>
                            <input
                              type="text"
                              placeholder="Search owner..."
                              value={search !== "" ? search : ""}
                              onChange={(e) => {
                                setSearch(e.target.value);
                                setShowDropdown(true);
                              }}
                              onFocus={() => setShowDropdown(true)}
                              onBlur={() => setTimeout(() => setShowDropdown(false), 100)}
                              className="w-full border border-gray-300 rounded px-3 py-2"
                            />
                          </FormControl>

                          {showDropdown && filteredOwners.length > 0 && (
                            <ul className="absolute top-full left-0 right-0 border border-gray-300 bg-white z-10 max-h-40 overflow-auto rounded shadow">
                              {filteredOwners.map((owner) => (
                                <li
                                  key={owner.id}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                  onMouseDown={() => handleSelect(owner)}
                                >
                                  {owner.name}
                                </li>
                              ))}
                            </ul>
                          )}

                          <FormMessage />
                        </FormItem>
                      );
                    }}
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
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/property.jpg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 pt-2">
                        <FormControl>
                          <input 
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="form-checkbox h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-medium !mt-0">
                          Active Listing
                        </FormLabel>
                        <FormMessage />
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
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {createMutation.isPending || updateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isEditMode ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        isEditMode ? "Update Listing" : "Create Listing"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the listing
                  {selectedListing ? ` "${selectedListing.name}"` : ""}.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700"
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
        </>
      }
    >
      <div className="mb-6 space-y-4">
        {/* Owner filter section */}
        {selectedOwner !== "all" && (
          <div className="flex items-center justify-between border rounded-md p-3 bg-blue-50">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">
                Showing properties owned by: <strong>{owners.find(o => o.id.toString() === selectedOwner)?.name || selectedOwner}</strong>
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8"
              onClick={() => {
                setSelectedOwner("all");
                navigate("/listings");
              }}
            >
              Clear Filter
            </Button>
          </div>
        )}
        
        {/* Search and Owner Filter dropdowns */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search listings by name or address..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {selectedOwner === "all" && (
            <div className="w-full sm:w-64">
              <Select
                value={selectedOwner}
                onValueChange={(value) => {
                  setSelectedOwner(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {ownersLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    owners.map(owner => (
                      <SelectItem key={owner.id} value={owner.id.toString()}>
                        {owner.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="w-full sm:w-64">
            <Select
              value={activeFilter}
              onValueChange={(value) => setActiveFilter(value as "all" | "active" | "inactive")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Refactored Table View - This replaces the card grid */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Beds</TableHead>
                <TableHead className="text-center">Baths</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listingsLoading ? (
                // Loading Skeleton Rows
                [...Array(5)].map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredListings.length === 0 ? (
                // Empty State Row
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No listings found matching your criteria.
                    {(selectedOwner !== 'all' || activeFilter !== 'all') && ' Try clearing the filters.'}
                    <Button
                      variant="link"
                      className="p-0 h-auto ml-1 align-baseline"
                      onClick={() => setIsDialogOpen(true)}
                    >
                      Add a new listing?
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                // Data Rows
                filteredListings.map((listing) => {
                  const owner = owners.find(o => o.id === listing.ownerId);
                  return (
                    <TableRow
                      key={listing.id}
                      onClick={() => handleRowClick(listing.id)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{listing.name}</TableCell>
                      <TableCell>{listing.address}</TableCell>
                      <TableCell>{listing.propertyType}</TableCell>
                      <TableCell className="text-center">{listing.beds ?? '-'}</TableCell>
                      <TableCell className="text-center">{listing.baths ?? '-'}</TableCell>
                      <TableCell>
                        {owner ? (
                           <Link href={`/listings?ownerId=${owner.id}`} onClick={(e) => e.stopPropagation()}>
                             <span className="hover:underline">{owner.name}</span>
                           </Link>
                         ) : (
                           'Unknown'
                         )}
                      </TableCell>
                       <TableCell className="text-center">
                        <Badge variant={listing.active ? "default" : "secondary"} className={listing.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {listing.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); handleEdit(listing); }}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDelete(listing); }}
                        >
                          <Trash className="h-4 w-4" />
                           <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {/* Table Caption */}
            {!listingsLoading && filteredListings.length > 0 && (
              <TableCaption>Click on a row to view listing details.</TableCaption>
            )}
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}