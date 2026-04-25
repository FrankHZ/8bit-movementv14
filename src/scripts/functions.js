//change image titles for tooltips from Foundry API looks nicer.
export const MODULE_NAME = "8bit-movement";
const __8bitPersistTimers = new Map();

// --- 8bit-movement: smooth move + no-fade helpers ---
const __8BIT_SWAP_DELAY_MS = 200; // delay to let movement tween start; adjust to taste

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

async function __8bit_swapAfterMoveNoFade(doc, placeable, src) {
  try {
    if (!doc || !placeable || !src) return;
    if (placeable.texture?.src === src) return;
    await doc.update({ "texture.src": src }, { animate: false });
    const kicks = [0, 16, 48, 96, 160, 240];
    for (const t of kicks) setTimeout(() => __8bit_forceOpaque(placeable), t);
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => __8bit_forceOpaque(placeable));
    }
  } catch (e) {
    console.warn("8bit-movement: swapAfterMoveNoFade failed", e);
  }
}

/** Preview the given src on the on-canvas token (no document write, no refresh). */
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
  } catch (e) {
    /* ignore preview errors */
  }
}

/**
 * Sets up the flags for the image paths when pressing the [+] button on the Token HUD or Token Config.
 * does some string searching to figure out if you used upper case or lower case for the direction tag on your images.
 * @param {string} tokenId | id string of token which is getting its images set.
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
  const isLowerCase = directions.indexOf(hasDirection) < 4 ? true : false;
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

  await token.document.update({ lockRotation: true, rotation: 1 });
}

/**
 * This function opens a file picker with the right limitation on what type of file is possible (images and webM).
 * Sets the path of the file in the appropriate flag on the Token.
 * @param {string} tokenId | id string of the token being moved.
 * @param {object} sheet | sheet is an object passed on via renderTokenHud hook.
 * @param {string} direction | string indicating the direction of the token.
 */
export async function imageLoader(tokenId, sheet, direction) {
  const token = canvas.tokens.get(tokenId);
  let pickedFile = await new FilePicker({
    type: "imagevideo",
    callback: async (path) => {
      await token.document.setFlag(MODULE_NAME, direction, path);
      sheet.render();
    },
  });
  pickedFile.browse();
}

/**
 * This function adds a listener for the keyup event updating the token in motion with WSAD/Arrow keys,
 * maintains a 0 rotation on SHIFT usage for tokens with the right flags.
 */
