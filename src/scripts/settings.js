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

function localizeOr(key, fallback) {
  const localized = game.i18n.format(key);
  return localized === key ? fallback : localized;
}

function directionFallback(direction) {
  return direction.key
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
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
    name: localizeOr(
      "8BITMOVEMENT.Sprite-Sheet-Default-Frame-Width_name",
      "Sprite sheet default frame width",
    ),
    hint: localizeOr(
      "8BITMOVEMENT.Sprite-Sheet-Default-Frame-Width_hint",
      "Initial single-frame width used for new sprite-sheet Token configurations.",
    ),
    default: DEFAULT_RPGM_FRAME_SIZE,
    range: { min: 1, max: 8192, step: 1 },
  });
  registerPositiveIntegerSetting(SPRITE_SHEET_DEFAULT_FRAME_HEIGHT_SETTING, {
    name: localizeOr(
      "8BITMOVEMENT.Sprite-Sheet-Default-Frame-Height_name",
      "Sprite sheet default frame height",
    ),
    hint: localizeOr(
      "8BITMOVEMENT.Sprite-Sheet-Default-Frame-Height_hint",
      "Initial single-frame height used for new sprite-sheet Token configurations.",
    ),
    default: DEFAULT_RPGM_FRAME_SIZE,
    range: { min: 1, max: 8192, step: 1 },
  });
  const defaultRowSettingName = localizeOr(
    "8BITMOVEMENT.Sprite-Sheet-Default-Row_name",
    "Sprite sheet default row",
  );
  const defaultRowSettingHint = localizeOr(
    "8BITMOVEMENT.Sprite-Sheet-Default-Row_hint",
    "Initial one-based source row used for this direction. Existing Token row mappings are not changed.",
  );
  for (const direction of SPRITE_SHEET_DIRECTIONS) {
    const directionLabel = localizeOr(
      direction.labelKey,
      directionFallback(direction),
    );
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
