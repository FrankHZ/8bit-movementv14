import {
  getTokenDiagonalMode,
  MODULE_NAME,
  SPRITE_SHEET_MODE,
} from "./constants.js";

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
export const CARDINAL_SPRITE_DIRECTIONS = Object.freeze([
  {
    key: "down",
    defaultRow: 1,
    defaultRowSetting: SPRITE_SHEET_DEFAULT_ROW_SETTINGS.down,
    labelKey: "8BITMOVEMENT.down",
  },
  {
    key: "left",
    defaultRow: 2,
    defaultRowSetting: SPRITE_SHEET_DEFAULT_ROW_SETTINGS.left,
    labelKey: "8BITMOVEMENT.left",
  },
  {
    key: "right",
    defaultRow: 3,
    defaultRowSetting: SPRITE_SHEET_DEFAULT_ROW_SETTINGS.right,
    labelKey: "8BITMOVEMENT.right",
  },
  {
    key: "up",
    defaultRow: 4,
    defaultRowSetting: SPRITE_SHEET_DEFAULT_ROW_SETTINGS.up,
    labelKey: "8BITMOVEMENT.up",
  },
]);
export const DIAGONAL_SPRITE_DIRECTIONS = Object.freeze([
  {
    key: "down-left",
    defaultRow: 1,
    defaultRowSetting: SPRITE_SHEET_DEFAULT_ROW_SETTINGS["down-left"],
    labelKey: "8BITMOVEMENT.down-left",
  },
  {
    key: "down-right",
    defaultRow: 1,
    defaultRowSetting: SPRITE_SHEET_DEFAULT_ROW_SETTINGS["down-right"],
    labelKey: "8BITMOVEMENT.down-right",
  },
  {
    key: "up-left",
    defaultRow: 4,
    defaultRowSetting: SPRITE_SHEET_DEFAULT_ROW_SETTINGS["up-left"],
    labelKey: "8BITMOVEMENT.up-left",
  },
  {
    key: "up-right",
    defaultRow: 4,
    defaultRowSetting: SPRITE_SHEET_DEFAULT_ROW_SETTINGS["up-right"],
    labelKey: "8BITMOVEMENT.up-right",
  },
]);
export const SPRITE_SHEET_DIRECTIONS = Object.freeze([
  ...CARDINAL_SPRITE_DIRECTIONS,
  ...DIAGONAL_SPRITE_DIRECTIONS,
]);

const DEFAULT_DIRECTION = "down";
const DIRECTION_BY_KEY = Object.freeze(
  Object.fromEntries(
    SPRITE_SHEET_DIRECTIONS.map((direction) => [direction.key, direction]),
  ),
);
const CARDINAL_DIRECTION_FALLBACKS = Object.freeze({
  "down-left": "down",
  "down-right": "down",
  "up-left": "up",
  "up-right": "up",
});

const frameCache = new Map();
const texturePromises = new Map();
const tokenRequests = new Map();
const tokenStates = new Map();
let hooksRegistered = false;

function numberOr(value, fallback) {
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
  return Object.hasOwn(DIRECTION_BY_KEY, direction)
    ? direction
    : DEFAULT_DIRECTION;
}

