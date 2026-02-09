import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  User,
  TrendingUp,
  Zap,
  Target,
} from "lucide-react";

// Types for advisor scores
export interface AdvisorScore {
  advisor: "hormozi" | "garyvee" | "godin";
  score: number; // 1-10
  feedback?: string;
}

export interface QualityGateResult {
  scores: AdvisorScore[];
  averageScore: number;
  passed: boolean;
  timestamp?: string;
}

export interface QualityGateIndicatorProps {
  result?: QualityGateResult;
  scores?: AdvisorScore[];
  loading?: boolean;
  compact?: boolean;
  showTooltip?: boolean;
  className?: string;
  onRequestReview?: () => void;
}

// Advisor metadata
const advisorMeta: Record<
  AdvisorScore["advisor"],
  {
    name: string;
    fullName: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    description: string;
  }
> = {
  hormozi: {
    name: "Hormozi",
    fullName: "Alex Hormozi",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Value-first, direct response, offer clarity",
  },
  garyvee: {
    name: "Gary Vee",
    fullName: "Gary Vaynerchuk",
    icon: <Zap className="h-3.5 w-3.5" />,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    description: "Authenticity, hustle, platform-native content",
  },
  godin: {
    name: "Godin",
    fullName: "Seth Godin",
    icon: <Target className="h-3.5 w-3.5" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    description: "Remarkable ideas, permission marketing, storytelling",
  },
};

// Score color helper
function getScoreColor(score: number): {
  text: string;
  bg: string;
  border: string;
} {
  if (score >= 8) {
    return {
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    };
  }
  if (score >= 7) {
    return {
      text: "text-green-700",
      bg: "bg-green-50",
      border: "border-green-200",
    };
  }
  if (score >= 5) {
    return {
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
    };
  }
  return {
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  };
}

// Pass threshold constant (avg score >= 7)
const PASS_THRESHOLD = 7;

// Calculate result from scores
function calculateResult(scores: AdvisorScore[]): QualityGateResult {
  if (scores.length === 0) {
    return { scores: [], averageScore: 0, passed: false };
  }
  const total = scores.reduce((sum, s) => sum + s.score, 0);
  const avg = total / scores.length;
  return {
    scores,
    averageScore: Math.round(avg * 10) / 10,
    passed: avg >= PASS_THRESHOLD,
  };
}

// Score bar component
function ScoreBar({
  score,
  maxScore = 10,
}: {
  score: number;
  maxScore?: number;
}) {
  const percentage = (score / maxScore) * 100;
  const colors = getScoreColor(score);

  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", {
            "bg-emerald-500": score >= 8,
            "bg-green-500": score >= 7 && score < 8,
            "bg-amber-500": score >= 5 && score < 7,
            "bg-red-500": score < 5,
          })}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn("text-xs font-semibold min-w-[2rem]", colors.text)}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

// Detailed tooltip content
function ScoreBreakdownTooltip({
  result,
}: {
  result: QualityGateResult;
}) {
  return (
    <div className="w-64 p-1">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-foreground">
          Quality Gate Scores
        </span>
        <Badge
          variant={result.passed ? "default" : "destructive"}
          className={cn(
            "text-xs",
            result.passed
              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
              : "bg-amber-100 text-amber-700 border-amber-200"
          )}
        >
          {result.passed ? "Passed" : "Needs Review"}
        </Badge>
      </div>

      <div className="space-y-2.5">
        {result.scores.map((score) => {
          const meta = advisorMeta[score.advisor];
          return (
            <div key={score.advisor} className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={cn("p-1 rounded", meta.bgColor)}>
                  <span className={meta.color}>{meta.icon}</span>
                </div>
                <span className="text-xs font-medium text-foreground">
                  {meta.name}
                </span>
                <ScoreBar score={score.score} />
              </div>
              {score.feedback && (
                <p className="text-xs text-muted-foreground ml-7 line-clamp-2">
                  {score.feedback}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Average Score</span>
          <span
            className={cn(
              "text-sm font-bold",
              getScoreColor(result.averageScore).text
            )}
          >
            {result.averageScore.toFixed(1)} / 10
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Threshold: {PASS_THRESHOLD}+ to pass
        </p>
      </div>
    </div>
  );
}

// Main component
export function QualityGateIndicator({
  result: providedResult,
  scores,
  loading = false,
  compact = false,
  showTooltip = true,
  className,
  onRequestReview,
}: QualityGateIndicatorProps) {
  // Calculate result from scores if not provided
  const result = React.useMemo(() => {
    if (providedResult) return providedResult;
    if (scores && scores.length > 0) return calculateResult(scores);
    return null;
  }, [providedResult, scores]);

  // Loading state
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 animate-pulse",
          className
        )}
      >
        <div className="h-5 w-5 rounded-full bg-slate-200" />
        <div className="h-4 w-16 rounded bg-slate-200" />
      </div>
    );
  }

  // No scores yet
  if (!result || result.scores.length === 0) {
    return (
      <button
        onClick={onRequestReview}
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors",
          className
        )}
      >
        <User className="h-4 w-4" />
        <span>Run quality check</span>
      </button>
    );
  }

  const passedIcon = result.passed ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
  ) : result.averageScore >= 5 ? (
    <AlertTriangle className="h-4 w-4 text-amber-600" />
  ) : (
    <XCircle className="h-4 w-4 text-red-600" />
  );

  const indicator = (
    <div
      className={cn(
        "flex items-center gap-1.5 cursor-default",
        compact ? "" : "px-2 py-1 rounded-md border",
        result.passed
          ? "bg-emerald-50 border-emerald-200"
          : result.averageScore >= 5
          ? "bg-amber-50 border-amber-200"
          : "bg-red-50 border-red-200",
        compact && "border-0 bg-transparent p-0",
        className
      )}
    >
      {passedIcon}
      {!compact && (
        <>
          <span
            className={cn(
              "text-xs font-semibold",
              getScoreColor(result.averageScore).text
            )}
          >
            {result.averageScore.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">/10</span>
        </>
      )}
    </div>
  );

  if (!showTooltip) {
    return indicator;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent side="top" className="p-3 max-w-none">
          <ScoreBreakdownTooltip result={result} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Utility to run quality gate check via edge function
export async function runQualityGate(
  content: string,
  contentType?: string
): Promise<QualityGateResult> {
  // This integrates with the quality-gate.mjs script or edge function
  // For now, return a mock implementation
  // TODO: Replace with actual edge function call
  const mockScores: AdvisorScore[] = [
    {
      advisor: "hormozi",
      score: 7.5,
      feedback: "Good value proposition but could be more direct.",
    },
    {
      advisor: "garyvee",
      score: 8.2,
      feedback: "Authentic tone, platform-appropriate length.",
    },
    {
      advisor: "godin",
      score: 6.8,
      feedback: "Story could be more remarkable. Add a unique angle.",
    },
  ];

  return calculateResult(mockScores);
}

// Export helpers
export { PASS_THRESHOLD, calculateResult, getScoreColor, advisorMeta };
