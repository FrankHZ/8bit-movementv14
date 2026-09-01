import { numberOr } from "./config.js";

const ISOMETRIC_MODULE_ID = "isometric-perspective";

/**
 * Test whether another active module is currently projecting this Token as an
 * upright object in an isometric Scene.
 */
export function isIsometricToken(token, gameInstance = globalThis.game) {
  try {
    if (!gameInstance?.modules?.get?.(ISOMETRIC_MODULE_ID)?.active) return false;
    if (
      !gameInstance.settings?.get?.(
        ISOMETRIC_MODULE_ID,
        "worldIsometricFlag",
      )
    ) {
      return false;
    }

    const document = token?.document ?? token;
    const scene = token?.scene ?? document?.parent;
    if (!scene?.getFlag?.(ISOMETRIC_MODULE_ID, "isometricEnabled")) {
      return false;
    }

    return !document?.getFlag?.(ISOMETRIC_MODULE_ID, "isoTokenDisabled");
  } catch {
    return false;
  }
}

function resizeStandardMesh(token, frame, config) {
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

/**
 * Install a cropped sprite-sheet frame on a Token.
 *
 * Foundry keeps the loaded Token texture on both `token.texture` and
 * `token.mesh.texture`. Keeping them aligned lets other render modules inspect
 * the cropped frame's real aspect ratio. Isometric Perspective owns mesh size
 * and placement for projected Tokens, so request a normal mesh refresh instead
 * of overwriting its transformation.
 */
export function applySpriteSheetFrame(token, frame, config = {}) {
  const textureChanged =
    token.texture !== frame || token.mesh.texture !== frame;

  token.texture = frame;
  if (token.mesh.texture !== frame) token.mesh.texture = frame;

  if (isIsometricToken(token)) {
    if (textureChanged) token.renderFlags?.set?.({ refreshMesh: true });
    return "isometric";
  }

  resizeStandardMesh(token, frame, config);
  return "standard";
}

/** Restore the Token's loaded and displayed texture. */
export function restoreSpriteSheetFrame(token, texture) {
  if (texture) {
    token.texture = texture;
    token.mesh.texture = texture;
  }

  if (isIsometricToken(token)) {
    token.renderFlags?.set?.({ refreshMesh: true });
    return "isometric";
  }

  return "standard";
}
