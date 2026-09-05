export const MODULE_NAME = "8bit-movement-frankhz";

export const DIRECTIONAL_IMAGE_MODE = "separate";
export const SPRITE_SHEET_MODE = "sheet";
export const ISOMETRIC_PERSPECTIVE_SETTING = "isometricPerspective";

const ISOMETRIC_PROJECTED_DIRECTIONS = Object.freeze({
  down: "down-right",
  right: "up-right",
  up: "up-left",
  left: "down-left",
  "down-right": "right",
  "up-right": "up",
  "up-left": "left",
  "down-left": "down",
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
  return ISOMETRIC_PROJECTED_DIRECTIONS[direction] ?? direction;
}

/** Project Foundry canvas movement axes into screen-space source directions. */
export function mapCanvasDirectionToSource(direction, isometric = false) {
  if (!isometric) return direction;
  return ISOMETRIC_PROJECTED_DIRECTIONS[direction] ?? direction;
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
