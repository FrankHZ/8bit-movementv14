import {
  MODULE_NAME,
  initializeSpriteSheet,
} from "../functions.js";
import {
  DIRECTIONAL_IMAGE_MODE,
  getTokenDiagonalMode,
  SPRITE_SHEET_MODE,
} from "../constants.js";
import {
  CARDINAL_DIRECTIONS,
  DIAGONAL_DIRECTIONS,
} from "../directions.js";
import { withSpriteSheetDefaults } from "../sprite-sheet.js";

export { CARDINAL_DIRECTIONS, DIAGONAL_DIRECTIONS };

export function localize(key) {
  return game.i18n.format(key);
}

export function getHtmlElement(application, fallbackElement) {
  const element = fallbackElement ?? application?.element;
  if (!element) return null;
  if (element instanceof HTMLElement) return element;
  if (globalThis.jQuery && element instanceof globalThis.jQuery) {
    return element[0] ?? null;
  }
  return element?.[0] ?? null;
}

export function hasMovementFlags(tokenDocument) {
  return Object.hasOwn(tokenDocument.flags ?? {}, MODULE_NAME);
}

export function getMovementMode(tokenDocument) {
  return tokenDocument.getFlag(MODULE_NAME, "mode") === SPRITE_SHEET_MODE
    ? SPRITE_SHEET_MODE
    : DIRECTIONAL_IMAGE_MODE;
}

export function getSpriteSheetConfig(tokenDocument) {
  return withSpriteSheetDefaults(
    tokenDocument.getFlag(MODULE_NAME, "spriteSheet") ?? {},
  );
}

export function getDirectionalImages(tokenDocument, fallbackImage) {
  const images = {};
  for (const direction of CARDINAL_DIRECTIONS) {
    images[direction.key] =
      tokenDocument.getFlag(MODULE_NAME, direction.imageFlag) || fallbackImage;
  }
  for (const direction of DIAGONAL_DIRECTIONS) {
    const verticalFallback = direction.key.startsWith("up-")
      ? images.up
      : images.down;
    images[direction.key] =
      tokenDocument.getFlag(MODULE_NAME, direction.imageFlag) || verticalFallback;
  }
  return images;
}

export { getTokenDiagonalMode };

export function setSheetPosition(sheet) {
  if (typeof sheet.setPosition === "function") sheet.setPosition();
}

export async function clearTokenSettings(
  tokenDocument,
  image,
  { render = true } = {},
) {
  await tokenDocument.update(
    {
      [`flags.-=${MODULE_NAME}`]: null,
      "texture.src": image,
      lockRotation: false,
      rotation: 0,
    },
    { render },
  );
}

export async function clearAllSettings(
  tokenDocument,
  image,
  { render = true } = {},
) {
  const actor = tokenDocument.actor?.id
    ? game.actors.get(tokenDocument.actor.id)
    : null;
  if (actor) {
    await actor.update(
      {
        [`prototypeToken.flags.-=${MODULE_NAME}`]: null,
        "prototypeToken.texture.src": image,
        "prototypeToken.lockRotation": false,
      },
      { render },
    );
  }
  await clearTokenSettings(tokenDocument, image, { render });
}

export async function savePrototypeSettings(
  tokenDocument,
  images,
  { render = true } = {},
) {
  const movementFlags = foundry.utils.deepClone(
    tokenDocument.flags?.[MODULE_NAME] ?? {},
  );
  movementFlags.set = true;
  delete movementFlags.__nextTexture;
  const textureSrc =
    getMovementMode(tokenDocument) === SPRITE_SHEET_MODE
      ? tokenDocument.texture.src
      : images.down;

  await game.actors.get(tokenDocument.actor.id).update(
    {
      [`prototypeToken.flags.${MODULE_NAME}`]: movementFlags,
      "prototypeToken.texture.src": textureSrc,
      "prototypeToken.lockRotation": true,
    },
    { render },
  );

  await tokenDocument.update(
    { [`flags.${MODULE_NAME}.set`]: true },
    { render },
  );
}

export async function browseSpriteSheet(tokenDocument, onSelected) {
  const picker = new FilePicker({
    type: "image",
    current: getSpriteSheetConfig(tokenDocument).src || "",
    callback: async (path) => {
      await initializeSpriteSheet(tokenDocument.id, path, { render: false });
      await onSelected?.(path);
    },
  });
  picker.browse();
}
