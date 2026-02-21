import { registerTheme, type Theme } from "./index.js";

const monochromeTheme: Theme = {
  name: "monochrome",
  colors: {
    name: "monochrome",
    widgetColors: {
      git: 0, model: 0, context: 0, cache: 0,
      block: 0, concurrency: 0, glm: 0, websearch: 0,
    },
  },
};
registerTheme(monochromeTheme);
