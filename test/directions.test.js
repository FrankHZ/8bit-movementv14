import assert from "node:assert/strict";
import test from "node:test";

import {
  getIsometricPerspectiveMode,
  projectDirectionToScreen,
} from "../src/scripts/constants.js";

test("isometric projection places source directions on screen", () => {
  const expected = {
    down: "down-left",
    right: "down-right",
    up: "up-right",
    left: "up-left",
    "down-right": "down",
    "up-right": "right",
    "up-left": "up",
    "down-left": "left",
  };

  for (const [source, screen] of Object.entries(expected)) {
    assert.equal(projectDirectionToScreen(source, true), screen);
    assert.equal(projectDirectionToScreen(source, false), source);
  }
});

test("isometric perspective is a safe world-setting lookup", () => {
  const calls = [];
  const gameInstance = {
    settings: {
      get(scope, setting) {
        calls.push([scope, setting]);
        return true;
      },
    },
  };

  assert.equal(getIsometricPerspectiveMode(gameInstance), true);
  assert.deepEqual(calls, [
    ["8bit-movement-frankhz", "isometricPerspective"],
  ]);
  assert.equal(getIsometricPerspectiveMode(undefined), false);
});
