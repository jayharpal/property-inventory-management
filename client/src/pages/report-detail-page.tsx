// @ts-nocheck
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, createQueryKey } from "@/lib/queryClient";
import { type Report, type Expense, type Listing } from "@/lib/types";
import { ArrowLeft, Download, Mail, BarChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define API_BASE_URL specifically for this file's fetch call
// Ensure this matches your actual production backend URL if VITE_API_URL is not set during build
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.propsku.com";

// Extended types for our components
type ReportWithOwner = Report & {
  ownerName?: string;
  ownerEmail?: string;
};

type ReportData = {
  report: ReportWithOwner;
  expenses: Expense[];
  listings: Listing[];
  expensesByProperty: Array<{ listing: Listing; expenses: Expense[]; total: number }>;
  summary: {
    totalExpenses: number;
    totalProperties: number;
  };
};

export default function ReportDetailPage() {
  const [_, params] = useRoute("/reports/:reportId");
  const reportId = params?.reportId ? parseInt(params.reportId) : null;
  const { toast } = useToast();

  // Query for report details
  const {
    data,
    isLoading,
    isError,
    error
  } = useQuery<ReportData>({
    queryKey: createQueryKey(`/api/reports/${reportId}`),
    queryFn: async () => {
      if (!reportId) throw new Error("Report ID is required");
      return await apiRequest("GET", `/api/reports/${reportId}/details`);
    },
    enabled: !!reportId,
  });

  // Download report mutation
  const downloadMutation = useMutation({
    mutationFn: async () => {
      if (!reportId) throw new Error("Report ID is required");
      
      try {
        // For downloads we need to handle raw response for binary data
        // Reverting to direct fetch as apiRequest doesn't support blob response type
        const downloadUrl = `${API_BASE_URL}/api/reports/${reportId}/download`;
        console.log("Attempting to download individual report from:", downloadUrl);
        const response = await fetch(downloadUrl, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to download report: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        if (!blob) {
           throw new Error('Failed to get blob data from response.');
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        if(data?.expensesByProperty[0]?.listing?.name == null || data?.expensesByProperty[0]?.listing?.name == undefined || data?.expensesByProperty[0]?.listing?.name == ''){
          a.download = `report_${reportId}.pdf`;
        }else{
          a.download = `report_${data?.expensesByProperty?.[0]?.listing?.name?.trim()
                  .toLowerCase()
                  .replace(/\s+/g, '_')
                  .replace(/[^\w_]/g, '')}.pdf`;
        }
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return { success: true };
      } catch (error) {
        console.error("Download error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report downloaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to download report: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });
  
  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!reportId) throw new Error("Report ID is required");
      return await apiRequest("POST", `/api/reports/${reportId}/email`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report sent successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey(`/api/reports/${reportId}`) });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send report: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Helper to get month name
  const getMonthName = (month: number | null) => {
    if (month === null) return 'Unknown';
    return new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isError) {
    return (
      <DashboardLayout title="Report Error">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">Error loading report: {(error as Error).message}</p>
          </div>
          <Button asChild>
            <Link href="/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const report = data?.report;
  const loading = isLoading || !data;

  return (
    <DashboardLayout 
      title={loading ? "Loading Report..." : `${report?.ownerName || "Unknown"} - ${getMonthName(report?.month || null)} ${report?.year || ""} Report`}
      actions={
        <div className="flex space-x-2">
          <Button asChild variant="outline">
            <Link href={report?.batchId ? `/reports/batch/${report.batchId}` : "/reports"}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {report?.batchId ? "Back to Batch" : "Back to Reports"}
            </Link>
          </Button>
          <Button
            variant="outline"
            disabled={loading || downloadMutation.isPending}
            onClick={() => downloadMutation.mutate()}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          {/* <Button
            variant="outline"
            disabled={loading || sendEmailMutation.isPending}
            onClick={() => sendEmailMutation.mutate()}
          >
            <Mail className="mr-2 h-4 w-4" />
            Send to Owner
          </Button> */}
        </div>
      }
    >
      <div className="space-y-8 p-4 max-w-7xl mx-auto">
        {/* Report Header Info */}
        <Card>
          <CardHeader>
            <CardTitle>{loading ? <Skeleton className="h-6 w-64" /> : `${report?.ownerName || "Unknown"} Expense Report`}</CardTitle>
            <CardDescription>
              {loading ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <span>
                  {getMonthName(report?.month || null)} {report?.year} | Generated: {
                    report?.generatedAt ? new Date(report.generatedAt).toLocaleString() : 'Unknown'
                  }
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <h3 className="text-xl font-semibold">Total Expenses</h3>
                {loading ? (
                  <Skeleton className="h-8 w-24 mx-auto mt-2" />
                ) : (
                  <p className="text-2xl font-bold mt-2">{formatCurrency(data.summary.totalExpenses)}</p>
                )}
              </div>
              
              <div className="rounded-lg border p-4 text-center">
                <h3 className="text-xl font-semibold">Properties</h3>
                {loading ? (
                  <Skeleton className="h-8 w-24 mx-auto mt-2" />
                ) : (
                  <p className="text-2xl font-bold mt-2">{data.summary.totalProperties || data.listings.length}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Properties and Expenses Table */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Properties and Expenses</h2>
          
          {loading ? (
            <Card>
              <CardContent className="p-4">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ) : data.expensesByProperty.length > 0 ? (
            <Card>
              <CardContent className="p-0 overflow-auto">
                <Table>
                  <TableCaption>Summary of expenses by property</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.expensesByProperty.map((item) => (
                      <TableRow key={item.listing.id}>
                        <TableCell className="font-medium">{item.listing.name}</TableCell>
                        <TableCell>{item.listing.address}</TableCell>
                        <TableCell>
                          {item.listing.propertyType.charAt(0).toUpperCase() + 
                            item.listing.propertyType.slice(1)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="font-semibold">
                      <TableCell colSpan={3}>TOTAL</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.summary.totalExpenses)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <p className="text-center text-muted-foreground py-8">No properties or expenses found</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Expense Details */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center">
              <BarChart className="h-5 w-5 mr-2" />
              Property Expense Details
            </CardTitle>
            <Button
              disabled={loading || downloadMutation.isPending}
              onClick={() => downloadMutation.mutate()}
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Complete Report
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="py-4 space-y-6">
                {data.expensesByProperty.length === 0 && (
                  <p className="text-center text-muted-foreground">No detailed property expenses available</p>
                )}
                {data.expensesByProperty.map((propertyExpenses) => (
                  <div key={propertyExpenses.listing.id} className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">{propertyExpenses.listing.name}</h3>
                    {propertyExpenses.expenses.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {propertyExpenses.expenses.map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell>{expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A'}</TableCell>
                              <TableCell>{expense.name || 'N/A'}</TableCell>
                              <TableCell className="text-right">{formatCurrency(Number(expense.billedAmount))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground">No expenses recorded for this property during the report period.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}