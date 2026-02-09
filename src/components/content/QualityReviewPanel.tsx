import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Edit3,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Lightbulb,
  TrendingUp,
  Zap,
  Target,
} from "lucide-react";
import {
  QualityGateIndicator,
  QualityGateResult,
  AdvisorScore,
  PASS_THRESHOLD,
  advisorMeta,
  getScoreColor,
  runQualityGate,
} from "./QualityGateIndicator";

// Types
export interface ContentItem {
  id: string;
  content: string;
  platform?: string;
  contentType?: string;
  createdAt?: string;
  author?: string;
}

export interface QualityReviewPanelProps {
  content: ContentItem;
  initialResult?: QualityGateResult;
  onApprove?: (content: ContentItem, result: QualityGateResult) => void;
  onRevise?: (content: ContentItem, revisedContent: string) => void;
  onReject?: (content: ContentItem, reason: string) => void;
  onClose?: () => void;
  className?: string;
}

// Individual advisor feedback card
function AdvisorFeedbackCard({
  score,
  expanded,
  onToggle,
}: {
  score: AdvisorScore;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = advisorMeta[score.advisor];
  const colors = getScoreColor(score.score);

  return (
    <div
      className={cn(
        "border rounded-lg transition-all duration-200",
        colors.border,
        colors.bg
      )}
    >
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", meta.bgColor)}>
            <span className={meta.color}>{meta.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{meta.fullName}</span>
              <Badge
                variant="outline"
                className={cn("text-xs", colors.text, colors.border)}
              >
                {score.score.toFixed(1)}/10
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {meta.description}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && score.feedback && (
        <div className="px-3 pb-3">
          <Separator className="mb-3" />
          <div className="flex gap-2 items-start">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground leading-relaxed">
              {score.feedback}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Suggested improvements section
function SuggestedImprovements({
  suggestions,
  onApplySuggestion,
}: {
  suggestions: string[];
  onApplySuggestion?: (suggestion: string) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        Suggested Improvements
      </div>
      <div className="space-y-2">
        {suggestions.map((suggestion, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md"
          >
            <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-900 flex-1">{suggestion}</p>
            {onApplySuggestion && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                onClick={() => onApplySuggestion(suggestion)}
              >
                Apply
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Main component
export function QualityReviewPanel({
  content,
  initialResult,
  onApprove,
  onRevise,
  onReject,
  onClose,
  className,
}: QualityReviewPanelProps) {
  const [result, setResult] = React.useState<QualityGateResult | null>(
    initialResult || null
  );
  const [loading, setLoading] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [editedContent, setEditedContent] = React.useState(content.content);
  const [expandedAdvisors, setExpandedAdvisors] = React.useState<Set<string>>(
    new Set()
  );
  const [rejectReason, setRejectReason] = React.useState("");
  const [showRejectInput, setShowRejectInput] = React.useState(false);

  // Run quality check
  const handleRunCheck = async () => {
    setLoading(true);
    try {
      const newResult = await runQualityGate(
        editMode ? editedContent : content.content,
        content.contentType
      );
      setResult(newResult);
    } catch (error) {
      console.error("Quality check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Run check on mount if no initial result
  React.useEffect(() => {
    if (!initialResult) {
      handleRunCheck();
    }
  }, []);

  // Toggle advisor expansion
  const toggleAdvisor = (advisor: string) => {
    setExpandedAdvisors((prev) => {
      const next = new Set(prev);
      if (next.has(advisor)) {
        next.delete(advisor);
      } else {
        next.add(advisor);
      }
      return next;
    });
  };

  // Handle approve
  const handleApprove = () => {
    if (result && onApprove) {
      onApprove(content, result);
    }
  };

  // Handle revise
  const handleRevise = () => {
    if (onRevise && editedContent !== content.content) {
      onRevise(content, editedContent);
    }
    setEditMode(false);
  };

  // Handle reject
  const handleReject = () => {
    if (onReject) {
      onReject(content, rejectReason);
    }
    setShowRejectInput(false);
    setRejectReason("");
  };

  // Copy content
  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      editMode ? editedContent : content.content
    );
  };

  // Extract suggestions from feedback
  const suggestions = React.useMemo(() => {
    if (!result) return [];
    return result.scores
      .filter((s) => s.feedback && s.score < 8)
      .map((s) => s.feedback!)
      .slice(0, 3);
  }, [result]);

  // Status info
  const statusInfo = React.useMemo(() => {
    if (!result) {
      return {
        icon: <RefreshCw className="h-5 w-5 text-slate-500 animate-spin" />,
        label: "Checking...",
        color: "text-slate-600",
        bgColor: "bg-slate-50",
      };
    }
    if (result.passed) {
      return {
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
        label: "Quality Passed",
        color: "text-emerald-700",
        bgColor: "bg-emerald-50",
      };
    }
    if (result.averageScore >= 5) {
      return {
        icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
        label: "Needs Review",
        color: "text-amber-700",
        bgColor: "bg-amber-50",
      };
    }
    return {
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      label: "Below Threshold",
      color: "text-red-700",
      bgColor: "bg-red-50",
    };
  }, [result]);

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Quality Review</CardTitle>
            <CardDescription className="mt-1">
              Review content quality scores from AI advisors
            </CardDescription>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full",
              statusInfo.bgColor
            )}
          >
            {statusInfo.icon}
            <span className={cn("text-sm font-medium", statusInfo.color)}>
              {statusInfo.label}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Content Preview/Edit */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                Content
              </span>
              {content.platform && (
                <Badge variant="outline" className="text-xs capitalize">
                  {content.platform}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={handleCopy}
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setEditMode(!editMode)}
              >
                <Edit3 className="h-3.5 w-3.5 mr-1" />
                {editMode ? "Preview" : "Edit"}
              </Button>
            </div>
          </div>

          {editMode ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[120px] resize-none"
              placeholder="Edit content..."
            />
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {content.content}
              </p>
            </div>
          )}

          {editMode && editedContent !== content.content && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditedContent(content.content)}
              >
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunCheck}
                disabled={loading}
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5 mr-1", loading && "animate-spin")}
                />
                Re-check Score
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Quality Score Summary */}
        {result && (
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <QualityGateIndicator result={result} showTooltip={false} />
              <span className="text-sm text-muted-foreground">
                Average from {result.scores.length} advisors
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRunCheck}
              disabled={loading}
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5 mr-1", loading && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        )}

        {/* Advisor Scores */}
        {result && result.scores.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">
              Advisor Scores
            </span>
            <div className="space-y-2">
              {result.scores.map((score) => (
                <AdvisorFeedbackCard
                  key={score.advisor}
                  score={score}
                  expanded={expandedAdvisors.has(score.advisor)}
                  onToggle={() => toggleAdvisor(score.advisor)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Suggested Improvements */}
        {suggestions.length > 0 && (
          <SuggestedImprovements
            suggestions={suggestions}
            onApplySuggestion={(suggestion) => {
              // Could integrate AI rewriting here
              console.log("Apply suggestion:", suggestion);
            }}
          />
        )}

        <Separator />

        {/* Reject reason input */}
        {showRejectInput && (
          <div className="space-y-2">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)..."
              className="min-h-[80px] resize-none"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReject}
              >
                Confirm Reject
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowRejectInput(false);
                  setRejectReason("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!showRejectInput && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onReject && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowRejectInput(true)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Close
                </Button>
              )}

              {editMode && editedContent !== content.content && onRevise && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevise}
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Save Revision
                </Button>
              )}

              {onApprove && result && (
                <Button
                  size="sm"
                  className={cn(
                    result.passed
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  )}
                  onClick={handleApprove}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  {result.passed ? "Approve" : "Approve Anyway"}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Warning for below-threshold approval */}
        {result && !result.passed && (
          <p className="text-xs text-muted-foreground text-center">
            Content scored {result.averageScore.toFixed(1)}/10 (threshold: {PASS_THRESHOLD}+).
            Consider revising before publishing.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Export for use in content cards and dialogs
export default QualityReviewPanel;
