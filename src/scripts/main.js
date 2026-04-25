import { registerSettings } from "./settings.js";
import { addListener } from "./functions.js";
import { createConfigButtons, createHudButtons } from "./ui.js";

Hooks.on("init", () => {
  registerSettings();
});

Hooks.on("ready", async function () {
  if (
    game.settings.get("8bit-movement", "disableRotationAnimation") &&
    globalThis.libWrapper
  ) {
    libWrapper.register(
      "8bit-movement",
      "Token.prototype.animate",
      function (wrapped, ...args) {
        const [attributes, options = {}] = args;

        if (
          attributes.hasOwnProperty("texture") &&
          attributes.hasOwnProperty("rotation")
        ) {
          options.duration = 0;
        }

        return wrapped(attributes, options);
      },
      "WRAPPER",
    );
  }

  addListener();
});

Hooks.on("renderTokenHUD", async function (sheet, element) {
  createHudButtons(sheet, element);
});

Hooks.on("renderTokenConfig", async function (sheet, element) {
  createConfigButtons(sheet, element);
});