export async function addListener() {
  Hooks.on("refreshToken", (pl) => {
    try {
      const next = pl?.document?.getFlag(MODULE_NAME, "__nextTexture");
      if (next) __8bit_previewMesh(pl.id, next);
    } catch (_e) {}
  });
  const diagonalMode = game.settings.get(MODULE_NAME, "diagonalMode");
  Hooks.on("preUpdateToken", function changeImage(token, change, options) {
    if (!token.flags[MODULE_NAME]) return;
    if (
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
      let direction = "";
      if (diagonalMode) {
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
        if (token.x === change.x && token.y === change.y) return;
        if (token.x > change.x && token.y === change.y) direction = "left";
        if (token.x < change.x && token.y === change.y) direction = "right";
        if (token.y > change.y && token.x === change.x) direction = "up";
        if (token.y < change.y && token.x === change.x) direction = "down";
        if (token.x > change.x && token.y > change.y) direction = "up-left";
        if (token.x < change.x && token.y > change.y) direction = "up-right";
        if (token.x > change.x && token.y < change.y) direction = "down-left";
        if (token.x < change.x && token.y < change.y) direction = "down-right";
      } else {
        if (token.x > change.x) direction = "left";
        if (token.x < change.x) direction = "right";
        if (token.y > change.y) direction = "up";
        if (token.y < change.y) direction = "down";
      }
      if (direction === "up") {
        if (token.texture.src === token.flags[MODULE_NAME].up) return;
        foundry.utils.setProperty(
          change,
          "flags.8bit-movement.__nextTexture",
          token.flags[MODULE_NAME].up,
        );
        __8bit_previewMesh(token.id, token.flags[MODULE_NAME].up);
      }
      if (direction === "down") {
        if (token.texture.src === token.flags[MODULE_NAME].down) return;
        foundry.utils.setProperty(
          change,
          "flags.8bit-movement.__nextTexture",
          token.flags[MODULE_NAME].down,
        );
        __8bit_previewMesh(token.id, token.flags[MODULE_NAME].down);
      }
      if (direction === "left") {
        if (token.texture.src === token.flags[MODULE_NAME].left) return;
        foundry.utils.setProperty(
          change,
          "flags.8bit-movement.__nextTexture",
          token.flags[MODULE_NAME].left,
        );
        __8bit_previewMesh(token.id, token.flags[MODULE_NAME].left);
      }
      if (direction === "right") {
        if (token.texture.src === token.flags[MODULE_NAME].right) return;
        foundry.utils.setProperty(
          change,
          "flags.8bit-movement.__nextTexture",
          token.flags[MODULE_NAME].right,
        );
        __8bit_previewMesh(token.id, token.flags[MODULE_NAME].right);
      }
      if (direction === "up-left") {
        if (token.texture.src === token.flags[MODULE_NAME].UL) return;
        foundry.utils.setProperty(
          change,
          "flags.8bit-movement.__nextTexture",
          token.flags[MODULE_NAME].UL,
        );
        __8bit_previewMesh(token.id, token.flags[MODULE_NAME].UL);
      }
      if (direction === "up-right") {
        if (token.texture.src === token.flags[MODULE_NAME].UR) return;
        foundry.utils.setProperty(
          change,
          "flags.8bit-movement.__nextTexture",
          token.flags[MODULE_NAME].UR,
        );
        __8bit_previewMesh(token.id, token.flags[MODULE_NAME].UR);
      }
      if (direction === "down-left") {
        if (token.texture.src === token.flags[MODULE_NAME].DL) return;
        foundry.utils.setProperty(
          change,
          "flags.8bit-movement.__nextTexture",
          token.flags[MODULE_NAME].DL,
        );
        __8bit_previewMesh(token.id, token.flags[MODULE_NAME].DL);
      }
      if (direction === "down-right") {
        if (token.texture.src === token.flags[MODULE_NAME].DR) return;
        foundry.utils.setProperty(
          change,
          "flags.8bit-movement.__nextTexture",
          token.flags[MODULE_NAME].DR,
        );
        __8bit_previewMesh(token.id, token.flags[MODULE_NAME].DR);
      }
    } else if (rotation) {
      switch (foundry.utils.getProperty(change, "rotation")) {
        case 0:
          if (token.texture.src === token.flags[MODULE_NAME].down) return;
          foundry.utils.setProperty(
            change,
            "flags.8bit-movement.__nextTexture",
            token.flags[MODULE_NAME].down,
          );
          __8bit_previewMesh(token.id, token.flags[MODULE_NAME].down);
          break;
        case 90:
          if (token.texture.src === token.flags[MODULE_NAME].left) return;
          foundry.utils.setProperty(
            change,
            "flags.8bit-movement.__nextTexture",
            token.flags[MODULE_NAME].left,
          );
          __8bit_previewMesh(token.id, token.flags[MODULE_NAME].left);
          break;
        case 180:
          if (token.texture.src === token.flags[MODULE_NAME].up) return;
          foundry.utils.setProperty(
            change,
            "flags.8bit-movement.__nextTexture",
            token.flags[MODULE_NAME].up,
          );
          __8bit_previewMesh(token.id, token.flags[MODULE_NAME].up);
          break;
        case 270:
          if (token.texture.src === token.flags[MODULE_NAME].right) return;
          foundry.utils.setProperty(
            change,
            "flags.8bit-movement.__nextTexture",
            token.flags[MODULE_NAME].right,
          );
          __8bit_previewMesh(token.id, token.flags[MODULE_NAME].right);
          break;
        default:
          break;
      }
    }
  });
}

// Ensure no lingering fade/opacity after animated movement completes

// Post-update: do the direction swap AFTER the move has begun, to keep movement smooth.
Hooks.on("updateToken", async (doc, changes, options, userId) => {
  try {
    const token = canvas?.tokens?.get(doc.id);
    if (!token) return;

    // Transient flag from preUpdateToken
    const next =
      (changes?.flags &&
        changes.flags["8bit-movement"] &&
        changes.flags["8bit-movement"].__nextTexture) ||
      doc.getFlag("8bit-movement", "__nextTexture");

    // Debounce persistence until movement fully settles (prevents teleport on drawn paths)
    if (next || "x" in changes || "y" in changes) {
      const prev = __8bitPersistTimers.get(doc.id);
      if (prev) clearTimeout(prev);
      const handle = setTimeout(async () => {
        try {
          const pending = doc.getFlag("8bit-movement", "__nextTexture");
          if (pending) {
            await doc.update(
              {
                "texture.src": pending,
                "flags.8bit-movement.-=__nextTexture": null,
              },
              { animate: false },
            );
          }
          const tk = canvas?.tokens?.get(doc.id);
          if (tk) {
            const kicks = [0, 48, 120, 240];
            for (const t of kicks) setTimeout(() => __8bit_forceOpaque(tk), t);
          }
        } catch (_e) {}
        __8bitPersistTimers.delete(doc.id);
      }, 800);
      __8bitPersistTimers.set(doc.id, handle);
    }

    // Also keep opacity solid during any movement frame
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
