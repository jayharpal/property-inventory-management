import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, createQueryKey } from "@/lib/queryClient";
import { Owner } from "@/lib/types";
import { Loader2, Search, Plus, Trash2, Edit, Mail, Home } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
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

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().optional(),
  phone: z.string().optional(),
  markupPercentage: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    {
      message: "Markup must be a positive number",
    }
  ),
});

type FormValues = z.infer<typeof formSchema>;

export default function OwnersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      markupPercentage: "15",
    },
  });

  const { data: owners = [], isLoading } = useQuery<Owner[]>({
    queryKey: createQueryKey("/api/owners"),
    queryFn: async () => {
      return await apiRequest("GET", "/api/owners");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        // Keep markupPercentage as a string to match the schema expectation
        markupPercentage: values.markupPercentage,
      };
      
      if (editingOwner) {
        return await apiRequest("PUT", `/api/owners/${editingOwner.id}`, payload);
      } else {
        return await apiRequest("POST", "/api/owners", payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: editingOwner 
          ? "Owner updated successfully" 
          : "Owner created successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/owners") });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/dashboard") });
      setIsDialogOpen(false);
      setEditingOwner(null);
      form.reset({
        name: "",
        email: "",
        phone: "",
        markupPercentage: "15",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${editingOwner ? 'update' : 'create'} owner: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/owners/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Owner deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/owners") });
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/dashboard") });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete owner: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const filteredOwners = owners.filter(
    (owner) =>
      owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  const handleEdit = (owner: Owner) => {
    setEditingOwner(owner);
    form.reset({
      name: owner.name,
      email: owner.email,
      phone: owner.phone || "",
      markupPercentage: owner.markupPercentage.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  return (
    <DashboardLayout
      title="Property Owners"
      actions={
        <>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingOwner(null);
              form.reset({
                name: "",
                email: "",
                phone: "",
                markupPercentage: "15",
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Owner
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>{editingOwner ? "Edit Owner" : "Add New Owner"}</DialogTitle>
                <DialogDescription>
                  {editingOwner 
                    ? "Update the property owner details." 
                    : "Enter the details for the new property owner."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* <FormField
                    control={form.control}
                    name="markupPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Markup (%)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  /> */}
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
                          {editingOwner ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        editingOwner ? "Update Owner" : "Create Owner"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </>
      }
    >
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search owners by name or email..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded mb-2" />
          ))}
        </div>
      ) : filteredOwners.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-gray-500 mb-4">No owners found</div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Owner
          </Button>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                {/* <TableHead>Markup %</TableHead> */}
                <TableHead>Properties</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOwners.map((owner) => (
                <TableRow key={owner.id}>
                  <TableCell className="font-medium">{owner.name}</TableCell>
                  <TableCell>
                    <div>{owner.email}</div>
                    {owner.phone && (
                      <div className="text-gray-500 text-sm">{owner.phone}</div>
                    )}
                  </TableCell>
                  {/* <TableCell>{owner.markupPercentage}%</TableCell> */}
                  <TableCell>
                    <Button variant="link" size="sm" className="p-0 h-auto text-primary" asChild>
                      <Link href={`/owners/${owner.id}`}>
                        <Home className="h-3 w-3 mr-1" /> View Details
                      </Link>
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(owner)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-blue-600">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the owner "{owner.name}" 
                              and remove all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => handleDelete(owner.id)}
                            >
                              Delete Owner
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
        </div>
      )}
    </DashboardLayout>
  );
}
