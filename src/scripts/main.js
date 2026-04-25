import { registerSettings } from "./settings.js";
import { addListener } from "./functions.js";
import { createConfigButtons, createHudButtons } from "./ui.js";

Hooks.on("init", () => {
  registerSettings();
});

Hooks.on("ready", async function () {
  if (game.settings.get("8bit-movement", "disableRotationAnimation")) {
    if (!globalThis.libWrapper) {
      console.warn(
        "8bit-movement: libWrapper is not active; rotation animation wrapper was not registered.",
      );
    } else {
      try {
        const wrapperId = libWrapper.register(
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

        console.log(
          `8bit-movement: registered Token.prototype.animate wrapper with libWrapper (${wrapperId}).`,
        );
      } catch (error) {
        console.error(
          "8bit-movement: failed to register Token.prototype.animate wrapper with libWrapper.",
          error,
        );
      }
    }
  }

  addListener();
});

Hooks.on("renderTokenHUD", async function (sheet, element) {
  createHudButtons(sheet, element);
});

Hooks.on("renderTokenConfig", async function (sheet, element) {
  createConfigButtons(sheet, element);
});
