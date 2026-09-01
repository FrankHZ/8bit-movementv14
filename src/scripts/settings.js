import {
  ISOMETRIC_PERSPECTIVE_SETTING,
  MODULE_NAME,
} from "./constants.js";
import {
  DEFAULT_RPGM_FRAME_SIZE,
  SPRITE_SHEET_DEFAULT_FRAME_HEIGHT_SETTING,
  SPRITE_SHEET_DEFAULT_FRAME_WIDTH_SETTING,
  SPRITE_SHEET_DIRECTIONS,
} from "./sprite-sheet.js";

function registerPositiveIntegerSetting(key, options) {
  game.settings.register(MODULE_NAME, key, {
    scope: "world",
    config: true,
    type: Number,
    ...options,
  });
}

export const registerSettings = function () {
  game.settings.register(MODULE_NAME, "gmMode", {
    name: "8BITMOVEMENT.GM-Mode_name",
    hint: "8BITMOVEMENT.GM-Mode_hint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    requiresReload: true,
  });
  game.settings.register(MODULE_NAME, "tokenMode", {
    name: "8BITMOVEMENT.Token-Mode_name",
    hint: "8BITMOVEMENT.Token-Mode_hint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    requiresReload: true,
  });
  game.settings.register(MODULE_NAME, "settingsMode", {
    name: "8BITMOVEMENT.Settings-Mode_name",
    hint: "8BITMOVEMENT.Settings-Mode_hint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    requiresReload: true,
  });
  game.settings.register(MODULE_NAME, ISOMETRIC_PERSPECTIVE_SETTING, {
    name: "8BITMOVEMENT.Isometric-Perspective_name",
    hint: "8BITMOVEMENT.Isometric-Perspective_hint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true,
  });
  registerPositiveIntegerSetting(SPRITE_SHEET_DEFAULT_FRAME_WIDTH_SETTING, {
    name: "8BITMOVEMENT.Sprite-Sheet-Default-Frame-Width_name",
    hint: "8BITMOVEMENT.Sprite-Sheet-Default-Frame-Width_hint",
    default: DEFAULT_RPGM_FRAME_SIZE,
    range: { min: 1, max: 8192, step: 1 },
  });
  registerPositiveIntegerSetting(SPRITE_SHEET_DEFAULT_FRAME_HEIGHT_SETTING, {
    name: "8BITMOVEMENT.Sprite-Sheet-Default-Frame-Height_name",
    hint: "8BITMOVEMENT.Sprite-Sheet-Default-Frame-Height_hint",
    default: DEFAULT_RPGM_FRAME_SIZE,
    range: { min: 1, max: 8192, step: 1 },
  });
  for (const direction of SPRITE_SHEET_DIRECTIONS) {
    registerPositiveIntegerSetting(direction.defaultRowSetting, {
      name: `8BITMOVEMENT.Sprite-Sheet-Default-Row-${direction.key}_name`,
      hint: "8BITMOVEMENT.Sprite-Sheet-Default-Row_hint",
      default: direction.defaultRow,
      range: { min: 1, max: 16, step: 1 },
    });
  }
  game.settings.register(MODULE_NAME, "diagonalMode", {
    name: "8BITMOVEMENT.Diagonal-Mode_name",
    hint: "8BITMOVEMENT.Diagonal-Mode_hint",
    scope: "world",
    config: false,
    default: false,
    type: Boolean,
  });
  game.settings.register(MODULE_NAME, "warnings", {
    name: "8BITMOVEMENT.Settings-Warn_name",
    hint: "8BITMOVEMENT.Settings-Warn_hint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true,
  });
  game.settings.register(MODULE_NAME, "disableRotationAnimation", {
    name: "8BITMOVEMENT.Disable-Rotation-Animation_name",
    hint: "8BITMOVEMENT.Disable-Rotation-Animation_hint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true,
  });
};
