import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function AdminSetupPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [verificationResults, setVerificationResults] = useState<any>(null);

  const setupSuperAdmin = async () => {
    setLoading(true);
    setStatus('idle');
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('No authenticated user found');
      }

      // Check if already super admin
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (existingRole?.role === 'super_admin') {
        setStatus('success');
        setMessage('You are already a super admin!');
        await runVerification();
        return;
      }

      // Insert super admin role
      const { error: insertError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: 'super_admin'
        });

      if (insertError) {
        throw insertError;
      }

      setStatus('success');
      setMessage('Successfully set as super admin!');
      await runVerification();
      
    } catch (error: any) {
      console.error('Setup error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to setup super admin role');
    } finally {
      setLoading(false);
    }
  };

  const runVerification = async () => {
    try {
      // Run verification queries
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Check role in table
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Test the functions
      const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
      const { data: hasRole } = await supabase.rpc('has_role', { 
        _user_id: user.id,
        _role: 'super_admin'
      });

      setVerificationResults({
        userEmail: user.email,
        roleEntry: roleData,
        isSuperAdmin: isSuperAdmin,
        hasRoleSuper: hasRole,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Verification error:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Super Admin Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              This page will set your current user account as a super admin with full platform access.
              This should only be run once during initial setup.
            </AlertDescription>
          </Alert>

          <div className="flex justify-center">
            <Button
              onClick={setupSuperAdmin}
              disabled={loading}
              size="lg"
              className="w-full max-w-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Make Me Super Admin
                </>
              )}
            </Button>
          </div>

          {status === 'success' && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {verificationResults && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">Verification Results</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(verificationResults, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
