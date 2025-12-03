import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Save } from "lucide-react";

interface CrisisIndicator {
  id: string;
  indicator_key: string;
  indicator_name: string;
  value: number | null;
  unit: string | null;
  source: string | null;
  last_updated: string | null;
}

const MANUAL_INDICATORS = [
  { key: "move_index", name: "MOVE Index (Bond Volatility)", unit: "index", source: "Manual Entry" },
  { key: "custom_indicator", name: "Custom Indicator", unit: "", source: "Manual Entry" },
];

export function ManualIndicatorEntry() {
  const [indicators, setIndicators] = useState<CrisisIndicator[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadIndicators = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("crisis_indicators")
        .select("*")
        .order("indicator_name");

      if (error) throw error;
      setIndicators(data || []);
    } catch (error) {
      console.error("Error loading indicators:", error);
      toast.error("Failed to load indicators");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIndicators();
  }, []);

  const handleSave = async () => {
    if (!selectedKey || !value) {
      toast.error("Please select an indicator and enter a value");
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      toast.error("Please enter a valid number");
      return;
    }

    setSaving(true);
    try {
      const indicatorConfig = MANUAL_INDICATORS.find(i => i.key === selectedKey);
      const existingIndicator = indicators.find(i => i.indicator_key === selectedKey);

      if (existingIndicator) {
        // Update existing
        const { error } = await supabase
          .from("crisis_indicators")
          .update({
            value: numValue,
            last_updated: new Date().toISOString(),
          })
          .eq("indicator_key", selectedKey);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("crisis_indicators")
          .insert({
            indicator_key: selectedKey,
            indicator_name: indicatorConfig?.name || selectedKey,
            value: numValue,
            unit: indicatorConfig?.unit || "",
            source: indicatorConfig?.source || "Manual Entry",
            last_updated: new Date().toISOString(),
          });

        if (error) throw error;
      }

      toast.success("Indicator updated successfully");
      setValue("");
      loadIndicators();
    } catch (error) {
      console.error("Error saving indicator:", error);
      toast.error("Failed to save indicator");
    } finally {
      setSaving(false);
    }
  };

  const selectedIndicator = indicators.find(i => i.indicator_key === selectedKey);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Manual Indicator Entry
          <Button variant="ghost" size="sm" onClick={loadIndicators} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
        <CardDescription>
          Update crisis indicators that cannot be fetched automatically (e.g., MOVE Index)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Select Indicator</Label>
          <Select value={selectedKey} onValueChange={setSelectedKey}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an indicator..." />
            </SelectTrigger>
            <SelectContent>
              {MANUAL_INDICATORS.map((indicator) => (
                <SelectItem key={indicator.key} value={indicator.key}>
                  {indicator.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedIndicator && (
          <div className="p-3 bg-muted rounded-md text-sm">
            <p><strong>Current Value:</strong> {selectedIndicator.value ?? "Not set"} {selectedIndicator.unit}</p>
            <p><strong>Last Updated:</strong> {selectedIndicator.last_updated 
              ? new Date(selectedIndicator.last_updated).toLocaleString() 
              : "Never"}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label>New Value</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="Enter value..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        <Button onClick={handleSave} disabled={saving || !selectedKey || !value} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Indicator"}
        </Button>

        {indicators.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">All Indicators</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {indicators.map((indicator) => (
                <div key={indicator.id} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
                  <span>{indicator.indicator_name}</span>
                  <span className="text-muted-foreground">
                    {indicator.value ?? "—"} {indicator.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
