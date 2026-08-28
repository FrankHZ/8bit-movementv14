import assert from "node:assert/strict";
import test from "node:test";

import {
  CARDINAL_SPRITE_DIRECTIONS,
  DIAGONAL_SPRITE_DIRECTIONS,
  SPRITE_SHEET_DIRECTIONS,
  cardinalizeSpriteSheetDirection,
  getSpriteSheetDirections,
  getSpriteSheetFrameRectangle,
  normalizeSpriteSheetDirection,
  validateSpriteSheetDimensions,
  withSpriteSheetDefaults,
} from "../src/scripts/sprite-sheet/config.js";

function withGameSettings(values, callback) {
  const previousDescriptor = Object.getOwnPropertyDescriptor(globalThis, "game");
  Object.defineProperty(globalThis, "game", {
    configurable: true,
    value: {
      settings: {
        get(scope, setting) {
          assert.equal(scope, "8bit-movement-frankhz");
          return values[setting];
        },
      },
    },
  });

  try {
    return callback();
  } finally {
    if (previousDescriptor) {
      Object.defineProperty(globalThis, "game", previousDescriptor);
    } else {
      delete globalThis.game;
    }
  }
}

test("direction lists and fallbacks stay compatible", () => {
  assert.equal(CARDINAL_SPRITE_DIRECTIONS.length, 4);
  assert.equal(DIAGONAL_SPRITE_DIRECTIONS.length, 4);
  assert.equal(SPRITE_SHEET_DIRECTIONS.length, 8);
  assert.equal(getSpriteSheetDirections(false), CARDINAL_SPRITE_DIRECTIONS);
  assert.equal(getSpriteSheetDirections(true), SPRITE_SHEET_DIRECTIONS);

  assert.equal(normalizeSpriteSheetDirection("up-right"), "up-right");
  assert.equal(normalizeSpriteSheetDirection("unknown"), "down");
  assert.equal(cardinalizeSpriteSheetDirection("down-left"), "down");
  assert.equal(cardinalizeSpriteSheetDirection("up-right"), "up");
  assert.equal(cardinalizeSpriteSheetDirection("left"), "left");
});

test("built-in defaults are used outside Foundry", () => {
  const previousDescriptor = Object.getOwnPropertyDescriptor(globalThis, "game");
  delete globalThis.game;

  try {
    assert.deepEqual(withSpriteSheetDefaults({ src: "  hero.png  " }), {
      src: "hero.png",
      facing: "down",
      frameWidth: 48,
      frameHeight: 48,
      sourceOffsetX: 0,
      sourceOffsetY: 0,
      directionRows: {
        down: 1,
        left: 2,
        right: 3,
        up: 4,
        "down-left": 1,
        "down-right": 1,
        "up-left": 4,
        "up-right": 4,
      },
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
  } finally {
    if (previousDescriptor) {
      Object.defineProperty(globalThis, "game", previousDescriptor);
    }
  }
});

test("world settings fill only missing token fields", { concurrency: false }, () => {
  withGameSettings(
    {
      spriteSheetDefaultFrameWidth: 64,
      spriteSheetDefaultFrameHeight: 72,
      spriteSheetDefaultRowDown: 2,
      spriteSheetDefaultRowLeft: 3,
      spriteSheetDefaultRowRight: 4,
      spriteSheetDefaultRowUp: 5,
      spriteSheetDefaultRowDownLeft: 6,
      spriteSheetDefaultRowDownRight: 7,
      spriteSheetDefaultRowUpLeft: 8,
      spriteSheetDefaultRowUpRight: 9,
    },
    () => {
      const config = withSpriteSheetDefaults({
        frameWidth: 32,
        directionRows: { down: 11, "up-right": 12 },
        scale: "1.5",
      });

      assert.equal(config.frameWidth, 32);
      assert.equal(config.frameHeight, 72);
      assert.equal(config.directionRows.down, 11);
      assert.equal(config.directionRows.left, 3);
      assert.equal(config.directionRows["up-right"], 12);
      assert.equal(config.scale, 1.5);
    },
  );
});

test("validation accepts offsets and non-divisible textures", () => {
  const validation = validateSpriteSheetDimensions(
    155,
    415,
    {
      frameWidth: 48,
      frameHeight: 48,
      sourceOffsetX: 3,
      sourceOffsetY: 5,
      directionRows: {
        down: 1,
        left: 2,
        right: 3,
        up: 4,
        "down-left": 5,
        "down-right": 6,
        "up-left": 7,
        "up-right": 8,
      },
    },
    SPRITE_SHEET_DIRECTIONS,
  );

  assert.equal(validation.valid, true);
  assert.equal(validation.columns, 3);
  assert.equal(validation.maximumRow, 8);
  assert.equal(validation.sourceOffsetX, 3);
  assert.equal(validation.sourceOffsetY, 5);
});

test("validation reports stable error codes", () => {
  assert.equal(validateSpriteSheetDimensions(0, 100).code, "invalid-texture-size");
  assert.equal(
    validateSpriteSheetDimensions(100, 100, { frameWidth: 0 }).code,
    "invalid-frame-size",
  );
  assert.equal(
    validateSpriteSheetDimensions(100, 100, { sourceOffsetX: -1 }).code,
    "invalid-source-offset",
  );
  assert.deepEqual(
    validateSpriteSheetDimensions(
      100,
      100,
      { directionRows: { down: 0 } },
      ["down"],
    ),
    { valid: false, code: "invalid-direction-row", direction: "down" },
  );
  assert.equal(
    validateSpriteSheetDimensions(48, 191).code,
    "crop-out-of-bounds",
  );
});

test("frame rectangles select the first frame of the configured row", () => {
  assert.deepEqual(
    getSpriteSheetFrameRectangle(155, 415, "up", {
      frameWidth: 48,
      frameHeight: 48,
      sourceOffsetX: 3,
      sourceOffsetY: 5,
      directionRows: { up: 4 },
    }),
    { x: 3, y: 149, width: 48, height: 48 },
  );
  assert.equal(
    getSpriteSheetFrameRectangle(48, 191, "up", {
      directionRows: { up: 4 },
    }),
    null,
  );
});
