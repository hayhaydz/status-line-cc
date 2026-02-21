/**
 * Widget system foundation
 *
 * Provides the Widget interface, registry, and rendering orchestration.
 */

import type { Widget, WidgetConfig, WidgetResult, ClaudeCodeInput, OutputFormat } from "./types.js";
import { configureFromConfig, debug, error as logError } from "./util/logger.js";

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
 * Get a widget by name
 */
export function getWidget(name: string): Widget | undefined {
  return widgetRegistry.get(name);
}

/**
 * Get all registered widgets
 */
export function getAllWidgets(): Widget[] {
  return Array.from(widgetRegistry.values());
}

/**
 * Unregister a widget
 */
export function unregisterWidget(name: string): boolean {
  return widgetRegistry.delete(name);
}

/**
 * Render a single widget with error handling
 */
export async function renderWidget(
  widget: Widget,
  input: ClaudeCodeInput,
  config: WidgetConfig,
  format: OutputFormat
): Promise<WidgetResult> {
  const startTime = performance.now();

  try {
    // Check if widget is enabled
    if (!widget.isEnabled(config)) {
      return {
        name: widget.name,
        output: "",
        duration: performance.now() - startTime,
      };
    }

    // Render the widget
    const output = await widget.render(input, { ...config, format });

    return {
      name: widget.name,
      output,
      duration: performance.now() - startTime,
    };
  } catch (err) {
    logError(`Widget ${widget.name} failed: ${(err as Error).message}`);

    return {
      name: widget.name,
      output: "",
      duration: performance.now() - startTime,
      error: err as Error,
    };
  }
}

/**
 * Render all enabled widgets concurrently
 *
 * Returns formatted string with all widgets joined by separator.
 */
export async function renderWidgets(
  input: ClaudeCodeInput,
  widgetConfigs: Record<string, WidgetConfig>,
  format: OutputFormat,
  separator = " | "
): Promise<string> {
  // Configure logger from the first widget config (for verbose mode)
  const firstConfig = Object.values(widgetConfigs)[0];
  if (firstConfig && "verbose" in firstConfig) {
    configureFromConfig({ verbose: (firstConfig as { verbose?: boolean }).verbose });
  }

  const widgets = getAllWidgets();
  const enabledWidgets = widgets.filter((w) => {
    const config = widgetConfigs[w.name];
    return config?.enabled !== false;
  });

  if (enabledWidgets.length === 0) {
    debug("No widgets enabled");
    return "";
  }

  debug(`Rendering ${enabledWidgets.length} widgets concurrently`);

  // Render all widgets concurrently
  const results = await Promise.all(
    enabledWidgets.map((widget) =>
      renderWidget(widget, input, widgetConfigs[widget.name] ?? {}, format)
    )
  );

  // Filter out empty outputs and join
  const outputs = results
    .filter((r) => r.output.length > 0)
    .map((r) => r.output);

  return outputs.join(separator);
}

/**
 * Base widget class with common functionality
 *
 * Extend this class to create custom widgets.
 */
export abstract class BaseWidget implements Widget {
  readonly name: string;
  protected defaultIcon: string;

  constructor(name: string, defaultIcon = "") {
    this.name = name;
    this.defaultIcon = defaultIcon;
  }

  isEnabled(config: WidgetConfig): boolean {
    return config.enabled !== false;
  }

  protected getIcon(config: WidgetConfig): string {
    return config.icon ?? this.defaultIcon;
  }

  abstract render(input: ClaudeCodeInput, config: WidgetConfig): Promise<string>;
}

/**
 * Create a widget from a render function
 *
 * Utility for simple widgets that don't need a class.
 */
export function createWidget(
  name: string,
  renderFn: (input: ClaudeCodeInput, config: WidgetConfig) => Promise<string>,
  defaultIcon = ""
): Widget {
  return {
    name,
    render: renderFn,
    isEnabled: (config) => config.enabled !== false,
    get defaultIcon() {
      return defaultIcon;
    },
  };
}
