import {
  getTokenDiagonalMode,
  MODULE_NAME,
  SPRITE_SHEET_MODE,
} from "./constants.js";
import {
  cardinalizeSpriteSheetDirection,
  normalizeSpriteSheetDirection,
  SPRITE_SHEET_DIRECTIONS,
} from "./sprite-sheet/config.js";

export const IMAGE_FLAG_BY_DIRECTION = Object.freeze({
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  "up-left": "UL",
  "up-right": "UR",
  "down-left": "DL",
  "down-right": "DR",
});

const DIRECTION_KEYS = new Set(
  SPRITE_SHEET_DIRECTIONS.map((direction) => direction.key),
);
const texturePromises = new Map();
const tokenRequests = new Map();
const tokenPreloadSignatures = new Map();
let hooksRegistered = false;

function getTokenDocument(tokenOrDocument) {
  return tokenOrDocument?.document ?? tokenOrDocument ?? null;
}

function hasMovementFlags(tokenOrDocument) {
  const document = getTokenDocument(tokenOrDocument);
  return Object.hasOwn(document?.flags ?? {}, MODULE_NAME);
}

export function isDirectionalImageMode(tokenOrDocument) {
  const document = getTokenDocument(tokenOrDocument);
  return (
    hasMovementFlags(document) &&
    document?.getFlag?.(MODULE_NAME, "mode") !== SPRITE_SHEET_MODE
  );
}

function configuredImage(document, direction) {
  const flag = IMAGE_FLAG_BY_DIRECTION[direction];
  return flag ? String(document?.getFlag?.(MODULE_NAME, flag) ?? "").trim() : "";
}

export function getDirectionalImage(tokenOrDocument, direction) {
  const document = getTokenDocument(tokenOrDocument);
  const facing = normalizeSpriteSheetDirection(direction);
  const configured = configuredImage(document, facing);
  if (configured) return configured;
  if (facing.startsWith("up-")) return configuredImage(document, "up");
  if (facing.startsWith("down-")) return configuredImage(document, "down");
  return "";
}

function deriveFacingFromTexture(document) {
  const current = String(document?.texture?.src ?? "").trim();
  if (!current) return "down";

  for (const direction of SPRITE_SHEET_DIRECTIONS) {
    if (configuredImage(document, direction.key) === current) {
      return direction.key;
    }
  }
  return "down";
}

export function getDirectionalFacing(tokenOrDocument) {
  const document = getTokenDocument(tokenOrDocument);
  const stored = document?.getFlag?.(MODULE_NAME, "facing");
  const facing = DIRECTION_KEYS.has(stored)
    ? stored
    : deriveFacingFromTexture(document);
  return getTokenDiagonalMode(document)
    ? facing
    : cardinalizeSpriteSheetDirection(facing);
}

export function stageDirectionalFacing(tokenOrDocument, change, direction) {
  const document = getTokenDocument(tokenOrDocument);
  if (!document || !change || !direction) return null;

  const facing = getTokenDiagonalMode(document)
    ? normalizeSpriteSheetDirection(direction)
    : cardinalizeSpriteSheetDirection(direction);
  const src = getDirectionalImage(document, facing);
  if (!src) return null;

  if (facing !== getDirectionalFacing(document)) {
    change.flags ??= {};
    change.flags[MODULE_NAME] ??= {};
    change.flags[MODULE_NAME].facing = facing;
  }
  return facing;
}

function getTextureLoader() {
  return globalThis.foundry?.canvas?.loadTexture ?? globalThis.loadTexture;
}

