import { MODULE_NAME } from "../constants.js";
import {
  DIRECTION_BY_KEY,
  cardinalizeDirection,
  normalizeDirection,
} from "../directions.js";

export const DEFAULT_RPGM_FRAME_SIZE = 48;
export const SPRITE_SHEET_DEFAULT_FRAME_WIDTH_SETTING =
  "spriteSheetDefaultFrameWidth";
export const SPRITE_SHEET_DEFAULT_FRAME_HEIGHT_SETTING =
  "spriteSheetDefaultFrameHeight";
export const SPRITE_SHEET_DEFAULT_ROW_SETTINGS = Object.freeze({
  down: "spriteSheetDefaultRowDown",
  left: "spriteSheetDefaultRowLeft",
  right: "spriteSheetDefaultRowRight",
  up: "spriteSheetDefaultRowUp",
  "down-left": "spriteSheetDefaultRowDownLeft",
  "down-right": "spriteSheetDefaultRowDownRight",
  "up-left": "spriteSheetDefaultRowUpLeft",
  "up-right": "spriteSheetDefaultRowUpRight",
});

function defineSpriteDirection(key, defaultRow) {
  return Object.freeze({
    key,
    defaultRow,
    defaultRowSetting: SPRITE_SHEET_DEFAULT_ROW_SETTINGS[key],
    labelKey: DIRECTION_BY_KEY[key].labelKey,
  });
}

export const CARDINAL_SPRITE_DIRECTIONS = Object.freeze([
  defineSpriteDirection("down", 1),
  defineSpriteDirection("left", 2),
  defineSpriteDirection("right", 3),
  defineSpriteDirection("up", 4),
]);

export const DIAGONAL_SPRITE_DIRECTIONS = Object.freeze([
  defineSpriteDirection("down-left", 1),
  defineSpriteDirection("down-right", 1),
  defineSpriteDirection("up-left", 4),
  defineSpriteDirection("up-right", 4),
]);

export const SPRITE_SHEET_DIRECTIONS = Object.freeze([
  ...CARDINAL_SPRITE_DIRECTIONS,
  ...DIAGONAL_SPRITE_DIRECTIONS,
]);

export function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function positiveSetting(setting, fallback) {
  try {
    if (typeof game === "undefined" || !game.settings) return fallback;
    return positiveInteger(game.settings.get(MODULE_NAME, setting)) ?? fallback;
  } catch {
    return fallback;
  }
}

function directionKeys(directions) {
  return directions.map((direction) =>
    typeof direction === "string" ? direction : direction.key,
  );
}

export function getSpriteSheetDirections(diagonalMode = false) {
  return diagonalMode
    ? SPRITE_SHEET_DIRECTIONS
    : CARDINAL_SPRITE_DIRECTIONS;
}

export function normalizeSpriteSheetDirection(direction) {
  return normalizeDirection(direction);
}

export function cardinalizeSpriteSheetDirection(direction) {
  return cardinalizeDirection(direction);
}

export function withSpriteSheetDefaults(config = {}) {
  const configuredRows = config.directionRows ?? {};
  const directionRows = Object.fromEntries(
    SPRITE_SHEET_DIRECTIONS.map((direction) => [
      direction.key,
      configuredRows[direction.key] ??
        positiveSetting(direction.defaultRowSetting, direction.defaultRow),
    ]),
  );

  return {
    src: String(config.src ?? "").trim(),
    facing: normalizeSpriteSheetDirection(config.facing),
    frameWidth:
      config.frameWidth ??
      positiveSetting(
        SPRITE_SHEET_DEFAULT_FRAME_WIDTH_SETTING,
        DEFAULT_RPGM_FRAME_SIZE,
      ),
    frameHeight:
      config.frameHeight ??
      positiveSetting(
        SPRITE_SHEET_DEFAULT_FRAME_HEIGHT_SETTING,
        DEFAULT_RPGM_FRAME_SIZE,
      ),
    sourceOffsetX: config.sourceOffsetX ?? 0,
    sourceOffsetY: config.sourceOffsetY ?? 0,
    directionRows,
    scale: numberOr(config.scale, 1),
    offsetX: numberOr(config.offsetX, 0),
    offsetY: numberOr(config.offsetY, 0),
  };
}

export function getSpriteSheetDirectionRow(config, direction) {
  const facing = normalizeSpriteSheetDirection(direction);
  return positiveInteger(withSpriteSheetDefaults(config).directionRows[facing]);
}

export function validateSpriteSheetDimensions(
  textureWidth,
  textureHeight,
  config = {},
  directions = CARDINAL_SPRITE_DIRECTIONS,
) {
  const width = positiveInteger(textureWidth);
  const height = positiveInteger(textureHeight);
  const normalized = withSpriteSheetDefaults(config);
  const frameWidth = positiveInteger(normalized.frameWidth);
  const frameHeight = positiveInteger(normalized.frameHeight);
  const sourceOffsetX = nonNegativeInteger(normalized.sourceOffsetX);
  const sourceOffsetY = nonNegativeInteger(normalized.sourceOffsetY);

  if (!width || !height) {
    return { valid: false, code: "invalid-texture-size" };
  }
  if (!frameWidth || !frameHeight) {
    return { valid: false, code: "invalid-frame-size" };
  }
  if (sourceOffsetX === null || sourceOffsetY === null) {
    return { valid: false, code: "invalid-source-offset" };
  }

  const activeDirections = directionKeys(directions);
  const directionRows = {};
  let maximumRow = 0;
  for (const direction of activeDirections) {
    const facing = normalizeSpriteSheetDirection(direction);
    const row = positiveInteger(normalized.directionRows[facing]);
    if (!row) {
      return {
        valid: false,
        code: "invalid-direction-row",
        direction: facing,
      };
    }
    directionRows[facing] = row;
    maximumRow = Math.max(maximumRow, row);
  }

  const requiredWidth = sourceOffsetX + frameWidth;
  const requiredHeight = sourceOffsetY + maximumRow * frameHeight;
  const availableRows =
    sourceOffsetY <= height
      ? Math.floor((height - sourceOffsetY) / frameHeight)
      : 0;
  const columns =
    sourceOffsetX <= width
      ? Math.floor((width - sourceOffsetX) / frameWidth)
      : 0;
  if (requiredWidth > width || requiredHeight > height) {
    return {
      valid: false,
      code: "crop-out-of-bounds",
      textureWidth: width,
      textureHeight: height,
      frameWidth,
      frameHeight,
      sourceOffsetX,
      sourceOffsetY,
      requiredWidth,
      requiredHeight,
      availableRows,
      maximumRow,
    };
  }

  return {
    valid: true,
    code: "ready",
    textureWidth: width,
    textureHeight: height,
    frameWidth,
    frameHeight,
    sourceOffsetX,
    sourceOffsetY,
    directionRows,
    maximumRow,
    columns,
  };
}

export function getSpriteSheetFrameRectangle(
  textureWidth,
  textureHeight,
  direction,
  config = {},
) {
  const facing = normalizeSpriteSheetDirection(direction);
  const validation = validateSpriteSheetDimensions(
    textureWidth,
    textureHeight,
    config,
    [facing],
  );
  if (!validation.valid) return null;

  const row = validation.directionRows[facing];
  return {
    x: validation.sourceOffsetX,
    y: validation.sourceOffsetY + (row - 1) * validation.frameHeight,
    width: validation.frameWidth,
    height: validation.frameHeight,
  };
}
