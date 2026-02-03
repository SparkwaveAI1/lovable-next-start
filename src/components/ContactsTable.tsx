import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContactDetail } from './ContactDetail';
import { Search, Users } from 'lucide-react';
import { formatToEasternCompact } from '@/lib/dateUtils';
import {
  TableWrapper,
  TableRow,
  TableCell,
  TableHeaderCell,
  ContactStatusBadge
} from '@/components/ui/data-table-styles';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  comments: string;
  created_at: string;
}

export function ContactsTable({ businessId }: { businessId: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (businessId) {
      loadContacts();
    }
  }, [businessId, searchTerm, statusFilter]);

  const loadContacts = async () => {
    setIsLoading(true);

    let query = supabase
      .from('contacts')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (searchTerm) {
      query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading contacts:', error);
    } else {
      setContacts(data || []);
    }
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    return formatToEasternCompact(dateString);
  };

  const formatStatusLabel = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Show ContactDetail if a contact is selected
  if (selectedContactId) {
    return (
      <ContactDetail
        contactId={selectedContactId}
        onBack={() => setSelectedContactId(null)}
      />
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            <CardTitle>Contact Management</CardTitle>
            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
              {contacts.length} contacts
            </Badge>
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
            >
              <option value="all">All Status</option>
              <option value="new_lead">New Leads</option>
              <option value="qualified">Qualified</option>
              <option value="active_member">Active Members</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500">No contacts found</h3>
            <p className="text-sm text-gray-400">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Contacts will appear here when leads come in'
              }
            </p>
          </div>
        ) : (
          <TableWrapper className="border-0 shadow-none rounded-none">
            <table className="w-full">
              <thead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Contact Info</TableHeaderCell>
                  <TableHeaderCell>Source</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Comments</TableHeaderCell>
                  <TableHeaderCell>Created</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id} className="group cursor-pointer" onClick={() => setSelectedContactId(contact.id)}>
                    <TableCell className="font-medium text-gray-900">
                      {contact.first_name} {contact.last_name}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {contact.email && (
                          <div className="text-gray-700">{contact.email}</div>
                        )}
                        {contact.phone && (
                          <div className="text-gray-500">{contact.phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-gray-200 text-gray-600">
                        {contact.source || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <ContactStatusBadge status={formatStatusLabel(contact.status)} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-gray-500 max-w-xs truncate">
                        {contact.comments || 'No comments'}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(contact.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-gray-600 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContactId(contact.id);
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </table>
          </TableWrapper>
        )}
      </CardContent>
    </Card>
  );
}
