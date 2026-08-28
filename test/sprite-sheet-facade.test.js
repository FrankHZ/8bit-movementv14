import assert from "node:assert/strict";
import test from "node:test";

import * as spriteSheet from "../src/scripts/sprite-sheet.js";

test("sprite-sheet facade keeps the established public exports", () => {
  const expectedExports = [
    "DEFAULT_RPGM_FRAME_SIZE",
    "SPRITE_SHEET_DEFAULT_FRAME_WIDTH_SETTING",
    "SPRITE_SHEET_DEFAULT_FRAME_HEIGHT_SETTING",
    "SPRITE_SHEET_DEFAULT_ROW_SETTINGS",
    "CARDINAL_SPRITE_DIRECTIONS",
    "DIAGONAL_SPRITE_DIRECTIONS",
    "SPRITE_SHEET_DIRECTIONS",
    "getSpriteSheetDirections",
    "normalizeSpriteSheetDirection",
    "cardinalizeSpriteSheetDirection",
    "withSpriteSheetDefaults",
    "getSpriteSheetDirectionRow",
    "validateSpriteSheetDimensions",
    "getSpriteSheetFrameRectangle",
    "inspectSpriteSheet",
    "getSpriteSheetConfig",
    "isSpriteSheetMode",
    "getSpriteSheetFacing",
    "applySpriteSheetDirection",
    "restoreSpriteSheetToken",
    "registerSpriteSheetHooks",
  ];

  for (const exportName of expectedExports) {
    assert.ok(exportName in spriteSheet, `Missing export: ${exportName}`);
  }
});
