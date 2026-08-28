import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { registerSettings } from "../src/scripts/settings.js";

test("sprite-sheet setting labels come from the localization dictionary", async () => {
  const translations = JSON.parse(
    await readFile(new URL("../src/lang/en.json", import.meta.url), "utf8"),
  );
  const registered = new Map();
  const previousDescriptor = Object.getOwnPropertyDescriptor(globalThis, "game");
  Object.defineProperty(globalThis, "game", {
    configurable: true,
    value: {
      i18n: {
        format(key) {
          return translations[key] ?? key;
        },
      },
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

    const width = registered.get("spriteSheetDefaultFrameWidth");
    assert.equal(
      width.name,
      translations["8BITMOVEMENT.Sprite-Sheet-Default-Frame-Width_name"],
    );
    assert.equal(
      width.hint,
      translations["8BITMOVEMENT.Sprite-Sheet-Default-Frame-Width_hint"],
    );

    const height = registered.get("spriteSheetDefaultFrameHeight");
    assert.equal(
      height.hint,
      translations["8BITMOVEMENT.Sprite-Sheet-Default-Frame-Height_hint"],
    );

    const downRow = registered.get("spriteSheetDefaultRowDown");
    assert.equal(
      downRow.name,
      `${translations["8BITMOVEMENT.Sprite-Sheet-Default-Row_name"]}: ${translations["8BITMOVEMENT.down"]}`,
    );
    assert.equal(
      downRow.hint,
      translations["8BITMOVEMENT.Sprite-Sheet-Default-Row_hint"],
    );
  } finally {
    if (previousDescriptor) {
      Object.defineProperty(globalThis, "game", previousDescriptor);
    } else {
      delete globalThis.game;
    }
  }
});
