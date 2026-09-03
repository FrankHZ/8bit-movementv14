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
const tokenVideoTexturePromises = new Map();
const activeTokenVideos = new Map();
let hooksRegistered = false;

const VIDEO_SOURCE_PATTERN = /\.(?:m4v|mp4|ogv|webm)(?:[?#].*)?$/i;

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

function getVideoHelper() {
  return globalThis.game?.video;
}

export function isVideoSource(src) {
  return VIDEO_SOURCE_PATTERN.test(String(src ?? "").trim());
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

function getVideoSource(texture) {
  return getVideoHelper()?.getVideoSource?.(texture) ?? null;
}

function removePendingVideo(videoHelper, video) {
  if (!(videoHelper?.pending instanceof Set)) return;
  for (const pending of videoHelper.pending) {
    if (pending?.[0] === video) videoHelper.pending.delete(pending);
  }
}

function stopVideoTexture(texture) {
  const videoHelper = getVideoHelper();
  const video = videoHelper?.getVideoSource?.(texture);
  if (!video) return;
  removePendingVideo(videoHelper, video);
  try {
    videoHelper.stop?.(video);
  } catch {}
}

function destroyVideoTexture(texture) {
  stopVideoTexture(texture);
  try {
    texture?.baseTexture?.destroy?.();
  } catch {}
}

function isUsableVideoTexture(texture) {
  return (
    !!texture &&
    !texture.destroyed &&
    !texture.baseTexture?.destroyed &&
    texture.valid !== false
  );
}

function deactivateTokenVideo(tokenId) {
  const active = activeTokenVideos.get(tokenId);
  if (!active) return;
  activeTokenVideos.delete(tokenId);
  stopVideoTexture(active.texture);
}

function activateTokenVideo(tokenId, src, texture) {
  const active = activeTokenVideos.get(tokenId);
  if (active?.src === src && active.texture === texture) return;
  deactivateTokenVideo(tokenId);

  const videoHelper = getVideoHelper();
  const video = videoHelper?.getVideoSource?.(texture);
  if (!video) return;
  activeTokenVideos.set(tokenId, { src, texture });
  try {
    const playback = videoHelper.play(video, {
      volume: 0,
      loop: true,
      offset: 0,
    });
    playback?.catch?.((error) => {
      console.warn(`8bit-movement: failed to play directional video ${src}.`, error);
    });
  } catch (error) {
    console.warn(`8bit-movement: failed to play directional video ${src}.`, error);
  }
}

async function getTokenVideoTexture(tokenId, src, sourceTexture) {
  const videoHelper = getVideoHelper();
  const sourceVideo = videoHelper?.getVideoSource?.(sourceTexture);
  if (!sourceVideo || typeof videoHelper.cloneTexture !== "function") {
    return sourceTexture;
  }

  let videos = tokenVideoTexturePromises.get(tokenId);
  if (!videos) {
    videos = new Map();
    tokenVideoTexturePromises.set(tokenId, videos);
  }
  if (!videos.has(src)) {
    videos.set(
      src,
      Promise.resolve(videoHelper.cloneTexture(sourceVideo)).then((texture) => {
        if (
          !isUsableVideoTexture(texture) ||
          !videoHelper.getVideoSource?.(texture)
        ) {
          destroyVideoTexture(texture);
          throw new Error(`Unable to clone directional video: ${src}`);
        }
        return texture;
      }),
    );
  }

  try {
    const texture = await videos.get(src);
    if (isUsableVideoTexture(texture)) return texture;
    videos.delete(src);
    destroyVideoTexture(texture);
    return getTokenVideoTexture(tokenId, src, sourceTexture);
  } catch (error) {
    videos.delete(src);
    if (!videos.size) tokenVideoTexturePromises.delete(tokenId);
    throw error;
  }
}

async function prepareTokenTexture(token, src, texture) {
  if (!getVideoSource(texture)) return texture;
  return getTokenVideoTexture(token.id, src, texture);
}

function installTokenTexture(token, src, texture) {
  const changed = applyDirectionalTexture(token, texture);
  if (getVideoSource(texture)) activateTokenVideo(token.id, src, texture);
  else deactivateTokenVideo(token.id);
  return changed;
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
    const loadedTexture = await loadDirectionalTexture(src);
    if (tokenRequests.get(token.id) !== request) return;
    if (!token.mesh || token.destroyed || !isDirectionalImageMode(token)) return;
    if (getDirectionalImage(token, facing) !== src) return;
    const texture = await prepareTokenTexture(token, src, loadedTexture);
    if (tokenRequests.get(token.id) !== request) return;
    if (!token.mesh || token.destroyed || !isDirectionalImageMode(token)) return;
    if (getDirectionalImage(token, facing) !== src) return;
    installTokenTexture(token, src, texture);
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
    const loadedTexture = await loadDirectionalTexture(src);
    if (tokenRequests.get(token.id) !== request) return;
    if (!token.mesh || token.destroyed || hasMovementFlags(token)) return;
    const texture = await prepareTokenTexture(token, src, loadedTexture);
    if (tokenRequests.get(token.id) !== request) return;
    if (!token.mesh || token.destroyed || hasMovementFlags(token)) return;
    installTokenTexture(token, src, texture);
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

function destroyTokenVideos(tokenId) {
  deactivateTokenVideo(tokenId);
  const videos = tokenVideoTexturePromises.get(tokenId);
  tokenVideoTexturePromises.delete(tokenId);
  if (!videos) return;
  for (const texturePromise of videos.values()) {
    void Promise.resolve(texturePromise).then(destroyVideoTexture, () => {});
  }
}

function forgetToken(tokenId, { destroyVideos = false } = {}) {
  tokenRequests.delete(tokenId);
  tokenPreloadSignatures.delete(tokenId);
  if (destroyVideos) destroyTokenVideos(tokenId);
  else deactivateTokenVideo(tokenId);
}

export function clearDirectionalImageCache() {
  for (const tokenId of tokenVideoTexturePromises.keys()) {
    destroyTokenVideos(tokenId);
  }
  texturePromises.clear();
  tokenRequests.clear();
  tokenPreloadSignatures.clear();
  activeTokenVideos.clear();
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
  Hooks.on("deleteToken", (document) =>
    forgetToken(document.id, { destroyVideos: true }),
  );
  Hooks.on("canvasTearDown", clearDirectionalImageCache);
}
