import { MODULE_NAME } from "./constants.js";

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
