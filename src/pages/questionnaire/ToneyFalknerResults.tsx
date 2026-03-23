import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp, Download, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface ResponseRow {
  id: string;
  created_at: string;
  respondent_name: string | null;
  respondent_email: string | null;
  questionnaire_id: string | null;
  responses: Record<string, unknown>;
  submitted_at: string | null;
}

const Q_LABELS: Record<string, string> = {
  q1: "Q1. Primary business focus",
  q2: "Q2. Client types to attract",
  q3: "Q3. Top 3 business priorities",
  q4: "Q4. Current marketing activities",
  q5: "Q5. Content creation frequency",
  q6: "Q6. Most frustrating about marketing",
  q7: "Q7. Content reflects voice?",
  q8: "Q8. What feels off",
  q9: "Q9. Most valuable topics",
  q10: "Q10. Topics to avoid",
  q11: "Q11. Communication style",
  q12: "Q12. Tone that would feel wrong",
  q13: "Q13. How communicate with clients",
  q14_yes: "Q14. Explains things repeatedly?",
  q14_text: "Q14. What is explained repeatedly",
  q15: "Q15. Room to improve communication?",
  q16: "Q16. Where time is spent",
  q17: "Q17. Repetitive / low-value tasks",
  q18: "Q18. Tasks that should be automated",
  q19: "Q19. Core tools used",
  q20: "Q20. Comfort with AI",
  q21: "Q21. AI concerns",
  q22_rank: "Q22. Top 3 priorities ranked",
  q23: "Q23. One improvement in 30 days",
  q24: "Q24. Anything else"
};

function formatValue(val: unknown): string {
  if (Array.isArray(val)) return val.length ? val.join(", ") : "(none selected)";
  if (typeof val === "string") return val.trim() || "(blank)";
  if (val === null || val === undefined) return "(blank)";
  return String(val);
}

function ResponseCard({ row }: { row: ResponseRow }) {
  const [open, setOpen] = useState(false);
  const resp = row.responses as Record<string, unknown>;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="shadow-sm">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{row.respondent_name || "(No name)"}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {row.respondent_email && <span className="mr-3">{row.respondent_email}</span>}
                  {format(new Date(row.submitted_at || row.created_at), "MMM d, yyyy h:mm a")}
                </p>
              </div>
              {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-6">
            <div className="divide-y divide-slate-100">
              {Object.entries(Q_LABELS).map(([key, label]) => {
                const val = resp[key];
                if (val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) return null;
                return (
                  <div key={key} className="py-3 grid grid-cols-5 gap-3">
                    <div className="col-span-2 text-sm font-medium text-slate-600">{label}</div>
                    <div className="col-span-3 text-sm text-slate-800">{formatValue(val)}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function exportCSV(rows: ResponseRow[]) {
  const qKeys = Object.keys(Q_LABELS);
  const headers = ["ID", "Name", "Email", "Submitted At", ...Object.values(Q_LABELS)];
  const csvRows = rows.map(row => {
    const resp = row.responses as Record<string, unknown>;
    return [
      row.id,
      row.respondent_name || "",
      row.respondent_email || "",
      row.submitted_at || row.created_at,
      ...qKeys.map(k => {
        const v = resp[k];
        const str = Array.isArray(v) ? v.join(" | ") : (v ?? "");
        return `"${String(str).replace(/"/g, '""')}"`;
      })
    ].join(",");
  });
  const csv = [headers.map(h => `"${h}"`).join(","), ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `toney-falkner-responses-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ToneyFalknerResults() {
  const [rows, setRows] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase
        .from("questionnaire_responses" as any)
        .select("*")
        .eq("questionnaire_id", "toney-falkner-v1")
        .order("submitted_at", { ascending: false });
      if (err) {
        setError("Failed to load responses: " + err.message);
      } else {
        setRows((data as ResponseRow[]) || []);
      }
    } catch {
      setError("An unexpected error occurred loading results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Toney Falkner — Questionnaire Results</h1>
            <p className="text-sm text-muted-foreground">{rows.length} response{rows.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {rows.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => exportCSV(rows)}>
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        )}
        {!loading && !error && rows.length === 0 && (
          <Card className="text-center py-16 text-muted-foreground">
            No responses submitted yet.
          </Card>
        )}
        {!loading && rows.map(row => <ResponseCard key={row.id} row={row} />)}
      </div>
    </div>
  );
}
