/**
 * Widget system foundation
 *
 * Provides the Widget interface, registry, and rendering orchestration.
 */

import type { Widget, WidgetConfig, WidgetResult, ClaudeCodeInput, OutputFormat, Config } from "./types.js";
import { configureFromConfig, debug, error as logError } from "./util/logger.js";
import { getWidgetColor as getThemeWidgetColor } from "./themes/index.js";
import { color as ansiColor } from "./util/ansi.js";

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
  format: OutputFormat,
  globalConfig?: Config
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
    const output = await widget.render(input, { ...config, format }, globalConfig);

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
  separator = " | ",
  globalConfig?: Config
): Promise<string> {
  // Configure logger from global config (for verbose mode)
  if (globalConfig) {
    configureFromConfig(globalConfig);
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
      renderWidget(widget, input, widgetConfigs[widget.name] ?? {}, format, globalConfig)
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
  protected textContentIcon = "";
  protected emojiIcon = "";

  constructor(name: string, defaultIcon = "") {
    this.name = name;
    this.defaultIcon = defaultIcon;
  }

  isEnabled(config: WidgetConfig): boolean {
    return config.enabled !== false;
  }

  protected getIcon(config: WidgetConfig, globalConfig?: Config): string {
    if (config.icon) {
      return config.icon;
    }

    const mode = globalConfig?.iconMode ?? "nerdfont";

    switch (mode) {
      case "text":
        return this.textContentIcon;
      case "emoji":
        return this.emojiIcon;
      case "nerdfont":
      default:
        return this.defaultIcon;
    }
  }

  /**
   * Get theme color for this widget
   */
  protected getWidgetColor(globalConfig?: Config): number | null {
    // Only apply colors when theme is explicitly set
    const themeName = globalConfig?.theme;
    if (!themeName) {
      return null;
    }
    return getThemeWidgetColor(themeName, this.name);
  }

  /**
   * Format text with widget color
   */
  protected formatWithColor(
    text: string,
    globalConfig?: Config
  ): string {
    const colorCode = this.getWidgetColor(globalConfig);

    if (!colorCode || colorCode === 0) {
      return text;
    }

    return ansiColor(text, colorCode);
  }

  abstract render(input: ClaudeCodeInput, config: WidgetConfig, globalConfig?: Config): Promise<string>;
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
