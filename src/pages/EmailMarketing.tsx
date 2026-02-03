import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { useBusinesses } from '@/hooks/useBusinesses';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Mail, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Send, 
  Loader2,
  ArrowLeft 
} from 'lucide-react';
import { CampaignBuilder } from '@/components/email/CampaignBuilder';
import { CampaignQueueMonitor } from '@/components/email/CampaignQueueMonitor';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string | null;
  target_type: string | null;
  target_tags: string[] | null;
  total_sent: number | null;
  total_opened: number | null;
  total_clicked: number | null;
  created_at: string | null;
  sent_at: string | null;
}

type ViewMode = 'list' | 'create' | 'edit' | 'sending';

export default function EmailMarketing() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [sendingCampaign, setSendingCampaign] = useState<Campaign | null>(null);

  const handleBusinessChange = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) setSelectedBusiness(business);
  };

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['email-campaigns', selectedBusiness?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('business_id', selectedBusiness?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!selectedBusiness?.id
  });

  const deleteCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('email_campaigns')
        .delete()
        .eq('id', campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Campaign deleted' });
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleSendCampaign = (campaign: Campaign) => {
    setSendingCampaign(campaign);
    setViewMode('sending');
  };

  const handleSendComplete = () => {
    setSendingCampaign(null);
    setViewMode('list');
    queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
  };

  const handleCreateNew = () => {
    setEditingCampaignId(null);
    setViewMode('create');
  };

  const handleEdit = (campaignId: string) => {
    setEditingCampaignId(campaignId);
    setViewMode('edit');
  };

  const handleSaveComplete = () => {
    setViewMode('list');
    setEditingCampaignId(null);
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingCampaignId(null);
  };

  const getStatusBadge = (status: string | null) => {
    const variants: Record<string, 'outline' | 'secondary' | 'default' | 'destructive'> = {
      draft: 'outline',
      scheduled: 'secondary',
      queued: 'secondary',
      sending: 'default',
      sent: 'default',
      paused: 'secondary',
      cancelled: 'outline',
      failed: 'destructive'
    };
    return (
      <Badge variant={variants[status || 'draft'] || 'outline'} className="capitalize">
        {status || 'draft'}
      </Badge>
    );
  };

  const getTargetingLabel = (campaign: Campaign) => {
    if (campaign.target_type === 'all') return 'All contacts';
    if (campaign.target_type === 'tags') {
      return `Tags: ${campaign.target_tags?.join(', ') || 'none'}`;
    }
    if (campaign.target_type === 'segment') return 'Segment';
    return campaign.target_type || 'All';
  };

  if (!selectedBusiness) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader 
          selectedBusinessId={undefined}
          onBusinessChange={handleBusinessChange}
        />
        <main className="container mx-auto px-4 sm:px-6 py-4 md:py-8 pt-2 md:pt-28">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Select a business to manage email campaigns.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Show builder view
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader
          selectedBusinessId={selectedBusiness?.id}
          onBusinessChange={handleBusinessChange}
        />
        <main className="container mx-auto px-4 sm:px-6 py-4 md:py-8 pt-2 md:pt-28 max-w-4xl">
          <Button variant="ghost" onClick={handleCancel} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
          <h1 className="text-2xl font-bold mb-6">
            {viewMode === 'create' ? 'Create Campaign' : 'Edit Campaign'}
          </h1>
          <CampaignBuilder
            businessId={selectedBusiness.id}
            campaignId={editingCampaignId || undefined}
            onSave={handleSaveComplete}
            onCancel={handleCancel}
          />
        </main>
      </div>
    );
  }

  // Show sending/queue monitor view
  if (viewMode === 'sending' && sendingCampaign) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader
          selectedBusinessId={selectedBusiness?.id}
          onBusinessChange={handleBusinessChange}
        />
        <main className="container mx-auto px-4 sm:px-6 py-4 md:py-8 pt-2 md:pt-28 max-w-2xl">
          <Button variant="ghost" onClick={handleSendComplete} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
          <h1 className="text-2xl font-bold mb-6">Send Campaign</h1>
          <CampaignQueueMonitor
            campaignId={sendingCampaign.id}
            campaignName={sendingCampaign.name}
            onComplete={handleSendComplete}
            onCancel={handleSendComplete}
          />
        </main>
      </div>
    );
  }

  // Show list view
  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={handleBusinessChange}
      businessName={selectedBusiness?.name}
    >
      <main className="container mx-auto px-4 sm:px-6 py-4 md:py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Email Marketing</h1>
          <p className="text-muted-foreground">
            Create and send email campaigns to your contacts
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Targeting</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Opens</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {campaign.subject}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {getTargetingLabel(campaign)}
                      </span>
                    </TableCell>
                    <TableCell>{campaign.total_sent || 0}</TableCell>
                    <TableCell>{campaign.total_opened || 0}</TableCell>
                    <TableCell>{campaign.total_clicked || 0}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {campaign.sent_at 
                          ? format(new Date(campaign.sent_at), 'MMM d, yyyy')
                          : campaign.created_at 
                            ? format(new Date(campaign.created_at), 'MMM d, yyyy')
                            : '-'
                        }
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(campaign.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {(campaign.status === 'draft' || campaign.status === 'queued' || campaign.status === 'paused') && (
                            <DropdownMenuItem onClick={() => handleSendCampaign(campaign)}>
                              <Send className="h-4 w-4 mr-2" />
                              {campaign.status === 'draft' ? 'Send Now' : 'Resume Sending'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => deleteCampaign.mutate(campaign.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first email campaign to reach your contacts
              </p>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      </main>
    </DashboardLayout>
  );
}
