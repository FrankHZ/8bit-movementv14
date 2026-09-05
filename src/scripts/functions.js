import {
  DIRECTIONAL_IMAGE_MODE,
  getIsometricPerspectiveMode,
  getTokenDiagonalMode,
  MODULE_NAME,
  SPRITE_SHEET_MODE,
} from "./constants.js";
import {
  CARDINAL_DIRECTIONS,
  DIAGONAL_DIRECTIONS,
  directionFromDelta,
  directionFromRotation,
  inferDirectionalImageSources,
  resolveFacingDirection,
} from "./directions.js";
import {
  applyDirectionalImage,
  getDirectionalFacing,
  preloadDirectionalImages,
  stageDirectionalFacing,
} from "./directional-images.js";
import {
  applySpriteSheetDirection,
  getSpriteSheetFacing,
  isSpriteSheetMode,
  normalizeSpriteSheetDirection,
  withSpriteSheetDefaults,
} from "./sprite-sheet.js";

export { MODULE_NAME };

/**
 * Initialize directional image flags from the token's current texture.
 * If the filename contains a direction tag, sibling texture paths are inferred.
 * @param {string} tokenId Token ID to configure.
 * @param {object} [options]
 * @param {boolean} [options.render=true] Re-render applications bound to the Token.
 */
export async function initializeMovement(tokenId, { render = true } = {}) {
  const token = canvas.tokens.get(tokenId);
  if (!token) return;
  const hasExistingConfig = Object.hasOwn(
    token.document.flags ?? {},
    MODULE_NAME,
  );
  const diagonalMode = hasExistingConfig
    ? getTokenDiagonalMode(token)
    : false;
  const textureSrc = token.document.texture.src;
  const inferred = inferDirectionalImageSources(textureSrc, diagonalMode);
  const initialFacing = hasExistingConfig
    ? getDirectionalFacing(token.document)
    : inferred.facing;
  const update = {
    [`flags.${MODULE_NAME}.mode`]: DIRECTIONAL_IMAGE_MODE,
    [`flags.${MODULE_NAME}.diagonalMode`]: diagonalMode,
    [`flags.${MODULE_NAME}.facing`]: initialFacing,
    [`flags.${MODULE_NAME}.-=spriteSheet`]: null,
    [`flags.${MODULE_NAME}.-=__nextTexture`]: null,
    lockRotation: true,
    rotation: 1,
  };
  for (const direction of CARDINAL_DIRECTIONS) {
    update[`flags.${MODULE_NAME}.${direction.imageFlag}`] =
      inferred.sources[direction.key];
  }
  if (diagonalMode) {
    for (const direction of DIAGONAL_DIRECTIONS) {
      update[`flags.${MODULE_NAME}.${direction.imageFlag}`] =
        inferred.sources[direction.key];
    }
  }
  await token.document.update(update, { render });
  await preloadDirectionalImages(token.document);
  await applyDirectionalImage(token, initialFacing);
}

/**
 * Configure a token to use a row-mapped RPG Maker-style sprite sheet.
 * @param {string} tokenId Token ID to configure.
 * @param {string} src Sprite sheet image path.
 * @param {object} [options]
 * @param {boolean} [options.render=true] Re-render applications bound to the Token.
 */
export async function initializeSpriteSheet(
  tokenId,
  src,
  { render = true } = {},
) {
  const token = canvas.tokens.get(tokenId);
  const image = String(src ?? "").trim();
  if (!token || !image) return;

  const current = withSpriteSheetDefaults(
    token.document.getFlag(MODULE_NAME, "spriteSheet") ?? {},
  );
  const spriteSheet = withSpriteSheetDefaults({
    ...current,
    src: image,
  });
  const hasExistingConfig = Object.hasOwn(
    token.document.flags ?? {},
    MODULE_NAME,
  );
  const diagonalMode = hasExistingConfig
    ? getTokenDiagonalMode(token)
    : false;

  await token.document.update(
    {
      [`flags.${MODULE_NAME}.mode`]: SPRITE_SHEET_MODE,
      [`flags.${MODULE_NAME}.diagonalMode`]: diagonalMode,
      [`flags.${MODULE_NAME}.spriteSheet`]: spriteSheet,
      [`flags.${MODULE_NAME}.-=__nextTexture`]: null,
      lockRotation: true,
    },
    { render },
  );
  await applySpriteSheetDirection(token, spriteSheet.facing);
}

