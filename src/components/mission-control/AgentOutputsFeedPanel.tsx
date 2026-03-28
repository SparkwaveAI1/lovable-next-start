import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, CheckCheck, RefreshCw, Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type AgentOutput = {
  id: string;
  agent_name: string;
  output_type: string;
  title: string;
  summary: string | null;
  body: string | null;
  is_recurring: boolean;
  is_actioned: boolean;
  actioned_at: string | null;
  created_at: string;
};

const OUTPUT_TYPE_COLORS: Record<string, string> = {
  "linkedin-activity":    "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "intelligence-report":  "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "content-draft":        "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "outreach-batch":       "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "infrastructure-alert": "bg-red-500/20 text-red-300 border-red-500/30",
  "standup-report":       "bg-green-500/20 text-green-300 border-green-500/30",
};

const getTypeColor = (type: string) =>
  OUTPUT_TYPE_COLORS[type] || "bg-gray-500/20 text-gray-300 border-gray-500/30";

const AGENT_OPTIONS = ["all", "rico", "iris", "dev", "jerry", "opal", "arlo"];
const TYPE_OPTIONS = [
  "all",
  "linkedin-activity",
  "intelligence-report",
  "content-draft",
  "outreach-batch",
  "infrastructure-alert",
  "standup-report",
];

export function AgentOutputsFeedPanel() {
  const [outputs, setOutputs] = useState<AgentOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchOutputs = useCallback(async () => {
    setLoading(true);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let query = supabase
      .from("agent_outputs")
      .select("id, agent_name, output_type, title, summary, body, is_recurring, is_actioned, actioned_at, created_at")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("is_recurring", { ascending: false })
      .order("created_at", { ascending: false });

    if (agentFilter !== "all") query = query.eq("agent_name", agentFilter);
    if (typeFilter !== "all") query = query.eq("output_type", typeFilter);

    const { data, error } = await query;
    if (!error && data) setOutputs(data as AgentOutput[]);
    setLoading(false);
  }, [agentFilter, typeFilter]);

  useEffect(() => {
    fetchOutputs();
    // Real-time updates
    const channel = supabase
      .channel("agent-outputs-feed")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "agent_outputs" },
        () => { fetchOutputs(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOutputs]);

  const markActioned = async (id: string) => {
    setActioningId(id);
    const { error } = await supabase
      .from("agent_outputs")
      .update({ is_actioned: true, actioned_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setOutputs((prev) =>
        prev.map((o) => (o.id === id ? { ...o, is_actioned: true } : o))
      );
    }
    setActioningId(null);
  };

  // Recurring pinned at top, then newest first
  const recurring = outputs.filter((o) => o.is_recurring);
  const nonRecurring = outputs.filter((o) => !o.is_recurring);
  const sorted = [...recurring, ...nonRecurring];

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            Agent Outputs
            <Badge
              variant="outline"
              className="text-gray-400 border-gray-600 text-xs"
            >
              Last 7 days
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchOutputs}
            className="text-gray-400 hover:text-white h-8 w-8 p-0"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-2">
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700 text-gray-300 w-32">
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {AGENT_OPTIONS.map((a) => (
                <SelectItem
                  key={a}
                  value={a}
                  className="text-gray-300 text-xs"
                >
                  {a === "all" ? "All agents" : a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700 text-gray-300 w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {TYPE_OPTIONS.map((t) => (
                <SelectItem
                  key={t}
                  value={t}
                  className="text-gray-300 text-xs"
                >
                  {t === "all" ? "All types" : t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="text-gray-500 text-sm text-center py-8">
            Loading…
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">
            No outputs in the last 7 days
          </div>
        ) : (
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {sorted.map((output) => (
              <div
                key={output.id}
                className={[
                  "rounded-lg border p-3 transition-colors",
                  output.is_actioned
                    ? "opacity-50 border-gray-700 bg-gray-800/30"
                    : "border-gray-700 bg-gray-800/60 hover:border-gray-600",
                  output.is_recurring ? "border-l-2 border-l-amber-500" : "",
                ].join(" ")}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <div className="flex items-center gap-2">
                      {output.is_recurring && (
                        <Pin className="h-3 w-3 text-amber-400 flex-shrink-0" />
                      )}
                      <span className="text-white text-sm font-medium truncate">
                        {output.title}
                      </span>
                    </div>

                    {/* Meta badges */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge
                        className={`text-xs border ${getTypeColor(output.output_type)}`}
                      >
                        {output.output_type}
                      </Badge>
                      <span className="text-gray-500 text-xs capitalize">
                        {output.agent_name}
                      </span>
                      <span className="text-gray-600 text-xs">
                        {formatDistanceToNow(new Date(output.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                      {output.is_recurring && (
                        <span className="text-amber-500 text-xs">
                          {new Date(output.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Summary preview */}
                    {output.summary && (
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                        {output.summary}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!output.is_actioned && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markActioned(output.id)}
                        disabled={actioningId === output.id}
                        className="h-7 w-7 p-0 text-gray-500 hover:text-green-400"
                        title="Mark as actioned"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    {output.body && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedId(
                            expandedId === output.id ? null : output.id
                          )
                        }
                        className="h-7 w-7 p-0 text-gray-500 hover:text-white"
                        title="Toggle full body"
                      >
                        {expandedId === output.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded body */}
                {expandedId === output.id && output.body && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <pre className="text-gray-300 text-xs whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-y-auto">
                      {output.body}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
