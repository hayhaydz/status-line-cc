/**
 * Core type definitions for statusline-hyz-cc
 */

/**
 * Context window current usage snapshot
 */
export interface ContextWindowCurrentUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

/**
 * Context window information from Claude Code
 */
export interface ContextWindow {
  total_input_tokens?: number;
  total_output_tokens?: number;
  context_window_size?: number;
  used_percentage?: number;
  remaining_percentage?: number;
  current_usage?: ContextWindowCurrentUsage;
}

/**
 * Input JSON from Claude Code (via stdin)
 */
export interface ClaudeCodeInput {
  hook_event_name?: string;
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  model?: string | { id?: string; display_name?: string };
  workspace?: { current_dir?: string; project_dir?: string };
  version?: string;
  output_style?: { name?: string };
  cost?: { total_cost_usd?: number; total_duration_ms?: number };
  context_window?: ContextWindow;
}

/**
 * Widget interface - all widgets must implement this
 */
export interface Widget {
  /** Widget name (identifier) */
  readonly name: string;

  /** Render the widget and return formatted string */
  render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string>;

  /** Check if widget is enabled */
  isEnabled(config: WidgetConfig): boolean;
}

/**
 * Widget configuration structure
 */
export interface WidgetConfig {
  /** Enable/disable this widget */
  enabled?: boolean;

  /** Custom icon/label */
  icon?: string;

  /** Display format (compact, detailed, minimal) */
  format?: "compact" | "detailed" | "minimal";

  /** Widget-specific options */
  options?: Record<string, unknown>;
}

/**
 * Cache entry with TTL support
 */
export interface CacheEntry<T> {
  /** Cached value */
  value: T;

  /** Expiration timestamp (milliseconds since epoch) */
  expiresAt: number;

  /** Whether the cache is stale (expired but usable for revalidation) */
  isStale(): boolean;
}

/**
 * Main configuration structure (3-level hierarchy)
 */
export interface Config {
  /** Enable/disable the statusline globally or per-project */
  enabled?: boolean;

  /** Global output format */
  format?: "compact" | "detailed" | "minimal";

  /** Icon display mode */
  iconMode?: IconMode;

  /** Enable debug logging */
  verbose?: boolean;

  /** Cache TTL overrides (milliseconds) */
  cacheTTL?: {
    /** GLM API cache TTL (default: 5 min) */
    glm?: number;
    /** Model usage cache TTL (default: 15 min) */
    modelUsage?: number;
  };

  /** Widget configurations (keyed by widget name) */
  widgets?: Record<string, WidgetConfig>;

  /** GLM API configuration */
  glm?: {
    /** Base URL (default: from ANTHROPIC_BASE_URL env) */
    baseUrl?: string;
    /** Auth token (default: from ANTHROPIC_AUTH_TOKEN env) */
    authToken?: string;
    /** Request timeout (default: 5000ms) */
    timeout?: number;
  };

  /** Model concurrency limits */
  concurrencyLimits?: Record<string, number>;
}

/**
 * GLM API quota response
 */
export interface GLMQuotaResponse {
  /** Current timestamp from API */
  timestamp?: number;

  /** 5-hour block usage percentage (0-100) */
  blockUsage?: number;

  /** MCP quota percentage (0-100) */
  mcpUsage?: number;

  /** Web search quota percentage (0-100) */
  webUsage?: number;

  /** Any error from API */
  error?: string;
}

/**
 * GLM model usage response
 */
export interface GLMModelUsageResponse {
  /** Model identifier */
  model?: string;

  /** Tokens used in last 24 hours */
  tokens24h?: number;

  /** Requests count in last 24 hours */
  requests24h?: number;

  /** Any error from API */
  error?: string;
}

/**
 * Widget render result
 */
export interface WidgetResult {
  /** Widget name */
  name: string;

  /** Formatted output string */
  output: string;

  /** Render duration (milliseconds) */
  duration: number;

  /** Error if rendering failed */
  error?: Error;
}

/**
 * Output format options
 */
export type OutputFormat = "compact" | "detailed" | "minimal" | "multiline";

/** Icon display mode */
export type IconMode = "text" | "emoji" | "nerdfont";

/**
 * Git status information
 */
export interface GitStatus {
  /** Current branch name */
  branch: string;

  /** Number of staged files */
  staged: number;

  /** Number of modified files */
  modified: number;

  /** Whether repository is dirty (any changes) */
  isDirty: boolean;
}