async function loadDirectionalTexture(src) {
  if (!texturePromises.has(src)) {
    const loader = getTextureLoader();
    if (typeof loader !== "function") {
      throw new Error("Foundry texture loader is unavailable.");
    }
    texturePromises.set(
      src,
      Promise.resolve(loader(src)).then((texture) => {
        if (!texture) throw new Error(`Unable to load directional texture: ${src}`);
        return texture;
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

function forceOpaque(token) {
  token.alpha = 1;
  if (token.icon) token.icon.alpha = 1;
  if (token.mesh) token.mesh.alpha = 1;
}

export function applyDirectionalTexture(token, texture) {
  if (!token?.mesh || !texture) return false;
  const changed = token.texture !== texture || token.mesh.texture !== texture;
  token.texture = texture;
  if (token.mesh.texture !== texture) token.mesh.texture = texture;
  if (changed) token.renderFlags?.set?.({ refreshMesh: true });
  forceOpaque(token);
  return changed;
}

export async function applyDirectionalImage(token, direction) {
  if (!token?.mesh || token.destroyed || !isDirectionalImageMode(token)) return;

  const facing = getTokenDiagonalMode(token)
    ? normalizeSpriteSheetDirection(direction)
    : cardinalizeSpriteSheetDirection(direction);
  const src = getDirectionalImage(token, facing);
  if (!src) return;

  const request = `${facing}|${src}`;
  tokenRequests.set(token.id, request);
  try {
    const texture = await loadDirectionalTexture(src);
    if (tokenRequests.get(token.id) !== request) return;
    if (!token.mesh || token.destroyed || !isDirectionalImageMode(token)) return;
    if (getDirectionalImage(token, facing) !== src) return;
    applyDirectionalTexture(token, texture);
  } catch (error) {
    console.warn(
      `8bit-movement: failed to apply directional texture ${src}.`,
      error,
    );
  }
}

export async function preloadDirectionalImages(tokenOrDocument) {
  const sources = new Set();
  for (const direction of SPRITE_SHEET_DIRECTIONS) {
    const src = getDirectionalImage(tokenOrDocument, direction.key);
    if (src) sources.add(src);
  }
  await Promise.allSettled([...sources].map(loadDirectionalTexture));
}

function preloadCurrentImages(token) {
  const sources = SPRITE_SHEET_DIRECTIONS.map((direction) =>
    getDirectionalImage(token, direction.key),
  )
    .filter(Boolean)
    .sort();
  const signature = sources.join("|");
  if (tokenPreloadSignatures.get(token.id) === signature) return;
  tokenPreloadSignatures.set(token.id, signature);
  void preloadDirectionalImages(token);
}

async function restoreDocumentTexture(token) {
  const src = String(token?.document?.texture?.src ?? "").trim();
  if (!token?.mesh || !src) return;

  const request = `restore|${src}`;
  tokenRequests.set(token.id, request);
  try {
    const texture = await loadDirectionalTexture(src);
    if (tokenRequests.get(token.id) !== request) return;
    if (!token.mesh || token.destroyed || hasMovementFlags(token)) return;
    applyDirectionalTexture(token, texture);
  } catch (error) {
    console.warn(
      `8bit-movement: failed to restore Token texture ${src}.`,
      error,
    );
  }
}

function applyCurrentDirection(token) {
  if (!isDirectionalImageMode(token)) return;
  preloadCurrentImages(token);
  void applyDirectionalImage(token, getDirectionalFacing(token));
}

function forgetToken(tokenId) {
  tokenRequests.delete(tokenId);
  tokenPreloadSignatures.delete(tokenId);
}

export function clearDirectionalImageCache() {
  texturePromises.clear();
  tokenRequests.clear();
  tokenPreloadSignatures.clear();
}

export function registerDirectionalImageHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;

  Hooks.on("canvasReady", () => {
    for (const token of canvas.tokens.placeables) applyCurrentDirection(token);
  });

  Hooks.on("drawToken", applyCurrentDirection);
  Hooks.on("createToken", (document) => {
    setTimeout(() => {
      const token = canvas?.tokens?.get(document.id);
      if (token) applyCurrentDirection(token);
    }, 0);
  });
  Hooks.on("refreshToken", applyCurrentDirection);
  Hooks.on("updateToken", (document) => {
    const token = canvas?.tokens?.get(document.id);
    if (!token) return;
    if (isDirectionalImageMode(document)) applyCurrentDirection(token);
    else if (!hasMovementFlags(document)) void restoreDocumentTexture(token);
    else forgetToken(document.id);
  });
  Hooks.on("deleteToken", (document) => forgetToken(document.id));
  Hooks.on("canvasTearDown", clearDirectionalImageCache);
}
