function defineDirection(key, imageFlag, labelKey) {
  return Object.freeze({
    key,
    imageFlag,
    action: `${key}-image`,
    labelKey,
  });
}

export const CARDINAL_DIRECTIONS = Object.freeze([
  defineDirection("up", "up", "8BITMOVEMENT.up"),
  defineDirection("down", "down", "8BITMOVEMENT.down"),
  defineDirection("left", "left", "8BITMOVEMENT.left"),
  defineDirection("right", "right", "8BITMOVEMENT.right"),
]);

export const DIAGONAL_DIRECTIONS = Object.freeze([
  defineDirection("up-left", "UL", "8BITMOVEMENT.up-left"),
  defineDirection("up-right", "UR", "8BITMOVEMENT.up-right"),
  defineDirection("down-left", "DL", "8BITMOVEMENT.down-left"),
  defineDirection("down-right", "DR", "8BITMOVEMENT.down-right"),
]);

export const DIRECTIONS = Object.freeze([
  ...CARDINAL_DIRECTIONS,
  ...DIAGONAL_DIRECTIONS,
]);

export const DIRECTION_BY_KEY = Object.freeze(
  Object.fromEntries(DIRECTIONS.map((direction) => [direction.key, direction])),
);

const DEFAULT_DIRECTION = "down";
const CARDINAL_DIRECTION_FALLBACKS = Object.freeze({
  "down-left": "down",
  "down-right": "down",
  "up-left": "up",
  "up-right": "up",
});
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

export function getDirections(eightWay = false) {
  return eightWay ? DIRECTIONS : CARDINAL_DIRECTIONS;
}

export function normalizeDirection(direction) {
  return Object.hasOwn(DIRECTION_BY_KEY, direction)
    ? direction
    : DEFAULT_DIRECTION;
}

export function cardinalizeDirection(direction) {
  const normalized = normalizeDirection(direction);
  return CARDINAL_DIRECTION_FALLBACKS[normalized] ?? normalized;
}

export function directionFromDelta(dx, dy, eightWay = false) {
  if (dx === 0 && dy === 0) return "";

  if (eightWay && dx !== 0 && dy !== 0) {
    if (dx < 0 && dy < 0) return "up-left";
    if (dx > 0 && dy < 0) return "up-right";
    if (dx < 0 && dy > 0) return "down-left";
    return "down-right";
  }

  if (dy < 0) return "up";
  if (dy > 0) return "down";
  return dx < 0 ? "left" : "right";
}

export function directionFromRotation(rotation, eightWay = false) {
  const normalized = ((Number(rotation) % 360) + 360) % 360;
  const directions = eightWay
    ? [
        "down",
        "down-left",
        "left",
        "up-left",
        "up",
        "up-right",
        "right",
        "down-right",
      ]
    : ["down", "left", "up", "right"];
  const step = eightWay ? 45 : 90;
  return directions[Math.round(normalized / step) % directions.length];
}

/** Project a canvas direction onto Isometric Perspective's screen compass. */
export function projectDirectionToScreen(direction, isometric = false) {
  if (!isometric) return direction;
  return ISOMETRIC_PROJECTED_DIRECTIONS[direction] ?? direction;
}

/** Project Foundry canvas movement axes into screen-facing source directions. */
export function mapCanvasDirectionToSource(direction, isometric = false) {
  return projectDirectionToScreen(direction, isometric);
}

/** Apply the four/eight-way and perspective policy to a raw canvas direction. */
export function resolveFacingDirection(
  direction,
  { eightWay = false, isometric = false } = {},
) {
  if (!direction) return "";
  const projected = mapCanvasDirectionToSource(
    direction,
    isometric && eightWay,
  );
  return eightWay
    ? normalizeDirection(projected)
    : cardinalizeDirection(projected);
}

/** Choose the compass slot used by HUD and Token Config previews. */
export function getPreviewLayoutDirection(
  direction,
  { isometric = false } = {},
) {
  const normalized = normalizeDirection(direction);
  return isometric
    ? projectDirectionToScreen(normalized, true)
    : normalized;
}

const LOWERCASE_FILENAME_DIRECTIONS = Object.freeze([
  ["up", "up"],
  ["down", "down"],
  ["left", "left"],
  ["right", "right"],
]);
const UPPERCASE_FILENAME_DIRECTIONS = Object.freeze(
  LOWERCASE_FILENAME_DIRECTIONS.map(([direction, marker]) => [
    direction,
    marker.toUpperCase(),
  ]),
);

/** Infer sibling directional sources using the module's established filenames. */
export function inferDirectionalImageSources(src, eightWay = false) {
  const source = String(src ?? "");
  const slashIndex = Math.max(
    source.lastIndexOf("/"),
    source.lastIndexOf("\\"),
  );
  const extensionIndex = source.lastIndexOf(".");
  const filenameEnd =
    extensionIndex > slashIndex ? extensionIndex : source.length;
  const filename = source.slice(slashIndex + 1, filenameEnd);
  const candidates = [
    ...LOWERCASE_FILENAME_DIRECTIONS,
    ...UPPERCASE_FILENAME_DIRECTIONS,
  ];
  const match = candidates.find(([, marker]) => filename.includes(marker));
  const uppercase = match ? match[1] === match[1].toUpperCase() : false;
  const markerByDirection = {
    up: uppercase ? "UP" : "up",
    down: uppercase ? "DOWN" : "down",
    left: uppercase ? "LEFT" : "left",
    right: uppercase ? "RIGHT" : "right",
    "up-left": uppercase ? "UL" : "ul",
    "up-right": uppercase ? "UR" : "ur",
    "down-left": uppercase ? "DL" : "dl",
    "down-right": uppercase ? "DR" : "dr",
  };
  const sources = Object.fromEntries(
    getDirections(eightWay).map((direction) => [
      direction.key,
      match
        ? source.replace(match[1], markerByDirection[direction.key])
        : source,
    ]),
  );

  return {
    facing: match?.[0] ?? DEFAULT_DIRECTION,
    sources,
  };
}
