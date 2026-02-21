import { registerTheme, type Theme } from "./index.js";

const nordTheme: Theme = {
  name: "nord",
  colors: {
    name: "nord",
    widgetColors: {
      git: 110, model: 244, context: 109, cache: 244,
      block: 244, concurrency: 244, glm: 244, websearch: 244,
    },
  },
};
registerTheme(nordTheme);
