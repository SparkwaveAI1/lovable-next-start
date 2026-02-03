import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ManualIndicatorEntry } from "@/components/ManualIndicatorEntry";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TokenHealthDashboard } from "@/components/TokenHealthDashboard";
import { Shield, Users, Link2, Settings, AlertTriangle } from "lucide-react";

export default function AdminDashboard() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsSuperAdmin(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.rpc("is_super_admin");
        if (error) throw error;
        setIsSuperAdmin(data === true);
      } catch (error) {
        console.error("Error checking super admin status:", error);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSuperAdmin();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (isSuperAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You do not have permission to access the admin dashboard.
              This area is restricted to super administrators only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            System administration and configuration
          </p>
        </div>

        {/* Token Health Monitoring - Full Width */}
        <div className="mb-6">
          <TokenHealthDashboard />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Manual Indicator Entry */}
          <div className="md:col-span-2 lg:col-span-2">
            <ManualIndicatorEntry />
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Links</CardTitle>
                <CardDescription>Access other admin areas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link to="/permissions">
                    <Users className="h-4 w-4 mr-2" />
                    Business Permissions
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link to="/late-setup">
                    <Settings className="h-4 w-4 mr-2" />
                    Late Setup
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link to="/late-connections">
                    <Link2 className="h-4 w-4 mr-2" />
                    Late Connections
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link to="/admin-setup">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Setup
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Future Settings</CardTitle>
                <CardDescription>Coming soon</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Additional system settings and configurations will be added here.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
