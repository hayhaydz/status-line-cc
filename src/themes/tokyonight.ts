import { registerTheme, type Theme } from "./index.js";

const tokyoNightTheme: Theme = {
  name: "tokyonight",
  colors: {
    name: "tokyonight",
    widgetColors: {
      git: 111, model: 245, context: 117, cache: 245,
      block: 245, concurrency: 245, glm: 245, websearch: 245,
    },
  },
};
registerTheme(tokyoNightTheme);
