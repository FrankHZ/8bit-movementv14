import assert from "node:assert/strict";
import test from "node:test";

import {
  getIsometricPerspectiveMode,
  mapCanvasDirectionToSource,
  projectDirectionToScreen,
} from "../src/scripts/constants.js";
import { resolveMovementFacing } from "../src/scripts/functions.js";

test("isometric projection places source directions on screen", () => {
  const expected = {
    down: "down-right",
    right: "up-right",
    up: "up-left",
    left: "down-left",
    "down-right": "right",
    "up-right": "up",
    "up-left": "left",
    "down-left": "down",
  };

  for (const [source, screen] of Object.entries(expected)) {
    assert.equal(projectDirectionToScreen(source, true), screen);
    assert.equal(projectDirectionToScreen(source, false), source);
  }
});

test("isometric canvas axes select their screen-space source direction", () => {
  const expected = {
    down: "down-right",
    right: "up-right",
    up: "up-left",
    left: "down-left",
    "down-right": "right",
    "up-right": "up",
    "up-left": "left",
    "down-left": "down",
  };

  for (const [canvasDirection, sourceDirection] of Object.entries(expected)) {
    assert.equal(
      mapCanvasDirectionToSource(canvasDirection, true),
      sourceDirection,
    );
    assert.equal(
      mapCanvasDirectionToSource(canvasDirection, false),
      canvasDirection,
    );
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

test("four-way isometric movement preserves all four canvas facings", () => {
  globalThis.foundry = {
    utils: {
      hasProperty(object, key) {
        return Object.hasOwn(object, key);
      },
    },
  };
  const token = { x: 0, y: 0 };
  const expected = [
    [{ y: -100 }, "up"],
    [{ x: 100 }, "right"],
    [{ y: 100 }, "down"],
    [{ x: -100 }, "left"],
  ];

  for (const [change, facing] of expected) {
    assert.equal(resolveMovementFacing(token, change, false, true), facing);
  }
  delete globalThis.foundry;
});
