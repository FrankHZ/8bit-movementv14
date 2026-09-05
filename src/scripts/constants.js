export const MODULE_NAME = "8bit-movement-frankhz";

export const DIRECTIONAL_IMAGE_MODE = "separate";
export const SPRITE_SHEET_MODE = "sheet";
export const ISOMETRIC_PERSPECTIVE_SETTING = "isometricPerspective";

export {
  mapCanvasDirectionToSource,
  projectDirectionToScreen,
} from "./directions.js";

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