/**
 * Open an image/video picker and save the selected path to a directional flag.
 * @param {string} tokenId Token ID to configure.
 * @param {object} sheet Token HUD or Token Config sheet to re-render.
 * @param {string} direction Directional flag key to update.
 */
export async function imageLoader(tokenId, sheet, direction) {
  const token = canvas.tokens.get(tokenId);
  const pickedFile = await new FilePicker({
    type: "imagevideo",
    callback: async (path) => {
      await token.document.update(
        { [`flags.${MODULE_NAME}.${direction}`]: path },
        { render: false },
      );
      await preloadDirectionalImages(token.document);
      await applyDirectionalImage(token, getDirectionalFacing(token.document));
      sheet.render();
    },
  });
  pickedFile.browse();
}

function movementDirection(token, change, eightWay) {
  const nextX = foundry.utils.hasProperty(change, "x") ? change.x : token.x;
  const nextY = foundry.utils.hasProperty(change, "y") ? change.y : token.y;
  const dx = nextX - token.x;
  const dy = nextY - token.y;
  return directionFromDelta(dx, dy, eightWay);
}

export function resolveMovementFacing(
  token,
  change,
  diagonalMode = false,
  isometric = false,
) {
  const direction = movementDirection(token, change, diagonalMode);
  return resolveFacingDirection(direction, {
    eightWay: diagonalMode,
    isometric,
  });
}

function setSpriteSheetFacing(token, change, direction) {
  if (!direction) return;

  const facing = normalizeSpriteSheetDirection(direction);
  if (facing === getSpriteSheetFacing(token)) {
    void applySpriteSheetDirection(canvas?.tokens?.get(token.id), facing);
    return;
  }
  foundry.utils.setProperty(
    change,
    `flags.${MODULE_NAME}.spriteSheet.facing`,
    facing,
  );
  void applySpriteSheetDirection(canvas?.tokens?.get(token.id), facing);
}

function setDirectionalTexture(token, change, direction) {
  const facing = stageDirectionalFacing(token, change, direction);
  if (facing) {
    void applyDirectionalImage(canvas?.tokens?.get(token.id), facing);
  }
}

/**
 * Register the movement listener that synchronizes facing flags.
 */
export async function addListener() {
  Hooks.on("preUpdateToken", function changeImage(token, change) {
    if (!token.flags[MODULE_NAME]) return;
    const spriteSheetMode = isSpriteSheetMode(token);
    const diagonalMode = getTokenDiagonalMode(token);
    const isometric = getIsometricPerspectiveMode();
    if (
      !spriteSheetMode &&
      !token.getFlag(MODULE_NAME, "up") &&
      !token.getFlag(MODULE_NAME, "down") &&
      !token.getFlag(MODULE_NAME, "right") &&
      !token.getFlag(MODULE_NAME, "left")
    ) {
      if (!game.settings.get(MODULE_NAME, "warnings"))
        ui.notifications.warn(
          game.i18n.localize("8BITMOVEMENT.Warn.No_Images"),
        );
      return;
    }
    const move =
      foundry.utils.hasProperty(change, "x") ||
      foundry.utils.hasProperty(change, "y");
    const rotation = foundry.utils.hasProperty(change, "rotation");
    if (move) {
      const direction = resolveMovementFacing(
        token,
        change,
        diagonalMode,
        isometric,
      );
      if (spriteSheetMode) setSpriteSheetFacing(token, change, direction);
      else setDirectionalTexture(token, change, direction);
    } else if (rotation) {
      const direction = resolveFacingDirection(
        directionFromRotation(change.rotation, diagonalMode),
        { eightWay: diagonalMode, isometric },
      );
      if (spriteSheetMode) setSpriteSheetFacing(token, change, direction);
      else setDirectionalTexture(token, change, direction);
    }
  });
}
