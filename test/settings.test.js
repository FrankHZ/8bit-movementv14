import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { registerSettings } from "../src/scripts/settings.js";

test("settings defer localization until Foundry renders them", async () => {
  const translations = JSON.parse(
    await readFile(new URL("../src/lang/en.json", import.meta.url), "utf8"),
  );
  const registered = new Map();
  const previousDescriptor = Object.getOwnPropertyDescriptor(globalThis, "game");
  Object.defineProperty(globalThis, "game", {
    configurable: true,
    value: {
      settings: {
        register(scope, key, options) {
          assert.equal(scope, "8bit-movement-frankhz");
          registered.set(key, options);
        },
      },
    },
  });

  try {
    registerSettings();

    assert.equal(registered.size, 17);
    for (const [setting, options] of registered) {
      assert.ok(
        Object.hasOwn(translations, options.name),
        `${setting}.name must be a localization key`,
      );
      if (options.hint) {
        assert.ok(
          Object.hasOwn(translations, options.hint),
          `${setting}.hint must be a localization key`,
        );
      }
    }

    assert.equal(
      registered.get("spriteSheetDefaultFrameWidth").name,
      "8BITMOVEMENT.Sprite-Sheet-Default-Frame-Width_name",
    );
    assert.equal(
      registered.get("spriteSheetDefaultRowDown").name,
      "8BITMOVEMENT.Sprite-Sheet-Default-Row-down_name",
    );
    assert.deepEqual(
      {
        default: registered.get("isometricPerspective").default,
        requiresReload:
          registered.get("isometricPerspective").requiresReload,
        scope: registered.get("isometricPerspective").scope,
      },
      { default: false, requiresReload: true, scope: "world" },
    );
  } finally {
    if (previousDescriptor) {
      Object.defineProperty(globalThis, "game", previousDescriptor);
    } else {
      delete globalThis.game;
    }
  }
});
