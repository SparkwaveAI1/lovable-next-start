import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent, PageHeader } from "@/components/layout/PageLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Linkedin,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  User,
  Building2,
  PenSquare,
  CalendarClock,
  Clock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/contexts/BusinessContext";
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
import { format, formatDistanceToNow } from "date-fns";
import { getScheduledContent, cancelScheduledContent, ScheduledContentItem } from "@/lib/schedulingService";

interface LinkedInAccount {
  id: string;
  business_id: string;
  account_type: "personal" | "company";
  linkedin_urn: string;
  account_name: string;
  profile_url: string | null;
  timezone: string;
  token_expires_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_refresh_at: string | null;
  refresh_error_count: number;
  token_health: "valid" | "expiring_soon" | "expired";
}

const TOKEN_HEALTH_CONFIG: Record<
  LinkedInAccount["token_health"],
  { label: string; variant: "default" | "secondary" | "destructive"; icon: React.ReactNode }
> = {
  valid: {
    label: "Connected",
    variant: "default",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  expiring_soon: {
    label: "Expiring Soon",
    variant: "secondary",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  expired: {
    label: "Token Expired",
    variant: "destructive",
    icon: <XCircle className="w-3 h-3" />,
  },
};

export default function LinkedInAccounts() {
  const { selectedBusiness } = useBusinessContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectingType, setConnectingType] = useState<"personal" | "company" | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<LinkedInAccount | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // Scheduled posts queue
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledContentItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ScheduledContentItem | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const queueRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Handle OAuth callback result from URL params
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const accountName = searchParams.get("account");

    if (success === "true") {
      toast.success(
        accountName
          ? `LinkedIn account "${decodeURIComponent(accountName)}" connected successfully!`
          : "LinkedIn account connected successfully!"
      );
    } else if (error) {
      const errorMessages: Record<string, string> = {
        missing_params: "OAuth flow was interrupted. Please try again.",
        invalid_state: "Security check failed. Please try again.",
        token_exchange_failed: "Failed to obtain LinkedIn access. Please try again.",
        profile_fetch_failed: "Connected but failed to fetch profile. Please reconnect.",
        storage_failed: "Failed to save account. Please try again.",
        server_misconfigured: "Server configuration error. Contact support.",
        internal_error: "An unexpected error occurred. Please try again.",
      };
      const decoded = decodeURIComponent(error);
      toast.error(errorMessages[decoded] ?? `LinkedIn connection failed: ${decoded}`);
    }
  }, [searchParams]);

  const fetchAccounts = useCallback(async () => {
    if (!selectedBusiness) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to view LinkedIn accounts.");
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/linkedin-accounts?business_id=${selectedBusiness.id}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }

      const data = await response.json();
      setAccounts(data.accounts ?? []);
    } catch (err) {
      console.error("Failed to fetch LinkedIn accounts:", err);
      toast.error("Failed to load LinkedIn accounts. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Scheduled queue fetch
  const fetchScheduledQueue = useCallback(async () => {
    if (!selectedBusiness) return;
    setQueueLoading(true);
    try {
      const result = await getScheduledContent(selectedBusiness.id, 'scheduled', 20);
      if (result.success) {
        // Only LinkedIn posts
        setScheduledPosts(result.content.filter(c => c.platform === 'linkedin'));
      }
    } catch (err) {
      console.error('Failed to fetch scheduled queue:', err);
    } finally {
      setQueueLoading(false);
    }
  }, [selectedBusiness]);

  useEffect(() => {
    fetchScheduledQueue();
    // Auto-refresh every 30 seconds
    queueRefreshRef.current = setInterval(fetchScheduledQueue, 30_000);
    return () => {
      if (queueRefreshRef.current) clearInterval(queueRefreshRef.current);
    };
  }, [fetchScheduledQueue]);

  const handleCancelScheduled = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const result = await cancelScheduledContent(cancelTarget.id);
      if (!result.success) throw new Error(result.message);
      toast.success('Scheduled post cancelled');
      setCancelTarget(null);
      await fetchScheduledQueue();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to cancel post');
    } finally {
      setCancelling(false);
    }
  };

  const handleConnect = async (accountType: "personal" | "company") => {
    if (!selectedBusiness) {
      toast.error("Please select a business first.");
      return;
    }

    setConnectingType(accountType);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const authUrl = `${supabaseUrl}/functions/v1/linkedin-auth?business_id=${selectedBusiness.id}&account_type=${accountType}`;
      // Navigate to the OAuth initiation endpoint (it will redirect to LinkedIn)
      window.location.href = authUrl;
    } catch (err) {
      console.error("Failed to initiate LinkedIn OAuth:", err);
      toast.error("Failed to start LinkedIn connection. Please try again.");
      setConnectingType(null);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget || !selectedBusiness) return;

    setDisconnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/linkedin-accounts?id=${disconnectTarget.id}&business_id=${selectedBusiness.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }

      toast.success(`"${disconnectTarget.account_name}" disconnected.`);
      setDisconnectTarget(null);
      await fetchAccounts();
    } catch (err) {
      console.error("Failed to disconnect LinkedIn account:", err);
      toast.error("Failed to disconnect account. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  const renderTokenHealthBadge = (account: LinkedInAccount) => {
    const config = TOKEN_HEALTH_CONFIG[account.token_health];
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 text-xs">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="LinkedIn"
        description="Connect and manage LinkedIn accounts for automated posting and analytics."
      />
      <PageContent>
        {/* Connect buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            onClick={() => handleConnect("personal")}
            disabled={!!connectingType || !selectedBusiness}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {connectingType === "personal" ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <User className="w-4 h-4" />
            Connect Personal Account
          </Button>

          <Button
            onClick={() => handleConnect("company")}
            disabled={!!connectingType || !selectedBusiness}
            variant="outline"
            className="flex items-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            {connectingType === "company" ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <Building2 className="w-4 h-4" />
            Connect Company Page
          </Button>

          {accounts.length > 0 && (
            <Button
              onClick={() => navigate("/linkedin/compose")}
              variant="outline"
              className="flex items-center gap-2 border-green-600 text-green-600 hover:bg-green-50"
            >
              <PenSquare className="w-4 h-4" />
              Create Post
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={fetchAccounts}
            disabled={loading}
            className="ml-auto flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Business not selected */}
        {!selectedBusiness && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Linkedin className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a business to manage LinkedIn accounts.</p>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {selectedBusiness && loading && accounts.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-40" />
              <p className="text-sm">Loading accounts…</p>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {selectedBusiness && !loading && accounts.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Linkedin className="w-12 h-12 mx-auto mb-4 text-blue-200" />
              <h3 className="text-lg font-semibold mb-2">No LinkedIn Accounts Connected</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Connect a personal profile or company page to start scheduling posts and viewing analytics.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  onClick={() => handleConnect("personal")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <User className="w-4 h-4 mr-2" />
                  Connect Personal Account
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleConnect("company")}
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Connect Company Page
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accounts list */}
        {accounts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card key={account.id} className="relative group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                        {account.account_type === "company" ? (
                          <Building2 className="w-5 h-5 text-blue-600" />
                        ) : (
                          <User className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold truncate">
                          {account.account_name}
                        </CardTitle>
                        <CardDescription className="text-xs capitalize">
                          {account.account_type === "company" ? "Company Page" : "Personal Profile"}
                        </CardDescription>
                      </div>
                    </div>
                    {renderTokenHealthBadge(account)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {account.profile_url && (
                    <a
                      href={account.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline truncate block"
                    >
                      View on LinkedIn ↗
                    </a>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      <span className="font-medium">Expires:</span>{" "}
                      {formatDistanceToNow(new Date(account.token_expires_at), {
                        addSuffix: true,
                      })}
                    </p>
                    {account.last_refresh_at && (
                      <p>
                        <span className="font-medium">Last refresh:</span>{" "}
                        {format(new Date(account.last_refresh_at), "MMM d, h:mm a")}
                      </p>
                    )}
                    {account.refresh_error_count > 0 && (
                      <p className="text-amber-600">
                        ⚠ {account.refresh_error_count} refresh error
                        {account.refresh_error_count !== 1 ? "s" : ""}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Connected:</span>{" "}
                      {format(new Date(account.created_at), "MMM d, yyyy")}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDisconnectTarget(account)}
                    className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 mt-2"
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Disconnect
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info card */}
        {selectedBusiness && (
          <Card className="mt-6 border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="py-4">
              <div className="flex gap-3">
                <Linkedin className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">About LinkedIn Integration</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Tokens are encrypted at rest using pgcrypto</li>
                    <li>Personal accounts: can post to your profile feed</li>
                    <li>Company pages: full analytics (impressions, clicks) available</li>
                    <li>Text posts can be published immediately using "Create Post"</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </PageContent>

      {/* Scheduled Posts Queue */}
      {selectedBusiness && (scheduledPosts.length > 0 || queueLoading) && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-blue-600" />
              Scheduled Posts
              {scheduledPosts.length > 0 && (
                <Badge variant="secondary" className="ml-1">{scheduledPosts.length}</Badge>
              )}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchScheduledQueue}
              disabled={queueLoading}
              className="flex items-center gap-1.5 text-muted-foreground"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${queueLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {queueLoading && scheduledPosts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin opacity-40" />
                Loading queue…
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {scheduledPosts.map((post) => (
                <Card key={post.id} className="border-blue-100 dark:border-blue-900">
                  <CardContent className="py-3 px-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2 text-foreground">{post.content}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Scheduled for {format(new Date(post.scheduled_for), "MMM d, yyyy 'at' h:mm a")}
                        {" · "}
                        {formatDistanceToNow(new Date(post.scheduled_for), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs">Scheduled</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                        onClick={() => setCancelTarget(post)}
                        title="Cancel scheduled post"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disconnect confirmation dialog */}
      <AlertDialog
        open={!!disconnectTarget}
        onOpenChange={(open) => !open && setDisconnectTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect LinkedIn Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection to{" "}
              <strong>{disconnectTarget?.account_name}</strong>. Any scheduled
              posts using this account will need to be reassigned. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {disconnecting ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                  Disconnecting…
                </>
              ) : (
                "Disconnect"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel scheduled post confirmation */}
      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Scheduled Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the post from the queue. The draft content will not be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelScheduled}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {cancelling ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                  Cancelling…
                </>
              ) : (
                "Cancel Post"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
