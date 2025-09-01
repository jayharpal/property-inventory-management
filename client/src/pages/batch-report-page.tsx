// @ts-nocheck
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, createQueryKey } from "@/lib/queryClient";
import { Report, Owner } from "@/lib/types";
import { Download, Send, FileText, ChevronLeft, Eye, Trash2, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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

// Define API_BASE_URL specifically for this file's assignment
// Ensure this matches your actual production backend URL if VITE_API_URL is not set during build
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.propsku.com";

// Extend Report type to include owner information from the API response
type ReportWithOwner = Report & {
  ownerName?: string;
  ownerEmail?: string;
};

export default function BatchReportPage() {
  const [_, params] = useRoute("/reports/batch/:batchId");
  const batchId = params?.batchId;
  const [notes, setNotes] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Get batch reports
  const {
    data: reports = [],
    isLoading,
    isError,
    error
  } = useQuery<ReportWithOwner[]>({
    queryKey: createQueryKey(`/api/reports/batch/${batchId}`),
    queryFn: async () => {
      if (!batchId) return [];
      return await apiRequest("GET", `/api/reports/batch/${batchId}`);
    },
    enabled: !!batchId,
  });

  // Get batch notes
  const { data: batchData } = useQuery<{ notes: string }>({
    queryKey: createQueryKey(`/api/reports/batch/${batchId}/notes`),
    queryFn: async () => {
      if (!batchId) return { notes: "" };
      return await apiRequest("GET", `/api/reports/batch/${batchId}/notes`);
    },
    enabled: !!batchId,
  });

  useEffect(() => {
    // Simply use the notes as-is from the server
    setNotes(batchData?.notes || '');
  }, [batchData]);

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      return await apiRequest("PATCH", `/api/reports/batch/${batchId}/notes`, { notes });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notes updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: createQueryKey(`/api/reports/batch/${batchId}/notes`) });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update notes: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Batch download mutation
  // const batchDownloadMutation = useMutation<void, Error, void>({
  //   mutationFn: async () => {
  //     if (!batchId) throw new Error("Batch ID is required for download.");
  //     // debugger
  //     // console.log(reports);
      
      
  //     // Construct the URL for the GET request
  //     // const downloadUrl = `${API_BASE_URL}/api/reports/batch/${batchId}/download`;
  //     // console.log("Attempting to download batch report from:", downloadUrl);

  //     // const downloadUrl = `${API_BASE_URL}/api/reports/batch/${batchId}/download`;
  //     // console.log("Attempting to download individual report from:", downloadUrl);
  //     const downloadUrl = `${API_BASE_URL}/api/reports/batch/${batchId}/download`;

  //     const response = await fetch(downloadUrl, {
  //       method: 'GET',
  //       credentials: "include",
  //       // mode: 'cors'
  //     });

  //     if (!response.ok) {
  //       const errorText = await response.text(); // Read error if any
  //       throw new Error(`Download failed: ${errorText}`);
  //     }

  //     // Turn response into a Blob (for ZIP file)
  //     const blob = await response.blob();
  //     const fileName = `batch_reports_${batchId}.zip`;

  //     // Create temporary link for download
  //     const link = document.createElement('a');
  //     link.href = window.URL.createObjectURL(blob);
  //     link.download = fileName;
  //     link.click();
  //     window.URL.revokeObjectURL(link.href);
      
  //     // Trigger the download by navigating to the URL
  //     // The browser will handle the file download prompted by res.download() from the server.
  //     // window.location.href = downloadUrl;
      
  //     // Since navigation handles the download, we resolve immediately.
  //     // The toast notification will be optimistic.
  //     return Promise.resolve();
  //   },
  //   onSuccess: () => {
  //     toast({
  //       title: "Success",
  //       description: "Reports package download initiated.", // Updated message
  //     });
  //   },
  //   onError: (error) => {
  //     toast({
  //       title: "Error",
  //       description: `Failed to initiate reports package download: ${(error as Error).message}`,
  //       variant: "destructive",
  //     });
  //   },
  // });
    const batchDownloadMutation = useMutation({
      
      mutationFn: async () => {
        
        if (!batchId) throw new Error("Report ID is required");
       try {
        // For downloads we need to handle raw response for binary data
        // Reverting to direct fetch as apiRequest doesn't support blob response type
          reports?.forEach(async (report) => {
              if(report.type !== 'batch'){
                const downloadUrl = `${API_BASE_URL}/api/reports/${report.id}/download`;
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
                if(report?.ownerName == null || report?.ownerName == undefined || report?.ownerName == ''){
                  a.download = `report_${report.id}.pdf`;
                }else{
                  a.download = `report_${report?.ownerName?.trim()
                  .toLowerCase()
                  .replace(/\s+/g, '_')
                  .replace(/[^\w_]/g, '')}.pdf`;
                }
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
             }
          });

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
  // Batch email mutation
  const batchEmailMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/reports/batch/${batchId}/email`);
    },
    onSuccess: (data) => {
      const successCount = data.results?.success || 0;
      const totalCount = (data.results?.success || 0) + (data.results?.failed || 0);
      
      toast({
        title: "Success",
        description: `Sent ${successCount} out of ${totalCount} reports to owners`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send batch emails: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });
  
  // Batch delete mutation
  const batchDeleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/reports/batch/${batchId}`);
    },
    onSuccess: (data) => {
      // Invalidate all reports queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: createQueryKey("/api/reports") });
      
      toast({
        title: "Batch Deleted",
        description: `Successfully deleted batch with ${data.count} reports`,
      });
      
      // Navigate back to reports page after a short delay to ensure the query invalidation has time to take effect
      setTimeout(() => {
        navigate("/reports");
      }, 300);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete batch: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(notes);
  };

  // Helper to get month name
  const getMonthName = (month: number | null) => {
    if (month === null) return 'Unknown';
    return new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  };

  // Format batch title
  const formatBatchTitle = () => {
    if (reports.length === 0) return "Loading...";
    
    const firstReport = reports[0];
    if (!firstReport) return "Unknown Report";
    
    // If the first report is a batch type report, its name is the batch title
    if (firstReport.type === 'batch' && firstReport.name) {
      return firstReport.name;
    }
    
    // Default format if no batch report is found
    return `${getMonthName(firstReport.month || null)} ${firstReport.year} - ${reports.length} owner${reports.length !== 1 ? 's' : ''}`;
  };

  if (isError) {
    return (
      <DashboardLayout title="Batch Report Error">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">Error loading batch reports: {(error as Error).message}</p>
          </div>
          <Button asChild>
            <Link href="/reports">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={isLoading ? "Loading Batch Report..." : formatBatchTitle()}
      actions={
        <Button asChild variant="outline">
          <Link href="/reports">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Link>
        </Button>
      }
    >
      <div className="space-y-6 p-4 max-w-7xl mx-auto">
        {/* Top Section - Batch Actions */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Batch Details</CardTitle>
              <CardDescription>
                {isLoading ? (
                  <Skeleton className="h-4 w-60" />
                ) : (
                  <span>
                    {reports.length > 0 && (
                      <>Generated on {new Date(reports[0].generatedAt || Date.now()).toLocaleDateString()}</>
                    )}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isLoading || batchDeleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Batch
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this batch of reports..."
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveNotes} 
                disabled={updateNotesMutation.isPending} 
                variant="outline" 
                size="sm"
              >
                Save Notes
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                This batch contains {isLoading ? "..." : reports.filter(report => report.type !== 'batch').length} owner report{reports.filter(report => report.type !== 'batch').length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex space-x-2">
              {/* <Button
                variant="outline"
                disabled={isLoading || batchEmailMutation.isPending}
                onClick={() => batchEmailMutation.mutate()}
              >
                <Send className="mr-2 h-4 w-4" />
                Email All
              </Button> */}
              <Button
                disabled={isLoading || batchDownloadMutation.isPending}
                onClick={() => batchDownloadMutation.mutate()}
              >
                <Download className="mr-2 h-4 w-4" />
                Download All
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Separator />

        {/* Reports List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Individual Reports</h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-9 w-28" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : reports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports
                .filter(report => report.type !== 'batch') // Filter out the batch report itself
                .map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <CardTitle>{report.ownerName}</CardTitle>
                    <CardDescription>
                      {getMonthName(report.month || null)} {report.year} Report
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      Generated: {new Date(report.generatedAt || Date.now()).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Status: {report.sent ? 'Sent to owner' : 'Not sent'}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button asChild variant="outline">
                      <Link href={`/reports/${report.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Report
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border rounded-lg bg-muted/20">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No reports found in this batch</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-destructive mr-2" />
              Delete Batch Report
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this batch and all its reports. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchDeleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                batchDeleteMutation.mutate();
              }}
              disabled={batchDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {batchDeleteMutation.isPending ? "Deleting..." : "Delete Batch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}