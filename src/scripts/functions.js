import {
  DIRECTIONAL_IMAGE_MODE,
  MODULE_NAME,
  SPRITE_SHEET_MODE,
} from "./constants.js";
import {
  applySpriteSheetDirection,
  getSpriteSheetFacing,
  isSpriteSheetMode,
} from "./sprite-sheet.js";

export { MODULE_NAME };

const __8bitPersistTimers = new Map();

const IMAGE_FLAG_BY_DIRECTION = Object.freeze({
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  "up-left": "UL",
  "up-right": "UR",
  "down-left": "DL",
  "down-right": "DR",
});

function __8bit_forceOpaque(placeable) {
  try {
    if (!placeable) return;
    placeable.alpha = 1;
    if (placeable.icon) placeable.icon.alpha = 1;
    if (placeable.mesh) placeable.mesh.alpha = 1;
  } catch (e) {
    console.warn("8bit-movement: forceOpaque failed", e);
  }
}

/** Preview a texture on the canvas token without writing to the Token document. */
function __8bit_previewMesh(tokenId, src) {
  try {
    const pl = canvas?.tokens?.get(tokenId);
    if (!pl || !src) return;
    const tex =
      typeof PIXI !== "undefined" && PIXI.Texture
        ? PIXI.Texture.from(src)
        : null;
    if (!tex) return;
    if (pl.mesh) pl.mesh.texture = tex;
    else if (pl.icon) pl.icon.texture = tex;
    __8bit_forceOpaque(pl);
  } catch {
    // Preview failures are non-fatal; the persisted document update still runs.
  }
}

/**
 * Initialize directional image flags from the token's current texture.
 * If the filename contains a direction tag, sibling texture paths are inferred.
 * @param {string} tokenId Token ID to configure.
 */
export async function initializeMovement(tokenId) {
  const diagonalMode = game.settings.get(MODULE_NAME, "diagonalMode");
  const token = canvas.tokens.get(tokenId);
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
  const isLowerCase = directions.indexOf(hasDirection) < 4;
  directions = isLowerCase
    ? directions
    : directions.map((d) => d.toUpperCase());
  if (diagonalMode)
    directions = directions.concat(
      isLowerCase ? ["ul", "ur", "dl", "dr"] : ["UL", "UR", "DL", "DR"],
    );
  if (!hasDirection) {
    await token.document.setFlag(MODULE_NAME, "up", token.document.texture.src);
    await token.document.setFlag(
      MODULE_NAME,
      "down",
      token.document.texture.src,
    );
    await token.document.setFlag(
      MODULE_NAME,
      "left",
      token.document.texture.src,
    );
    await token.document.setFlag(
      MODULE_NAME,
      "right",
      token.document.texture.src,
    );
    if (diagonalMode) {
      await token.document.setFlag(
        MODULE_NAME,
        "UL",
        token.document.texture.src,
      );
      await token.document.setFlag(
        MODULE_NAME,
        "UR",
        token.document.texture.src,
      );
      await token.document.setFlag(
        MODULE_NAME,
        "DL",
        token.document.texture.src,
      );
      await token.document.setFlag(
        MODULE_NAME,
        "DR",
        token.document.texture.src,
      );
    }
  } else {
    await token.document.setFlag(
      MODULE_NAME,
      "up",
      token.document.texture.src.replace(hasDirection, directions[0]),
    );
    await token.document.setFlag(
      MODULE_NAME,
      "down",
      token.document.texture.src.replace(hasDirection, directions[1]),
    );
    await token.document.setFlag(
      MODULE_NAME,
      "left",
      token.document.texture.src.replace(hasDirection, directions[2]),
    );
    await token.document.setFlag(
      MODULE_NAME,
      "right",
      token.document.texture.src.replace(hasDirection, directions[3]),
    );
    if (diagonalMode) {
      await token.document.setFlag(
        MODULE_NAME,
        "UL",
        token.document.texture.src.replace(hasDirection, directions[8]),
      );
      await token.document.setFlag(
        MODULE_NAME,
        "UR",
        token.document.texture.src.replace(hasDirection, directions[9]),
      );
      await token.document.setFlag(
        MODULE_NAME,
        "DL",
        token.document.texture.src.replace(hasDirection, directions[10]),
      );
      await token.document.setFlag(
        MODULE_NAME,
        "DR",
        token.document.texture.src.replace(hasDirection, directions[11]),
      );
    }
  }

  await token.document.update({
    [`flags.${MODULE_NAME}.mode`]: DIRECTIONAL_IMAGE_MODE,
    [`flags.${MODULE_NAME}.-=spriteSheet`]: null,
    lockRotation: true,
    rotation: 1,
  });
}

/**
 * Configure a token to use a fixed 3x3, eight-direction sprite sheet.
 * @param {string} tokenId Token ID to configure.
 * @param {string} src Sprite sheet image path.
 */
