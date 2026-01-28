/**
 * Retry utility with exponential backoff
 * 
 * Usage:
 * const result = await withRetry(() => riskyOperation(), {
 *   maxAttempts: 3,
 *   initialDelayMs: 1000,
 *   maxDelayMs: 10000,
 *   backoffMultiplier: 2
 * });
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
  onRetry: () => {},
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      if (attempt >= opts.maxAttempts || !opts.shouldRetry(lastError)) {
        throw lastError;
      }

      // Log retry attempt
      opts.onRetry(lastError, attempt);
      console.log(`Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms. Error: ${lastError.message}`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Check if an error is likely transient (worth retrying)
 */
export function isTransientError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Network-related errors
  if (message.includes('network') || 
      message.includes('timeout') || 
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('socket hang up')) {
    return true;
  }

  // Rate limiting
  if (message.includes('rate limit') || 
      message.includes('too many requests') ||
      message.includes('429')) {
    return true;
  }

  // Temporary server errors
  if (message.includes('500') || 
      message.includes('502') || 
      message.includes('503') || 
      message.includes('504')) {
    return true;
  }

  return false;
}

/**
 * Preset for SMS sending (Twilio)
 */
export const SMS_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: isTransientError,
  onRetry: (error, attempt) => {
    console.log(`SMS retry ${attempt}: ${error.message}`);
  }
};

/**
 * Preset for email sending (Resend)
 */
export const EMAIL_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  shouldRetry: isTransientError,
  onRetry: (error, attempt) => {
    console.log(`Email retry ${attempt}: ${error.message}`);
  }
};

/**
 * Preset for social posting (Late API)
 */
export const SOCIAL_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 2, // Less aggressive for social posts
  initialDelayMs: 2000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error) => {
    // Don't retry auth errors
    if (error.message.includes('token') || 
        error.message.includes('expired') ||
        error.message.includes('unauthorized')) {
      return false;
    }
    return isTransientError(error);
  },
  onRetry: (error, attempt) => {
    console.log(`Social post retry ${attempt}: ${error.message}`);
  }
};
