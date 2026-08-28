export const MODULE_NAME = "8bit-movement-frankhz";

export const DIRECTIONAL_IMAGE_MODE = "separate";
export const SPRITE_SHEET_MODE = "sheet";

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
