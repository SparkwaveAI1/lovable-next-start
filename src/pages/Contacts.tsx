import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { useBusinesses } from '@/hooks/useBusinesses';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ContactDetail } from '@/components/ContactDetail';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Tags,
  X,
  Loader2,
} from 'lucide-react';
import { formatToEasternCompact } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string | null;
  pipeline_stage: string | null;
  tags: string[] | null;
  last_activity_date: string | null;
  created_at: string;
}

interface ContactTag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

type SortField = 'created_at' | 'first_name' | 'last_name' | 'email' | 'status' | 'last_activity_date';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function StatusBadge({ status }: { status: string | null }) {
  const config: Record<string, { label: string; className: string }> = {
    active:        { label: 'Active',        className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    new_lead:      { label: 'New Lead',      className: 'bg-blue-100 text-blue-700 border-blue-200' },
    lead:          { label: 'Lead',          className: 'bg-blue-100 text-blue-700 border-blue-200' },
    qualified:     { label: 'Qualified',     className: 'bg-green-100 text-green-700 border-green-200' },
    trial:         { label: 'Trial',         className: 'bg-amber-100 text-amber-700 border-amber-200' },
    member:        { label: 'Member',        className: 'bg-purple-100 text-purple-700 border-purple-200' },
    active_member: { label: 'Active Member', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    inactive:      { label: 'Inactive',      className: 'bg-slate-100 text-slate-500 border-slate-200' },
    cancelled:     { label: 'Cancelled',     className: 'bg-red-100 text-red-700 border-red-200' },
  };
  const key = status?.toLowerCase() ?? '';
  const s = config[key] ?? {
    label: status
      ? status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'Unknown',
    className: 'bg-slate-100 text-slate-400 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium whitespace-nowrap ${s.className}`}>
      {s.label}
    </span>
  );
}

const TAG_COLORS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function Contacts() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
  const { toast } = useToast();

  // View state
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Sort state
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Add contact dialog state
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const [newContactFirstName, setNewContactFirstName] = useState('');
  const [newContactLastName, setNewContactLastName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);

  // Bulk action dialog state
  const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false);
  const [bulkTagAction, setBulkTagAction] = useState<'add' | 'remove'>('add');
  const [bulkSelectedTags, setBulkSelectedTags] = useState<string[]>([]);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Fetch contact tags for filters
  const { data: availableTags = [] } = useQuery({
    queryKey: ['contact-tags', selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) return [];
      const { data, error } = await supabase
        .from('contact_tags')
        .select('id, name, slug, color')
        .eq('business_id', selectedBusiness.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as ContactTag[];
    },
    enabled: !!selectedBusiness?.id,
  });

  // Fetch contacts with pagination
  const { data: contactsData, isLoading, refetch } = useQuery({
    queryKey: ['contacts', selectedBusiness?.id, searchTerm, statusFilter, selectedTagFilters, page, pageSize, sortField, sortDirection],
    queryFn: async () => {
      if (!selectedBusiness?.id) return { contacts: [], totalCount: 0 };

      let query = supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, source, status, pipeline_stage, tags, last_activity_date, created_at', { count: 'exact' })
        .eq('business_id', selectedBusiness.id);

      // Apply search filter
      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply tag filter (contacts must have at least one of the selected tags)
      if (selectedTagFilters.length > 0) {
        query = query.overlaps('tags', selectedTagFilters);
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        contacts: (data || []) as Contact[],
        totalCount: count || 0,
      };
    },
    enabled: !!selectedBusiness?.id,
  });

  const contacts = contactsData?.contacts || [];
  const totalCount = contactsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(0);
  };

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const isAllSelected = contacts.length > 0 && contacts.every(c => selectedIds.has(c.id));
  const isSomeSelected = contacts.some(c => selectedIds.has(c.id)) && !isAllSelected;

  // Bulk tag operations
  const handleBulkTagOperation = async () => {
    if (selectedIds.size === 0 || bulkSelectedTags.length === 0) return;

    setIsBulkUpdating(true);
    try {
      for (const contactId of selectedIds) {
        const contact = contacts.find(c => c.id === contactId);
        if (!contact) continue;

        const currentTags = contact.tags || [];
        let newTags: string[];

        if (bulkTagAction === 'add') {
          newTags = [...new Set([...currentTags, ...bulkSelectedTags])];
        } else {
          newTags = currentTags.filter(t => !bulkSelectedTags.includes(t));
        }

        await supabase
          .from('contacts')
          .update({ tags: newTags })
          .eq('id', contactId);
      }

      toast({
        title: 'Tags Updated',
        description: `Successfully ${bulkTagAction === 'add' ? 'added' : 'removed'} tags for ${selectedIds.size} contacts`,
      });

      setBulkTagDialogOpen(false);
      setBulkSelectedTags([]);
      setSelectedIds(new Set());
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update tags',
        variant: 'destructive',
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Bulk status change
  const handleBulkStatusChange = async () => {
    if (selectedIds.size === 0 || !bulkNewStatus) return;

    setIsBulkUpdating(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ status: bulkNewStatus })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Successfully updated status for ${selectedIds.size} contacts`,
      });

      setBulkStatusDialogOpen(false);
      setBulkNewStatus('');
      setSelectedIds(new Set());
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Add contact handler
  const handleAddContact = async () => {
    if (!selectedBusiness?.id || !newContactFirstName.trim()) return;

    setIsAddingContact(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .insert({
          business_id: selectedBusiness.id,
          first_name: newContactFirstName.trim(),
          last_name: newContactLastName.trim() || null,
          email: newContactEmail.trim() || null,
          phone: newContactPhone.trim() || null,
          status: 'new_lead',
          source: 'manual',
        });

      if (error) throw error;

      toast({
        title: 'Contact Added',
        description: `${newContactFirstName} ${newContactLastName} has been added.`,
      });

      setAddContactDialogOpen(false);
      setNewContactFirstName('');
      setNewContactLastName('');
      setNewContactEmail('');
      setNewContactPhone('');
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add contact',
        variant: 'destructive',
      });
    } finally {
      setIsAddingContact(false);
    }
  };

  const getTagColor = (tagSlug: string) => {
    const tag = availableTags.find(t => t.slug === tagSlug);
    return TAG_COLORS[tag?.color || 'gray'] || TAG_COLORS.gray;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  // Show ContactDetail if a contact is selected
  if (selectedContactId) {
    return (
      <DashboardLayout
        selectedBusinessId={selectedBusiness?.id}
        onBusinessChange={(id) => {
          const business = businesses.find((b) => b.id === id);
          if (business) setSelectedBusiness(business);
        }}
        businessName={selectedBusiness?.name}
      >
        <main className="container mx-auto px-4 py-6">
          <ContactDetail
            contactId={selectedContactId}
            onBack={() => setSelectedContactId(null)}
          />
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        const business = businesses.find((b) => b.id === id);
        if (business) setSelectedBusiness(business);
      }}
      businessName={selectedBusiness?.name}
    >
      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              <h1 className="text-xl sm:text-2xl font-bold">Contacts</h1>
              <Badge variant="secondary" className="text-xs">{totalCount}</Badge>
            </div>
            <Button onClick={() => setAddContactDialogOpen(true)} disabled={!selectedBusiness?.id} size="sm" className="sm:size-default w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            {/* Search */}
            <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new_lead">New Lead</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="active_member">Active Member</SelectItem>
              </SelectContent>
            </Select>

            {/* Tag Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto sm:min-w-[120px]">
                  <Tags className="h-4 w-4 mr-2" />
                  Tags {selectedTagFilters.length > 0 && `(${selectedTagFilters.length})`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {availableTags.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No tags available</div>
                ) : (
                  availableTags.map((tag) => (
                    <DropdownMenuItem
                      key={tag.id}
                      onSelect={(e) => {
                        e.preventDefault();
                        const isSelected = selectedTagFilters.includes(tag.slug);
                        if (isSelected) {
                          setSelectedTagFilters(selectedTagFilters.filter(t => t !== tag.slug));
                        } else {
                          setSelectedTagFilters([...selectedTagFilters, tag.slug]);
                        }
                        setPage(0);
                      }}
                    >
                      <Checkbox
                        checked={selectedTagFilters.includes(tag.slug)}
                        className="mr-2"
                      />
                      <span className={`px-2 py-0.5 rounded text-xs ${TAG_COLORS[tag.color || 'gray']}`}>
                        {tag.name}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear Filters */}
            {(searchTerm || statusFilter !== 'all' || selectedTagFilters.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSelectedTagFilters([]);
                  setPage(0);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Active Tag Filters */}
          {selectedTagFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Filtering by:</span>
              {selectedTagFilters.map((tagSlug) => {
                const tag = availableTags.find(t => t.slug === tagSlug);
                return (
                  <Badge
                    key={tagSlug}
                    variant="secondary"
                    className={`cursor-pointer ${getTagColor(tagSlug)}`}
                    onClick={() => setSelectedTagFilters(selectedTagFilters.filter(t => t !== tagSlug))}
                  >
                    {tag?.name || tagSlug}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 mb-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkTagAction('add');
                  setBulkTagDialogOpen(true);
                }}
              >
                <Tags className="h-4 w-4 mr-1" />
                <span className="hidden xs:inline">Add</span> Tags
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkTagAction('remove');
                  setBulkTagDialogOpen(true);
                }}
              >
                <Tags className="h-4 w-4 mr-1" />
                <span className="hidden xs:inline">Remove</span> Tags
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkStatusDialogOpen(true)}
              >
                Status
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="sm:ml-auto"
            >
              Clear
            </Button>
          </div>
        )}

        {/* No business selected */}
        {!selectedBusiness?.id ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Select a Business</h3>
            <p className="text-sm text-muted-foreground">
              Choose a business from the dropdown above to view contacts
            </p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No contacts found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || statusFilter !== 'all' || selectedTagFilters.length > 0
                ? 'Try adjusting your search or filters'
                : 'Contacts will appear here when leads come in'}
            </p>
          </div>
        ) : (
          <>
            {/* Table - scrollable on mobile */}
            <div className="border rounded-lg overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                        {...(isSomeSelected ? { 'data-state': 'indeterminate' } : {})}
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('first_name')}
                    >
                      <div className="flex items-center">
                        Name
                        <SortIcon field="first_name" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center">
                        Email
                        <SortIcon field="email" />
                      </div>
                    </TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        <SortIcon field="status" />
                      </div>
                    </TableHead>
                    <TableHead>Pipeline</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('last_activity_date')}
                    >
                      <div className="flex items-center">
                        Last Activity
                        <SortIcon field="last_activity_date" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        Created
                        <SortIcon field="created_at" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedContactId(contact.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(contact.id)}
                          onCheckedChange={(checked) => handleSelectOne(contact.id, !!checked)}
                          aria-label={`Select ${contact.first_name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {contact.first_name} {contact.last_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.email || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.phone || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(contact.tags || []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className={`px-2 py-0.5 rounded text-xs ${getTagColor(tag)}`}
                            >
                              {availableTags.find(t => t.slug === tag)?.name || tag}
                            </span>
                          ))}
                          {(contact.tags || []).length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{(contact.tags || []).length - 3}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={contact.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.pipeline_stage || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contact.last_activity_date
                          ? formatToEasternCompact(contact.last_activity_date)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatToEasternCompact(contact.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="hidden sm:inline">Showing</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>
                  of {totalCount} contacts
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm">
                  Page {page + 1} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Bulk Tag Dialog */}
      <Dialog open={bulkTagDialogOpen} onOpenChange={setBulkTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkTagAction === 'add' ? 'Add Tags' : 'Remove Tags'}
            </DialogTitle>
            <DialogDescription>
              {bulkTagAction === 'add'
                ? `Select tags to add to ${selectedIds.size} contacts`
                : `Select tags to remove from ${selectedIds.size} contacts`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 py-4">
            {availableTags.map((tag) => (
              <Badge
                key={tag.id}
                variant={bulkSelectedTags.includes(tag.slug) ? 'default' : 'outline'}
                className={`cursor-pointer ${bulkSelectedTags.includes(tag.slug) ? '' : TAG_COLORS[tag.color || 'gray']}`}
                onClick={() => {
                  if (bulkSelectedTags.includes(tag.slug)) {
                    setBulkSelectedTags(bulkSelectedTags.filter(t => t !== tag.slug));
                  } else {
                    setBulkSelectedTags([...bulkSelectedTags, tag.slug]);
                  }
                }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkTagOperation}
              disabled={bulkSelectedTags.length === 0 || isBulkUpdating}
            >
              {isBulkUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {bulkTagAction === 'add' ? 'Add Tags' : 'Remove Tags'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>
              Add a new contact to your CRM
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name *</label>
                <Input
                  placeholder="First name"
                  value={newContactFirstName}
                  onChange={(e) => setNewContactFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  placeholder="Last name"
                  value={newContactLastName}
                  onChange={(e) => setNewContactLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddContactDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddContact}
              disabled={!newContactFirstName.trim() || isAddingContact}
            >
              {isAddingContact && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Select a new status for {selectedIds.size} contacts
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={bulkNewStatus} onValueChange={setBulkNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_lead">New Lead</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="active_member">Active Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkStatusChange}
              disabled={!bulkNewStatus || isBulkUpdating}
            >
              {isBulkUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
