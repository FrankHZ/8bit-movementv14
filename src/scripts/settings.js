import { MODULE_NAME } from "./constants.js";
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
    name: game.i18n.format("8BITMOVEMENT.GM-Mode_name"),
    hint: game.i18n.format("8BITMOVEMENT.GM-Mode_hint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    requiresReload: true,
  });
  game.settings.register(MODULE_NAME, "tokenMode", {
    name: game.i18n.format("8BITMOVEMENT.Token-Mode_name"),
    hint: game.i18n.format("8BITMOVEMENT.Token-Mode_hint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    requiresReload: true,
  });
  game.settings.register(MODULE_NAME, "settingsMode", {
    name: game.i18n.format("8BITMOVEMENT.Settings-Mode_name"),
    hint: game.i18n.format("8BITMOVEMENT.Settings-Mode_hint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    requiresReload: true,
  });
  registerPositiveIntegerSetting(SPRITE_SHEET_DEFAULT_FRAME_WIDTH_SETTING, {
    name: game.i18n.format(
      "8BITMOVEMENT.Sprite-Sheet-Default-Frame-Width_name",
    ),
    hint: game.i18n.format(
      "8BITMOVEMENT.Sprite-Sheet-Default-Frame-Width_hint",
    ),
    default: DEFAULT_RPGM_FRAME_SIZE,
    range: { min: 1, max: 8192, step: 1 },
  });
  registerPositiveIntegerSetting(SPRITE_SHEET_DEFAULT_FRAME_HEIGHT_SETTING, {
    name: game.i18n.format(
      "8BITMOVEMENT.Sprite-Sheet-Default-Frame-Height_name",
    ),
    hint: game.i18n.format(
      "8BITMOVEMENT.Sprite-Sheet-Default-Frame-Height_hint",
    ),
    default: DEFAULT_RPGM_FRAME_SIZE,
    range: { min: 1, max: 8192, step: 1 },
  });
  const defaultRowSettingName = game.i18n.format(
    "8BITMOVEMENT.Sprite-Sheet-Default-Row_name",
  );
  const defaultRowSettingHint = game.i18n.format(
    "8BITMOVEMENT.Sprite-Sheet-Default-Row_hint",
  );
  for (const direction of SPRITE_SHEET_DIRECTIONS) {
    const directionLabel = game.i18n.format(direction.labelKey);
    registerPositiveIntegerSetting(direction.defaultRowSetting, {
      name: `${defaultRowSettingName}: ${directionLabel}`,
      hint: defaultRowSettingHint,
      default: direction.defaultRow,
      range: { min: 1, max: 16, step: 1 },
    });
  }
  game.settings.register(MODULE_NAME, "diagonalMode", {
    name: game.i18n.format("8BITMOVEMENT.Diagonal-Mode_name"),
    hint: game.i18n.format("8BITMOVEMENT.Diagonal-Mode_hint"),
    scope: "world",
    config: false,
    default: false,
    type: Boolean,
  });
  game.settings.register(MODULE_NAME, "warnings", {
    name: game.i18n.format("8BITMOVEMENT.Settings-Warn_name"),
    hint: game.i18n.format("8BITMOVEMENT.Settings-Warn_hint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true,
  });
  game.settings.register(MODULE_NAME, "disableRotationAnimation", {
    name: game.i18n.format("8BITMOVEMENT.Disable-Rotation-Animation_name"),
    hint: game.i18n.format("8BITMOVEMENT.Disable-Rotation-Animation_hint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true,
  });
};
