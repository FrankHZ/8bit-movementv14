import {
  DIRECTIONAL_IMAGE_MODE,
  getIsometricPerspectiveMode,
  getTokenDiagonalMode,
  mapCanvasDirectionToSource,
  MODULE_NAME,
  SPRITE_SHEET_MODE,
} from "./constants.js";
import {
  applyDirectionalImage,
  getDirectionalFacing,
  preloadDirectionalImages,
  stageDirectionalFacing,
} from "./directional-images.js";
import {
  applySpriteSheetDirection,
  cardinalizeSpriteSheetDirection,
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
  const imagePath = token.document.texture.src.substring(
    token.document.texture.src.lastIndexOf("/") + 1,
    token.document.texture.src.lastIndexOf("."),
  );
  let directions = [
    "up",
    "down",
    "left",
    "right",
    "UP",
    "DOWN",
    "LEFT",
    "RIGHT",
  ];
  const hasDirection = directions.find((d) => imagePath.includes(d));
  const matchedDirectionIndex = directions.indexOf(hasDirection);
  const isLowerCase = matchedDirectionIndex < 4;
  const initialFacing = hasExistingConfig
    ? getDirectionalFacing(token.document)
    : ["up", "down", "left", "right"][matchedDirectionIndex % 4] ?? "down";
  directions = isLowerCase
    ? directions
    : directions.map((d) => d.toUpperCase());
  if (diagonalMode)
    directions = directions.concat(
      isLowerCase ? ["ul", "ur", "dl", "dr"] : ["UL", "UR", "DL", "DR"],
    );
  const sourceFor = (index) =>
    hasDirection ? textureSrc.replace(hasDirection, directions[index]) : textureSrc;
  const update = {
    [`flags.${MODULE_NAME}.up`]: sourceFor(0),
    [`flags.${MODULE_NAME}.down`]: sourceFor(1),
    [`flags.${MODULE_NAME}.left`]: sourceFor(2),
    [`flags.${MODULE_NAME}.right`]: sourceFor(3),
    [`flags.${MODULE_NAME}.mode`]: DIRECTIONAL_IMAGE_MODE,
    [`flags.${MODULE_NAME}.diagonalMode`]: diagonalMode,
    [`flags.${MODULE_NAME}.facing`]: initialFacing,
    [`flags.${MODULE_NAME}.-=spriteSheet`]: null,
    [`flags.${MODULE_NAME}.-=__nextTexture`]: null,
    lockRotation: true,
    rotation: 1,
  };
  if (diagonalMode) {
    update[`flags.${MODULE_NAME}.UL`] = sourceFor(8);
    update[`flags.${MODULE_NAME}.UR`] = sourceFor(9);
    update[`flags.${MODULE_NAME}.DL`] = sourceFor(10);
    update[`flags.${MODULE_NAME}.DR`] = sourceFor(11);
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
  if (dx === 0 && dy === 0) return "";

  if (eightWay && dx !== 0 && dy !== 0) {
    if (dx < 0 && dy < 0) return "up-left";
    if (dx > 0 && dy < 0) return "up-right";
    if (dx < 0 && dy > 0) return "down-left";
    return "down-right";
  }

  if (dy < 0) return "up";
  if (dy > 0) return "down";
  return dx < 0 ? "left" : "right";
}

export function resolveMovementFacing(
  token,
  change,
  diagonalMode = false,
  isometric = false,
) {
  const direction = movementDirection(
    token,
    change,
    diagonalMode || isometric,
  );
  const projected = mapCanvasDirectionToSource(direction, isometric);
  return diagonalMode
    ? normalizeSpriteSheetDirection(projected)
    : cardinalizeSpriteSheetDirection(projected);
}

function rotationDirection(rotation, eightWay) {
  const normalized = ((Number(rotation) % 360) + 360) % 360;
  if (eightWay) {
    const directions = [
      "down",
      "down-left",
      "left",
      "up-left",
      "up",
      "up-right",
      "right",
      "down-right",
    ];
    return directions[Math.round(normalized / 45) % directions.length];
  }

  const directions = ["down", "left", "up", "right"];
  return directions[Math.round(normalized / 90) % directions.length];
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
      const direction = mapCanvasDirectionToSource(
        rotationDirection(change.rotation, diagonalMode),
        isometric,
      );
      if (spriteSheetMode) setSpriteSheetFacing(token, change, direction);
      else setDirectionalTexture(token, change, direction);
    }
  });
}
