import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LayoutDashboard, 
  Workflow, 
  Calendar as CalendarIcon, 
  Map, 
  Shield,
  Eye
} from "lucide-react";

// Content visibility components
import { ContentDashboard } from "@/components/content/ContentDashboard";
import { ContentPipeline } from "@/components/content/ContentPipeline";
import { ContentCalendar } from "@/components/content/ContentCalendar";
import { CrossPlatformMap } from "@/components/content/CrossPlatformMap";

const ContentVisibility = () => {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        const business = businesses.find((b) => b.id === id);
        if (business) setSelectedBusiness(business);
      }}
      businessName={selectedBusiness?.name}
    >
      <main className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Content Visibility
            </h1>
          </div>
          <p className="text-muted-foreground">
            Complete visibility into your content pipeline — track, manage, and optimize across all platforms
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Mobile: Wrapped tabs */}
          <div className="md:hidden">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2">
              <TabsTrigger value="dashboard" className="h-9 shrink-0 gap-1">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="h-9 shrink-0 gap-1">
                <Workflow className="h-4 w-4" />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="calendar" className="h-9 shrink-0 gap-1">
                <CalendarIcon className="h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="crossplatform" className="h-9 shrink-0 gap-1">
                <Map className="h-4 w-4" />
                Cross-Platform
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Desktop: Grid layout */}
          <div className="hidden md:block">
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="gap-2">
                <Workflow className="h-4 w-4" />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="crossplatform" className="gap-2">
                <Map className="h-4 w-4" />
                Cross-Platform
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Dashboard Tab - Overview */}
          <TabsContent value="dashboard" className="space-y-6">
            <ContentDashboard />
          </TabsContent>

          {/* Pipeline Tab - Kanban workflow */}
          <TabsContent value="pipeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  Content Pipeline
                </CardTitle>
                <CardDescription>
                  Drag and drop content between workflow stages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContentPipeline />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar Tab - Schedule view */}
          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Content Calendar
                </CardTitle>
                <CardDescription>
                  Visual schedule of your content — drag to reschedule
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 md:p-6">
                <ContentCalendar />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cross-Platform Tab - Content mapping */}
          <TabsContent value="crossplatform" className="space-y-6">
            <CrossPlatformMap />
          </TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  );
};

export default ContentVisibility;
