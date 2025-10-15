import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, UserPlus, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Permission {
  id: string;
  user_id: string;
  business_id: string;
  permission_level: string;
  is_active: boolean;
  granted_at: string;
  expires_at: string | null;
  businesses?: {
    name: string;
  };
}

export default function BusinessPermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { toast } = useToast();
  
  // Form state for adding permissions
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'admin' | 'manager' | 'creator' | 'viewer'>('viewer');
  const [isGranting, setIsGranting] = useState(false);

  useEffect(() => {
    checkSuperAdmin();
    loadData();
  }, []);

  const checkSuperAdmin = async () => {
    const { data } = await supabase.rpc('is_super_admin');
    setIsSuperAdmin(data === true);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all permissions with business details
      const { data: permsData, error: permsError } = await supabase
        .from('business_permissions')
        .select(`
          *,
          businesses (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (permsError) throw permsError;

      setPermissions(permsData || []);

      // Load businesses for the dropdown
      const { data: businessData, error: bizError } = await supabase
        .from('businesses')
        .select('id, name')
        .order('name');

      if (bizError) throw bizError;
      setBusinesses(businessData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load permissions data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const grantPermission = async () => {
    if (!selectedBusiness || !userEmail || !permissionLevel) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsGranting(true);
    try {
      // Use the new RPC function to grant permission by email
      const { error } = await supabase.rpc('grant_business_permission_by_email', {
        user_email: userEmail,
        p_business_id: selectedBusiness,
        p_permission_level: permissionLevel
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Permission granted to ${userEmail}`,
      });

      // Reset form
      setUserEmail('');
      setSelectedBusiness('');
      setPermissionLevel('viewer');
      
      // Reload permissions
      await loadData();

    } catch (error: any) {
      console.error('Error granting permission:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to grant permission',
        variant: 'destructive',
      });
    } finally {
      setIsGranting(false);
    }
  };

  const revokePermission = async (permissionId: string) => {
    try {
      const { error } = await supabase
        .from('business_permissions')
        .update({ is_active: false })
        .eq('id', permissionId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Permission revoked',
      });

      await loadData();
    } catch (error) {
      console.error('Error revoking permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke permission',
        variant: 'destructive',
      });
    }
  };

  const getPermissionBadgeVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'creator': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Business Permissions Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSuperAdmin && (
            <Alert>
              <AlertDescription>
                You need super admin privileges to manage permissions.
              </AlertDescription>
            </Alert>
          )}

          {isSuperAdmin && (
            <>
              {/* Grant Permission Form */}
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Grant New Permission
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>User Email</Label>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label>Business</Label>
                    <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select business" />
                      </SelectTrigger>
                      <SelectContent>
                        {businesses.map((biz) => (
                          <SelectItem key={biz.id} value={biz.id}>
                            {biz.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Permission Level</Label>
                    <Select value={permissionLevel} onValueChange={(value: any) => setPermissionLevel(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="creator">Creator</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      onClick={grantPermission}
                      disabled={isGranting}
                      className="w-full"
                    >
                      {isGranting ? 'Granting...' : 'Grant Permission'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Permissions Table */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Current Permissions</h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Permission Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Granted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No permissions found. Grant your first permission above.
                          </TableCell>
                        </TableRow>
                      ) : (
                        permissions.map((perm) => (
                          <TableRow key={perm.id}>
                            <TableCell>
                              <code className="text-xs">{perm.user_id.slice(0, 8)}...</code>
                            </TableCell>
                            <TableCell>{perm.businesses?.name || 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge variant={getPermissionBadgeVariant(perm.permission_level)}>
                                {perm.permission_level}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {perm.is_active ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-sm">Active</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <XCircle className="h-4 w-4" />
                                  <span className="text-sm">Inactive</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(perm.granted_at).toLocaleDateString()}
                                {perm.expires_at && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Expires: {new Date(perm.expires_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {perm.is_active && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => revokePermission(perm.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