export function cardinalizeSpriteSheetDirection(direction) {
  const normalized = normalizeSpriteSheetDirection(direction);
  return CARDINAL_DIRECTION_FALLBACKS[normalized] ?? normalized;
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

function getBaseTexture(texture) {
  if (!texture) return null;
  if (texture.baseTexture) return texture.baseTexture;
  if (texture.texture?.baseTexture) return texture.texture.baseTexture;
  return null;
}

async function loadBaseTexture(src) {
  if (!texturePromises.has(src)) {
    texturePromises.set(
      src,
      Promise.resolve(loadTexture(src)).then((texture) => {
        const baseTexture = getBaseTexture(texture);
        if (!baseTexture) {
          throw new Error(`Unable to load sprite sheet texture: ${src}`);
        }
        return baseTexture;
      }),
    );
  }

  try {
    return await texturePromises.get(src);
  } catch (error) {
    texturePromises.delete(src);
    throw error;
  }
}

export async function inspectSpriteSheet(
  src,
  config = {},
  directions = CARDINAL_SPRITE_DIRECTIONS,
) {
  const image = String(src ?? "").trim();
  if (!image) return { valid: false, code: "missing-source" };

  try {
    const baseTexture = await loadBaseTexture(image);
    return {
      src: image,
      ...validateSpriteSheetDimensions(
        baseTexture.width,
        baseTexture.height,
        config,
        directions,
      ),
    };
  } catch (error) {
    return {
      valid: false,
      code: "texture-load-failed",
      src: image,
      error,
    };
  }
}

function createFrame(src, direction, baseTexture, config) {
  const rectangle = getSpriteSheetFrameRectangle(
    baseTexture.width,
    baseTexture.height,
    direction,
    config,
  );
  if (!rectangle) return null;

  const { x, y, width, height } = rectangle;
  const key = `${src}|${baseTexture.width}x${baseTexture.height}|${x},${y},${width},${height}`;
  let frame = frameCache.get(key);
  if (!frame) {
    frame = new PIXI.Texture(
      baseTexture,
      new PIXI.Rectangle(x, y, width, height),
    );
    frameCache.set(key, frame);
  }
  return frame;
}

function getTokenDocument(tokenOrDocument) {
  return tokenOrDocument?.document ?? tokenOrDocument ?? null;
}

export function getSpriteSheetConfig(tokenOrDocument) {
  const document = getTokenDocument(tokenOrDocument);
  return document?.getFlag?.(MODULE_NAME, "spriteSheet") ?? null;
}

export function isSpriteSheetMode(tokenOrDocument) {
  const document = getTokenDocument(tokenOrDocument);
  return document?.getFlag?.(MODULE_NAME, "mode") === SPRITE_SHEET_MODE;
}

export function getSpriteSheetFacing(tokenOrDocument) {
  const document = getTokenDocument(tokenOrDocument);
  const facing = normalizeSpriteSheetDirection(
    getSpriteSheetConfig(document)?.facing,
  );
  return getTokenDiagonalMode(document)
    ? facing
    : cardinalizeSpriteSheetDirection(facing);
}

function resizeMesh(token, frame, config) {
  const scale = Math.max(0.01, numberOr(config.scale, 1));
  const offsetX = numberOr(config.offsetX, 0);
  const offsetY = numberOr(config.offsetY, 0);
  const frameWidth = Math.max(1, frame.width);
  const frameHeight = Math.max(1, frame.height);

  token.mesh.scale.set(
    (token.w / frameWidth) * scale,
    (token.h / frameHeight) * scale,
  );
  token.mesh.position.set(
    token.center.x + offsetX,
    token.center.y + (token.h * (1 - scale)) / 2 + offsetY,
  );
}

function requestKey(config, direction) {
  const facing = normalizeSpriteSheetDirection(direction);
  const row = config.directionRows[facing];
  return [
    config.src,
    `${config.frameWidth}x${config.frameHeight}`,
    `${config.sourceOffsetX},${config.sourceOffsetY}`,
    `${facing}:${row}`,
  ].join("|");
}

export async function applySpriteSheetDirection(token, direction) {
  if (!token?.mesh || token.destroyed || !isSpriteSheetMode(token)) return;

  const config = withSpriteSheetDefaults(getSpriteSheetConfig(token));
  if (!config.src) {
    restoreSpriteSheetToken(token);
    return;
  }

  const facing = getTokenDiagonalMode(token)
    ? normalizeSpriteSheetDirection(direction)
    : cardinalizeSpriteSheetDirection(direction);
  const activeRequest = requestKey(config, facing);
  tokenRequests.set(token.id, activeRequest);

  try {
    const baseTexture = await loadBaseTexture(config.src);
    const validation = validateSpriteSheetDimensions(
      baseTexture.width,
      baseTexture.height,
      config,
      [facing],
    );
    if (!validation.valid) {
      restoreSpriteSheetToken(token);
      return;
    }

    const frame = createFrame(config.src, facing, baseTexture, config);
    if (!frame || tokenRequests.get(token.id) !== activeRequest) return;
    if (!token.mesh || token.destroyed || !isSpriteSheetMode(token)) return;

    const latest = withSpriteSheetDefaults(getSpriteSheetConfig(token));
    if (requestKey(latest, facing) !== activeRequest) return;

    if (!tokenStates.has(token.id)) {
      tokenStates.set(token.id, {
        originalTexture: token.mesh.texture,
        originalScale: { x: token.mesh.scale.x, y: token.mesh.scale.y },
      });
    }

    if (token.mesh.texture !== frame) token.mesh.texture = frame;
    resizeMesh(token, frame, latest);
  } catch (error) {
    restoreSpriteSheetToken(token);
    console.warn(
      `8bit-movement: failed to apply RPG Maker sprite sheet ${config.src}.`,
      error,
    );
  }
}

export function restoreSpriteSheetToken(token) {
  if (!token?.mesh) return;
  const state = tokenStates.get(token.id);
  if (!state) return;

  tokenRequests.delete(token.id);
  const originalTexture = token.texture ?? state.originalTexture;
  if (originalTexture) token.mesh.texture = originalTexture;

  const textureWidth = originalTexture?.width ?? 0;
  const textureHeight = originalTexture?.height ?? 0;
  if (textureWidth > 0 && textureHeight > 0) {
    const scaleX = token.document?.texture?.scaleX ?? 1;
    const scaleY = token.document?.texture?.scaleY ?? 1;
    token.mesh.scale.set(
      (scaleX * token.w) / textureWidth,
      (scaleY * token.h) / textureHeight,
    );
  } else {
    token.mesh.scale.set(state.originalScale.x, state.originalScale.y);
  }
  token.mesh.position.set(token.center.x, token.center.y);
  tokenStates.delete(token.id);
}

function forgetToken(tokenId) {
  tokenRequests.delete(tokenId);
  tokenStates.delete(tokenId);
}

function clearFrameCache() {
  for (const frame of frameCache.values()) {
    try {
      frame.destroy(false);
    } catch {}
  }
  frameCache.clear();
  texturePromises.clear();
  tokenRequests.clear();
  tokenStates.clear();
}

export function registerSpriteSheetHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;

  Hooks.on("canvasReady", () => {
    for (const token of canvas.tokens.placeables) {
      if (isSpriteSheetMode(token)) {
        void applySpriteSheetDirection(token, getSpriteSheetFacing(token));
      }
    }
  });

  Hooks.on("drawToken", (token) => {
    if (isSpriteSheetMode(token)) {
      void applySpriteSheetDirection(token, getSpriteSheetFacing(token));
    }
  });

  Hooks.on("createToken", (document) => {
    setTimeout(() => {
      const token = canvas?.tokens?.get(document.id);
      if (token && isSpriteSheetMode(token)) {
        void applySpriteSheetDirection(token, getSpriteSheetFacing(token));
      }
    }, 0);
  });

  Hooks.on("refreshToken", (token) => {
    if (isSpriteSheetMode(token)) {
      void applySpriteSheetDirection(token, getSpriteSheetFacing(token));
    }
  });

  Hooks.on("updateToken", (document) => {
    const token = canvas?.tokens?.get(document.id);
    if (!token) return;
    if (isSpriteSheetMode(document)) {
      void applySpriteSheetDirection(token, getSpriteSheetFacing(document));
    } else {
      restoreSpriteSheetToken(token);
    }
  });

  Hooks.on("deleteToken", (document) => forgetToken(document.id));
  Hooks.on("canvasTearDown", clearFrameCache);
}
