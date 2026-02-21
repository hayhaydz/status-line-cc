export interface ColorScheme {
  name: string;
  widgetColors: Record<string, number>;
}

export interface Theme {
  name: string;
  colors: ColorScheme;
}

const themes = new Map<string, Theme>();

export function registerTheme(theme: Theme): void {
  themes.set(theme.name, theme);
}

export function getTheme(name: string): Theme | undefined {
  return themes.get(name);
}

export function getThemeNames(): string[] {
  return Array.from(themes.keys());
}

export function getWidgetColor(themeName: string, widgetName: string, fallback: number = 244): number {
  const theme = getTheme(themeName);
  if (!theme) return fallback;
  return theme.colors.widgetColors[widgetName] ?? fallback;
}
