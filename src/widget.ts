/**
 * Widget system foundation
 *
 * Provides the Widget interface, registry, and rendering orchestration.
 */

import type { Widget, WidgetConfig, WidgetResult, ClaudeCodeInput, Config } from "./types.js";
import { configureFromConfig, debug, error as logError } from "./util/logger.js";
import { formatOutput } from "./util/format.js";
import { isWidgetEnabled } from "./util/shared-types.js";

/** Widget registry */
const widgetRegistry = new Map<string, Widget>();

/**
 * Register a widget
 */
export function registerWidget(widget: Widget): void {
  widgetRegistry.set(widget.name, widget);
  debug(`Widget registered: ${widget.name}`);
}

/**
 * Get all registered widgets
 */
export function getAllWidgets(): Widget[] {
  return Array.from(widgetRegistry.values());
}

/**
 * Render a single widget with error handling
 */
export async function renderWidget(
  widget: Widget,
  input: ClaudeCodeInput,
  config: WidgetConfig,
  globalConfig?: Config
): Promise<WidgetResult> {
  const startTime = performance.now();

  try {
    // Check if widget is enabled
    if (!widget.isEnabled(config)) {
      return {
        name: widget.name,
        output: null,
        duration: performance.now() - startTime,
      };
    }

    // Render the widget
    const output = await widget.render(input, config, globalConfig);

    return {
      name: widget.name,
      output,
      duration: performance.now() - startTime,
    };
  } catch (err) {
    logError(`Widget ${widget.name} failed: ${(err as Error).message}`);

    return {
      name: widget.name,
      output: null,
      duration: performance.now() - startTime,
      error: err as Error,
    };
  }
}

/**
 * Render all enabled widgets concurrently
 *
 * Returns formatted string with all widgets joined by " | ".
 */
export async function renderWidgets(
  input: ClaudeCodeInput,
  widgetConfigs: Record<string, WidgetConfig>,
  globalConfig?: Config
): Promise<string> {
  // Configure logger from global config (for verbose mode)
  if (globalConfig) {
    configureFromConfig(globalConfig);
  }

  const widgets = getAllWidgets();
  const enabledWidgets = widgets.filter((w) =>
    isWidgetEnabled(widgetConfigs[w.name])
  );

  if (enabledWidgets.length === 0) {
    debug("No widgets enabled");
    return "";
  }

  debug(`Rendering ${enabledWidgets.length} widgets concurrently`);

  // Render all widgets concurrently
  const results = await Promise.all(
    enabledWidgets.map((widget) =>
      renderWidget(widget, input, widgetConfigs[widget.name] ?? {}, globalConfig)
    )
  );

  // Use formatOutput to join non-null outputs
  const outputs = results.map((r) => r.output);
  return formatOutput(outputs);
}

/**
 * Base widget class with common functionality
 *
 * Extend this class to create custom widgets.
 */
export abstract class BaseWidget implements Widget {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  isEnabled(config: WidgetConfig): boolean {
    return isWidgetEnabled(config);
  }

  abstract render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string | null>;
}
