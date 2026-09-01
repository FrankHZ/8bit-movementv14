export const MODULE_NAME = "8bit-movement-frankhz";

export const DIRECTIONAL_IMAGE_MODE = "separate";
export const SPRITE_SHEET_MODE = "sheet";
export const ISOMETRIC_PERSPECTIVE_SETTING = "isometricPerspective";

const ISOMETRIC_SCREEN_DIRECTIONS = Object.freeze({
  down: "down-left",
  right: "down-right",
  up: "up-right",
  left: "up-left",
  "down-right": "down",
  "up-right": "right",
  "up-left": "up",
  "down-left": "left",
});

const ISOMETRIC_SOURCE_DIRECTIONS_BY_CANVAS = Object.freeze({
  down: "right",
  right: "up",
  up: "left",
  left: "down",
  "down-right": "up-right",
  "up-right": "up-left",
  "up-left": "down-left",
  "down-left": "down-right",
});

export function getIsometricPerspectiveMode(gameInstance = globalThis.game) {
  try {
    return !!gameInstance?.settings?.get?.(
      MODULE_NAME,
      ISOMETRIC_PERSPECTIVE_SETTING,
    );
  } catch {
    return false;
  }
}

/** Project a source-art direction onto the HUD's screen-space compass. */
export function projectDirectionToScreen(direction, isometric = false) {
  if (!isometric) return direction;
  return ISOMETRIC_SCREEN_DIRECTIONS[direction] ?? direction;
}

/** Map Foundry canvas movement axes back to source-art directions. */
export function mapCanvasDirectionToSource(direction, isometric = false) {
  if (!isometric) return direction;
  return ISOMETRIC_SOURCE_DIRECTIONS_BY_CANVAS[direction] ?? direction;
}

export function getTokenDiagonalMode(tokenOrDocument) {
  const document = tokenOrDocument?.document ?? tokenOrDocument ?? null;
  const tokenSetting = document?.getFlag?.(MODULE_NAME, "diagonalMode");
  if (typeof tokenSetting === "boolean") return tokenSetting;

  try {
    return !!game.settings.get(MODULE_NAME, "diagonalMode");
  } catch {
    return false;
  }
}
