import {
  getTokenDiagonalMode,
  MODULE_NAME,
  SPRITE_SHEET_MODE,
} from "./constants.js";
import {
  CARDINAL_SPRITE_DIRECTIONS,
  cardinalizeSpriteSheetDirection,
  getSpriteSheetFrameRectangle,
  normalizeSpriteSheetDirection,
  validateSpriteSheetDimensions,
  withSpriteSheetDefaults,
} from "./sprite-sheet/config.js";
import {
  applySpriteSheetFrame,
  restoreSpriteSheetFrame,
} from "./sprite-sheet/rendering.js";

export {
  CARDINAL_SPRITE_DIRECTIONS,
  cardinalizeSpriteSheetDirection,
  DEFAULT_RPGM_FRAME_SIZE,
  DIAGONAL_SPRITE_DIRECTIONS,
  getSpriteSheetDirectionRow,
  getSpriteSheetDirections,
  getSpriteSheetFrameRectangle,
  normalizeSpriteSheetDirection,
  SPRITE_SHEET_DEFAULT_FRAME_HEIGHT_SETTING,
  SPRITE_SHEET_DEFAULT_FRAME_WIDTH_SETTING,
  SPRITE_SHEET_DEFAULT_ROW_SETTINGS,
  SPRITE_SHEET_DIRECTIONS,
  validateSpriteSheetDimensions,
  withSpriteSheetDefaults,
} from "./sprite-sheet/config.js";

const frameCache = new Map();
const texturePromises = new Map();
const tokenRequests = new Map();
const tokenStates = new Map();
let hooksRegistered = false;

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
        originalTokenTexture: token.texture,
        originalMeshTexture: token.mesh.texture,
        originalScale: { x: token.mesh.scale.x, y: token.mesh.scale.y },
      });
    }

    applySpriteSheetFrame(token, frame, latest);
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
  const originalTexture =
    state.originalTokenTexture ?? state.originalMeshTexture;
  const renderMode = restoreSpriteSheetFrame(token, originalTexture);

  if (renderMode === "isometric") {
    tokenStates.delete(token.id);
    return;
  }

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
