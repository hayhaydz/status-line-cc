import { describe, it, expect, beforeEach } from "bun:test";
import { getTheme, getThemeNames, getWidgetColor, registerTheme, type Theme } from "../../src/themes/index";

// Import all built-in themes to register them
import "../../src/themes/nord";
import "../../src/themes/tokyonight";
import "../../src/themes/monochrome";

describe("Theme System", () => {
  describe("Theme Registration", () => {
    it("should register a theme", () => {
      const mockTheme: Theme = {
        name: "test",
        colors: {
          name: "test",
          widgetColors: { git: 1, model: 2 },
        },
      };
      registerTheme(mockTheme);
      expect(getTheme("test")).toEqual(mockTheme);
    });

    it("should return undefined for non-existent theme", () => {
      expect(getTheme("nonexistent")).toBeUndefined();
    });

    it("should list all registered theme names", () => {
      const names = getThemeNames();
      expect(names).toContain("nord");
      expect(names).toContain("tokyonight");
      expect(names).toContain("monochrome");
    });
  });

  describe("Built-in Themes", () => {
    it("should have nord theme", () => {
      const nord = getTheme("nord");
      expect(nord).toBeDefined();
      expect(nord?.colors.name).toBe("nord");
      expect(nord?.colors.widgetColors.git).toBe(110);
      expect(nord?.colors.widgetColors.context).toBe(109);
    });

    it("should have tokyonight theme", () => {
      const tokyo = getTheme("tokyonight");
      expect(tokyo).toBeDefined();
      expect(tokyo?.colors.name).toBe("tokyonight");
      expect(tokyo?.colors.widgetColors.git).toBe(111);
      expect(tokyo?.colors.widgetColors.context).toBe(117);
    });

    it("should have monochrome theme", () => {
      const mono = getTheme("monochrome");
      expect(mono).toBeDefined();
      expect(mono?.colors.name).toBe("monochrome");
      expect(mono?.colors.widgetColors.git).toBe(0);
    });
  });

  describe("getWidgetColor", () => {
    it("should return widget color for valid theme and widget", () => {
      expect(getWidgetColor("nord", "git")).toBe(110);
      expect(getWidgetColor("tokyonight", "git")).toBe(111);
    });

    it("should return fallback for non-existent theme", () => {
      expect(getWidgetColor("nonexistent", "git", 999)).toBe(999);
    });

    it("should return fallback for non-existent widget", () => {
      expect(getWidgetColor("nord", "nonexistent", 888)).toBe(888);
    });

    it("should use default fallback when not specified", () => {
      expect(getWidgetColor("nonexistent", "git")).toBe(244);
    });
  });
});