export async function initializeSpriteSheet(tokenId, src) {
  const token = canvas.tokens.get(tokenId);
  const image = String(src ?? "").trim();
  if (!token || !image) return;

  const current = token.document.getFlag(MODULE_NAME, "spriteSheet") ?? {};
  const spriteSheet = {
    src: image,
    facing: current.facing || "down",
    scale: Number.isFinite(Number(current.scale)) ? Number(current.scale) : 1,
    offsetX: Number.isFinite(Number(current.offsetX))
      ? Number(current.offsetX)
      : 0,
    offsetY: Number.isFinite(Number(current.offsetY))
      ? Number(current.offsetY)
      : 0,
  };

  await token.document.update({
    [`flags.${MODULE_NAME}.mode`]: SPRITE_SHEET_MODE,
    [`flags.${MODULE_NAME}.spriteSheet`]: spriteSheet,
    [`flags.${MODULE_NAME}.-=__nextTexture`]: null,
    lockRotation: true,
  });
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
      await token.document.setFlag(MODULE_NAME, direction, path);
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
  if (!direction || direction === getSpriteSheetFacing(token)) {
    void applySpriteSheetDirection(canvas?.tokens?.get(token.id), direction);
    return;
  }
  foundry.utils.setProperty(
    change,
    `flags.${MODULE_NAME}.spriteSheet.facing`,
    direction,
  );
  void applySpriteSheetDirection(canvas?.tokens?.get(token.id), direction);
}

function setDirectionalTexture(token, change, direction) {
  const flag = IMAGE_FLAG_BY_DIRECTION[direction];
  const src = flag ? token.getFlag(MODULE_NAME, flag) : null;
  if (!src || token.texture.src === src) return;

  foundry.utils.setProperty(
    change,
    `flags.${MODULE_NAME}.__nextTexture`,
    src,
  );
  __8bit_previewMesh(token.id, src);
}

/**
 * Register token update listeners that preview and persist directional textures.
 */
export async function addListener() {
  Hooks.on("refreshToken", (pl) => {
    try {
      if (isSpriteSheetMode(pl)) return;
      const next = pl?.document?.getFlag(MODULE_NAME, "__nextTexture");
      if (next) __8bit_previewMesh(pl.id, next);
    } catch {}
  });
  const diagonalMode = game.settings.get(MODULE_NAME, "diagonalMode");
  Hooks.on("preUpdateToken", function changeImage(token, change) {
    if (!token.flags[MODULE_NAME]) return;
    const spriteSheetMode = isSpriteSheetMode(token);
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
      if (!spriteSheetMode && diagonalMode) {
        if (
          !token.getFlag(MODULE_NAME, "UL") &&
          !token.getFlag(MODULE_NAME, "UR") &&
          !token.getFlag(MODULE_NAME, "DL") &&
          !token.getFlag(MODULE_NAME, "DR")
        ) {
          if (!game.settings.get(MODULE_NAME, "warnings"))
            ui.notifications.warn(
              game.i18n.localize("8BITMOVEMENT.Warn.No_Images_Diagonal"),
            );
          return;
        }
      }

      const direction = movementDirection(
        token,
        change,
        spriteSheetMode || diagonalMode,
      );
      if (spriteSheetMode) setSpriteSheetFacing(token, change, direction);
      else setDirectionalTexture(token, change, direction);
    } else if (rotation) {
      const direction = rotationDirection(change.rotation, spriteSheetMode);
      if (spriteSheetMode) setSpriteSheetFacing(token, change, direction);
      else setDirectionalTexture(token, change, direction);
    }
  });
}

// Persist previewed textures after movement begins so animated token movement stays smooth.
Hooks.on("updateToken", async (doc, changes) => {
  try {
    const token = canvas?.tokens?.get(doc.id);
    if (!token) return;
    if (isSpriteSheetMode(doc)) return;

    // Transient flag set by preUpdateToken.
    const next =
      (changes?.flags &&
        changes.flags[MODULE_NAME] &&
        changes.flags[MODULE_NAME].__nextTexture) ||
      doc.getFlag(MODULE_NAME, "__nextTexture");

    // Debounce persistence until movement settles to avoid jumps on drawn paths.
    if (next || "x" in changes || "y" in changes) {
      const prev = __8bitPersistTimers.get(doc.id);
      if (prev) clearTimeout(prev);
      const handle = setTimeout(async () => {
        try {
          const pending = doc.getFlag(MODULE_NAME, "__nextTexture");
          if (pending) {
            await doc.update(
              {
                "texture.src": pending,
                [`flags.${MODULE_NAME}.-=__nextTexture`]: null,
              },
              { animate: false },
            );
          }
          const tk = canvas?.tokens?.get(doc.id);
          if (tk) {
            const kicks = [0, 48, 120, 240];
            for (const t of kicks) setTimeout(() => __8bit_forceOpaque(tk), t);
          }
        } catch {}
        __8bitPersistTimers.delete(doc.id);
      }, 800);
      __8bitPersistTimers.set(doc.id, handle);
    }

    // Keep opacity solid during movement and texture swaps.
    const movedNow = "x" in changes || "y" in changes;
    const swapped = !!next || (changes?.texture && "src" in changes.texture);
    if (movedNow || swapped) {
      const kicks = [0, 48, 120, 240];
      for (const t of kicks) setTimeout(() => __8bit_forceOpaque(token), t);
    }
  } catch (e) {
    console.warn("8bit-movement: post-update handler failed", e);
  }
});
