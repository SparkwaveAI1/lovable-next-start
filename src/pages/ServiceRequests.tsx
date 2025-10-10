import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatToEasternCompact } from "@/lib/dateUtils";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useBusinessContext } from "@/contexts/BusinessContext";

interface ServiceRequest {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  lead_type: string;
  pipeline_stage: string;
  status_notes: string | null;
  created_at: string;
  next_follow_up_date: string | null;
}

export default function ServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedBusiness) {
      loadRequests();
    }
  }, [selectedBusiness, statusFilter]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("contacts")
        .select("*")
        .eq("business_id", selectedBusiness?.id)
        .in("lead_type", ["freeze_request", "cancellation_request"])
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("pipeline_stage", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error loading requests:", error);
      toast({
        title: "Error",
        description: "Failed to load service requests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, newStage: string) => {
    try {
      const { error } = await supabase
        .from("contacts")
        .update({ 
          pipeline_stage: newStage,
          updated_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Request status updated",
      });
      loadRequests();
    } catch (error) {
      console.error("Error updating request:", error);
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (stage: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      pending_review: { variant: "outline", icon: Clock },
      in_progress: { variant: "default", icon: AlertCircle },
      completed: { variant: "secondary", icon: CheckCircle2 },
      cancelled: { variant: "destructive", icon: XCircle },
    };

    const config = variants[stage] || { variant: "outline" as const, icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {stage.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getRequestTypeBadge = (type: string) => {
    return (
      <Badge variant={type === "freeze_request" ? "secondary" : "destructive"}>
        {type === "freeze_request" ? "Freeze" : "Cancellation"}
      </Badge>
    );
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.pipeline_stage === "pending_review").length,
    inProgress: requests.filter(r => r.pipeline_stage === "in_progress").length,
    completed: requests.filter(r => r.pipeline_stage === "completed").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        selectedBusinessId={selectedBusiness?.id}
        onBusinessChange={(id) => {
          const businesses = [
            { id: '456dc53b-d9d9-41b0-bc33-4f4c4a791eff', slug: 'fight-flow-academy', name: 'Fight Flow Academy' },
            { id: '5a9bbfcf-fae5-4063-9780-bcbe366bae88', slug: 'sparkwave-ai', name: 'Sparkwave AI' },
            { id: '18d0dbb1-a82d-4477-a9f8-816a1fa2ee08', slug: 'persona-ai', name: 'PersonaAI' },
            { id: '350b8fcb-9bfe-4b53-9548-c6ffdb1d3cb5', slug: 'charx-world', name: 'CharX World' }
          ];
          const business = businesses.find(b => b.id === id);
          if (business) setSelectedBusiness(business);
        }}
      />

      <main className="container mx-auto p-6 space-y-6 pt-2 md:pt-28">
        <div>
          <h1 className="text-3xl font-bold mb-2">Service Requests</h1>
          <p className="text-muted-foreground">
            Manage freeze and cancellation requests
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Requests</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No service requests found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{getRequestTypeBadge(request.lead_type)}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {request.first_name} {request.last_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {request.email && <div>{request.email}</div>}
                          {request.phone && <div className="text-muted-foreground">{request.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.pipeline_stage)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatToEasternCompact(request.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {request.pipeline_stage === "pending_review" && (
                            <Button
                              size="sm"
                              onClick={() => updateRequestStatus(request.id, "in_progress")}
                            >
                              Start Processing
                            </Button>
                          )}
                          {request.pipeline_stage === "in_progress" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateRequestStatus(request.id, "completed")}
                            >
                              Mark Complete
                            </Button>
                          )}
                          {request.pipeline_stage === "completed" && (
                            <Badge variant="secondary">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Done
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
