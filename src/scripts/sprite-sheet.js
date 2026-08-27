import { MODULE_NAME, SPRITE_SHEET_MODE } from "./constants.js";

const GRID_SIZE = 3;
const DEFAULT_DIRECTION = "down";

const CELL_BY_DIRECTION = Object.freeze({
  "up-left": { row: 0, column: 0 },
  up: { row: 0, column: 1 },
  "up-right": { row: 0, column: 2 },
  left: { row: 1, column: 0 },
  right: { row: 1, column: 2 },
  "down-left": { row: 2, column: 0 },
  down: { row: 2, column: 1 },
  "down-right": { row: 2, column: 2 },
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

export function getSpriteSheetFrameRectangle(width, height, direction) {
  const cell = CELL_BY_DIRECTION[direction] ?? CELL_BY_DIRECTION[DEFAULT_DIRECTION];
  const x0 = Math.round((cell.column * width) / GRID_SIZE);
  const x1 = Math.round(((cell.column + 1) * width) / GRID_SIZE);
  const y0 = Math.round((cell.row * height) / GRID_SIZE);
  const y1 = Math.round(((cell.row + 1) * height) / GRID_SIZE);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

function createFrame(src, direction, baseTexture) {
  const width = baseTexture.width;
  const height = baseTexture.height;
  const rectangle = getSpriteSheetFrameRectangle(width, height, direction);
  const { x, y, width: frameWidth, height: frameHeight } = rectangle;
  const key = `${src}|${width}x${height}|${direction}|${x},${y},${frameWidth},${frameHeight}`;

  let frame = frameCache.get(key);
  if (!frame) {
    frame = new PIXI.Texture(
      baseTexture,
      new PIXI.Rectangle(x, y, frameWidth, frameHeight),
    );
    frameCache.set(key, frame);
  }
  return frame;
}

async function getFrame(src, direction) {
  const baseTexture = await loadBaseTexture(src);
  return createFrame(src, direction, baseTexture);
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
  const direction = getSpriteSheetConfig(tokenOrDocument)?.facing;
  return Object.hasOwn(CELL_BY_DIRECTION, direction)
    ? direction
    : DEFAULT_DIRECTION;
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

export async function applySpriteSheetDirection(token, direction) {
  if (!token?.mesh || token.destroyed || !isSpriteSheetMode(token)) return;

  const config = getSpriteSheetConfig(token);
  const src = String(config?.src ?? "").trim();
  if (!src) return;

  const facing = Object.hasOwn(CELL_BY_DIRECTION, direction)
    ? direction
    : getSpriteSheetFacing(token);
  const requestKey = `${src}|${facing}`;
  tokenRequests.set(token.id, requestKey);

  try {
    const frame = await getFrame(src, facing);
    if (tokenRequests.get(token.id) !== requestKey) return;
    if (!token.mesh || token.destroyed || !isSpriteSheetMode(token)) return;

    const latestConfig = getSpriteSheetConfig(token);
    if (String(latestConfig?.src ?? "").trim() !== src) return;

    if (!tokenStates.has(token.id)) {
      tokenStates.set(token.id, {
        originalTexture: token.mesh.texture,
        originalScale: { x: token.mesh.scale.x, y: token.mesh.scale.y },
      });
    }

    if (token.mesh.texture !== frame) token.mesh.texture = frame;
    resizeMesh(token, frame, latestConfig);
  } catch (error) {
    console.warn(
      `8bit-movement: failed to apply sprite sheet frame for ${src}.`,
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
