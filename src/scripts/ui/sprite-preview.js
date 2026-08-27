import {
  getSpriteSheetDirections,
  inspectSpriteSheet,
  SPRITE_SHEET_DIRECTIONS,
} from "../sprite-sheet.js";

const DIRECTION_BY_KEY = Object.freeze(
  Object.fromEntries(
    SPRITE_SHEET_DIRECTIONS.map((direction) => [direction.key, direction]),
  ),
);

function localize(key, data = {}) {
  return game.i18n.format(key, data);
}

function getValidationMessage(result) {
  switch (result.code) {
    case "missing-source":
      return localize("8BITMOVEMENT.Sprite-Sheet-Validation-Missing");
    case "invalid-texture-size":
    case "texture-load-failed":
      return localize("8BITMOVEMENT.Sprite-Sheet-Validation-Texture");
    case "invalid-frame-size":
      return localize("8BITMOVEMENT.Sprite-Sheet-Validation-Frame");
    case "invalid-source-offset":
      return localize("8BITMOVEMENT.Sprite-Sheet-Validation-Source-Offset");
    case "invalid-direction-row":
      return localize("8BITMOVEMENT.Sprite-Sheet-Validation-Direction-Row", {
        direction: localize(DIRECTION_BY_KEY[result.direction].labelKey),
      });
    case "crop-out-of-bounds":
      return localize("8BITMOVEMENT.Sprite-Sheet-Validation-Bounds", {
        width: result.textureWidth,
        height: result.textureHeight,
        requiredWidth: result.requiredWidth,
        requiredHeight: result.requiredHeight,
      });
    default:
      return localize("8BITMOVEMENT.Sprite-Sheet-Validation-Ready", {
        width: result.textureWidth,
        height: result.textureHeight,
        frameWidth: result.frameWidth,
        frameHeight: result.frameHeight,
        columns: result.columns,
      });
  }
}

function createDirectionPreview(direction, onActivate) {
  const card = document.createElement(onActivate ? "button" : "div");
  if (onActivate) card.type = "button";
  card.className = `movement-direction-preview movement-direction-${direction.key}`;
  card.dataset.direction = direction.key;

  const viewport = document.createElement("div");
  viewport.className = "movement-frame-viewport";
  const image = document.createElement("img");
  image.alt = localize(direction.labelKey);
  viewport.append(image);

  const label = document.createElement("span");
  label.textContent = localize(direction.labelKey);
  card.append(viewport, label);
  if (onActivate) card.addEventListener("click", onActivate);
  return { card, image, direction };
}

function applyFramePreview(preview, result) {
  const row = result.directionRows[preview.direction.key];
  const cropY = result.sourceOffsetY + (row - 1) * result.frameHeight;
  preview.image.parentElement.style.aspectRatio =
    `${result.frameWidth} / ${result.frameHeight}`;
  preview.image.src = result.src;
  preview.image.style.width =
    `${(result.textureWidth / result.frameWidth) * 100}%`;
  preview.image.style.height =
    `${(result.textureHeight / result.frameHeight) * 100}%`;
  preview.image.style.left =
    `${-(result.sourceOffsetX / result.frameWidth) * 100}%`;
  preview.image.style.top = `${-(cropY / result.frameHeight) * 100}%`;
}

export function createSpriteSheetPreview({
  compact = false,
  diagonal = false,
  onActivate,
} = {}) {
  const directions = getSpriteSheetDirections(diagonal);
  const element = document.createElement("section");
  element.className = `movement-sprite-preview${compact ? " compact" : ""}`;
  element.dataset.state = "empty";

  const status = document.createElement("div");
  status.className = "movement-sprite-status";
  const statusIcon = document.createElement("i");
  const statusText = document.createElement("span");
  status.append(statusIcon, statusText);

  const grid = document.createElement("div");
  grid.className = "movement-direction-preview-grid";
  grid.hidden = true;
  const previews = directions.map((direction) =>
    createDirectionPreview(direction, onActivate),
  );
  grid.append(...previews.map(({ card }) => card));
  element.append(status, grid);

  let requestId = 0;
  const update = async (config) => {
    const currentRequest = ++requestId;
    element.dataset.state = "loading";
    statusIcon.className = "fas fa-spinner fa-spin";
    statusText.textContent = localize(
      "8BITMOVEMENT.Sprite-Sheet-Validation-Loading",
    );
    grid.hidden = true;

    const result = await inspectSpriteSheet(config.src, config, directions);
    if (currentRequest !== requestId) return result;

    element.dataset.state = result.valid ? "valid" : "invalid";
    statusIcon.className = result.valid
      ? "fas fa-circle-check"
      : "fas fa-triangle-exclamation";
    statusText.textContent = getValidationMessage(result);
    grid.hidden = !result.valid;
    if (result.valid) {
      for (const preview of previews) applyFramePreview(preview, result);
    }
    return result;
  };

  return { element, update };
}
