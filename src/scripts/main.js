import { registerSettings } from "./settings.js";
import {
  createConfigButtons,
  createHudButtons,
  addListener,
} from "./functions.js";

Hooks.on("init", () => {
  registerSettings();

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
});

Hooks.on("ready", async function () {
  addListener();
});

Hooks.on("renderTokenHUD", async function (sheet, element) {
  createHudButtons(sheet, element);
});

Hooks.on("renderTokenConfig", async function (sheet, element) {
  createConfigButtons(sheet, element);
});
