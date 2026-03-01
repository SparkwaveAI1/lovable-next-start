import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ContentLibrary } from "@/components/content/ContentLibrary";
import { ContentCalendar } from "@/components/content/ContentCalendar";
import { RepurposePanel } from "@/components/content/RepurposePanel";
import { ComposePanel } from "@/components/content/ComposePanel";
import { Button } from "@/components/ui/button";
import { Library, Calendar, RefreshCw, Plus, Building2 } from "lucide-react";
import { useBusinessContext } from "@/contexts/BusinessContext";

type Tab = "library" | "calendar" | "repurpose";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "library", label: "Library", icon: Library },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "repurpose", label: "Repurpose", icon: RefreshCw },
];

export default function ContentHub() {
  const { selectedBusiness } = useBusinessContext();
  const brand = selectedBusiness?.slug ?? "";

  const [activeTab, setActiveTab] = useState<Tab>("library");
  const [composeOpen, setComposeOpen] = useState(false);
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);

  const handleSaved = () => {
    setLibraryRefreshKey(k => k + 1);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Page header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Content Hub</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage, schedule, and repurpose your content</p>
          </div>

          <Button
            onClick={() => setComposeOpen(true)}
            disabled={!brand}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>

        {!brand ? (
          /* Empty state — no business selected */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50">
            <Building2 className="h-16 w-16 text-slate-200" />
            <h2 className="text-lg font-semibold text-slate-600">Select a business to get started</h2>
            <p className="text-sm text-slate-400">Choose a business from the selector in the header to manage its content.</p>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex items-center gap-1 px-6 pt-4 pb-0 bg-white border-b border-slate-200">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                      isActive
                        ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto px-6 py-6 bg-slate-50">
              {activeTab === "library" && <ContentLibrary key={libraryRefreshKey} brand={brand} />}
              {activeTab === "calendar" && <ContentCalendar brand={brand} />}
              {activeTab === "repurpose" && <RepurposePanel brand={brand} />}
            </div>
          </>
        )}
      </div>

      {/* Global compose slide-over */}
      <ComposePanel
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSaved={handleSaved}
        brand={brand}
      />
    </DashboardLayout>
  );
}
