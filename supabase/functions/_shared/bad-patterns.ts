/**
 * Bad Pattern Detection
 * 
 * Identifies problematic patterns in outgoing messages that should
 * trigger review or blocking before sending.
 */

export interface PatternMatch {
  pattern: string;
  severity: 'block' | 'review' | 'warn';
  reason: string;
  match: string;
}

export interface PatternCheckResult {
  passed: boolean;
  matches: PatternMatch[];
  shouldBlock: boolean;
  shouldReview: boolean;
}

// Patterns that should BLOCK sending entirely
const BLOCK_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  // Impersonation
  { regex: /coach\s+marcus/i, reason: 'Impersonating former coach Marcus' },
  { regex: /this\s+is\s+(coach|trainer)\s+\w+/i, reason: 'Impersonating staff member' },
  
  // Sensitive content
  { regex: /\b(password|ssn|social\s*security|credit\s*card)\b/i, reason: 'Contains sensitive data request' },
  { regex: /\b(nude|nsfw|xxx)\b/i, reason: 'Inappropriate content' },
  
  // Scam patterns
  { regex: /\b(wire\s*transfer|western\s*union|bitcoin\s*address)\b/i, reason: 'Potential scam content' },
  { regex: /\b(you\s*(have\s*)?won|lottery|prize\s*winner)\b/i, reason: 'Spam/scam pattern' },
];

// Patterns that should trigger REVIEW before sending
const REVIEW_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  // Price/payment mentions (verify accuracy)
  { regex: /\$\d+/i, reason: 'Contains price - verify accuracy' },
  { regex: /\b(free\s*trial|discount|promo)\b/i, reason: 'Contains offer - verify current' },
  
  // Time-sensitive claims
  { regex: /\b(today\s*only|expires?\s*(today|tonight|soon)|limited\s*time)\b/i, reason: 'Urgency language - verify legitimacy' },
  
  // Guarantees
  { regex: /\b(guarantee|promise|100%)\b/i, reason: 'Contains guarantee - verify claim' },
  
  // External links (could be phishing)
  { regex: /https?:\/\/(?!fightflowmma\.com|sparkwaveai\.app)/i, reason: 'External link - verify destination' },
  
  // Medical/legal claims
  { regex: /\b(cure|treat|heal|diagnose)\b/i, reason: 'Medical language - verify appropriateness' },
  { regex: /\b(lawsuit|legal\s*action|attorney)\b/i, reason: 'Legal language - verify appropriateness' },
];

// Patterns that generate warnings but don't block
const WARN_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  // AI tells
  { regex: /\b(as\s+an?\s+ai|i\s+am\s+an?\s+(ai|artificial|language\s*model))\b/i, reason: 'AI self-reference detected' },
  
  // Overly formal
  { regex: /\b(i\s+hope\s+this\s+(email|message)\s+finds\s+you\s+well)\b/i, reason: 'Generic opener - consider personalizing' },
  
  // Excessive punctuation
  { regex: /[!?]{3,}/i, reason: 'Excessive punctuation' },
  { regex: /[A-Z\s]{20,}/i, reason: 'Excessive caps lock' },
  
  // Empty personalization
  { regex: /\{[^}]*\}|\[name\]|\[first_name\]/i, reason: 'Unfilled template variable' },
  
  // Repetition
  { regex: /(\b\w+\b)(\s+\1){2,}/i, reason: 'Word repetition detected' },
];

/**
 * Check a message for bad patterns
 */
export function checkMessagePatterns(message: string): PatternCheckResult {
  const matches: PatternMatch[] = [];
  
  // Check BLOCK patterns
  for (const { regex, reason } of BLOCK_PATTERNS) {
    const match = message.match(regex);
    if (match) {
      matches.push({
        pattern: regex.source,
        severity: 'block',
        reason,
        match: match[0],
      });
    }
  }
  
  // Check REVIEW patterns
  for (const { regex, reason } of REVIEW_PATTERNS) {
    const match = message.match(regex);
    if (match) {
      matches.push({
        pattern: regex.source,
        severity: 'review',
        reason,
        match: match[0],
      });
    }
  }
  
  // Check WARN patterns
  for (const { regex, reason } of WARN_PATTERNS) {
    const match = message.match(regex);
    if (match) {
      matches.push({
        pattern: regex.source,
        severity: 'warn',
        reason,
        match: match[0],
      });
    }
  }
  
  const shouldBlock = matches.some(m => m.severity === 'block');
  const shouldReview = matches.some(m => m.severity === 'review');
  
  return {
    passed: !shouldBlock && !shouldReview,
    matches,
    shouldBlock,
    shouldReview,
  };
}

/**
 * Quick check - returns true if message is safe to send
 */
export function isMessageSafe(message: string): boolean {
  const result = checkMessagePatterns(message);
  return !result.shouldBlock;
}

/**
 * Get human-readable summary of pattern check
 */
export function getPatternSummary(result: PatternCheckResult): string {
  if (result.passed) {
    return '✅ No issues detected';
  }
  
  const lines: string[] = [];
  
  if (result.shouldBlock) {
    lines.push('🚫 BLOCKED:');
    result.matches
      .filter(m => m.severity === 'block')
      .forEach(m => lines.push(`  - ${m.reason}: "${m.match}"`));
  }
  
  if (result.shouldReview) {
    lines.push('⚠️ REVIEW NEEDED:');
    result.matches
      .filter(m => m.severity === 'review')
      .forEach(m => lines.push(`  - ${m.reason}: "${m.match}"`));
  }
  
  const warnings = result.matches.filter(m => m.severity === 'warn');
  if (warnings.length > 0) {
    lines.push('💡 WARNINGS:');
    warnings.forEach(m => lines.push(`  - ${m.reason}: "${m.match}"`));
  }
  
  return lines.join('\n');
}
