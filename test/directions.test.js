import assert from "node:assert/strict";
import test from "node:test";

import { getIsometricPerspectiveMode } from "../src/scripts/constants.js";
import {
  CARDINAL_DIRECTIONS,
  DIAGONAL_DIRECTIONS,
  DIRECTIONS,
  cardinalizeDirection,
  directionFromDelta,
  directionFromRotation,
  getPreviewLayoutDirection,
  inferDirectionalImageSources,
  mapCanvasDirectionToSource,
  projectDirectionToScreen,
  resolveFacingDirection,
} from "../src/scripts/directions.js";
import {
  initializeMovement,
  resolveMovementFacing,
} from "../src/scripts/functions.js";

test("direction metadata preserves canonical keys and persisted image flags", () => {
  assert.deepEqual(
    CARDINAL_DIRECTIONS.map(({ key }) => key),
    ["up", "down", "left", "right"],
  );
  assert.deepEqual(
    DIAGONAL_DIRECTIONS.map(({ key, imageFlag }) => [key, imageFlag]),
    [
      ["up-left", "UL"],
      ["up-right", "UR"],
      ["down-left", "DL"],
      ["down-right", "DR"],
    ],
  );
});

test("delta and rotation inputs resolve to canonical directions", () => {
  assert.equal(directionFromDelta(0, 100, false), "down");
  assert.equal(directionFromDelta(100, 100, false), "down");
  assert.equal(directionFromDelta(100, 100, true), "down-right");
  assert.equal(directionFromDelta(0, 0, true), "");
  assert.equal(directionFromRotation(0, false), "down");
  assert.equal(directionFromRotation(90, false), "left");
  assert.equal(directionFromRotation(315, true), "down-right");
});

test("isometric projection places source directions on screen", () => {
  const expected = {
    down: "down-right",
    right: "up-right",
    up: "up-left",
    left: "down-left",
    "down-right": "right",
    "up-right": "up",
    "up-left": "left",
    "down-left": "down",
  };

  for (const [source, screen] of Object.entries(expected)) {
    assert.equal(projectDirectionToScreen(source, true), screen);
    assert.equal(projectDirectionToScreen(source, false), source);
  }
});

test("isometric canvas axes select their screen-space source direction", () => {
  const expected = {
    down: "down-right",
    right: "up-right",
    up: "up-left",
    left: "down-left",
    "down-right": "right",
    "up-right": "up",
    "up-left": "left",
    "down-left": "down",
  };

  for (const [canvasDirection, sourceDirection] of Object.entries(expected)) {
    assert.equal(
      mapCanvasDirectionToSource(canvasDirection, true),
      sourceDirection,
    );
    assert.equal(
      mapCanvasDirectionToSource(canvasDirection, false),
      canvasDirection,
    );
  }
});

test("facing policy covers four/eight-way and standard/isometric modes", () => {
  for (const { key } of DIRECTIONS) {
    assert.equal(
      resolveFacingDirection(key, { eightWay: false, isometric: false }),
      cardinalizeDirection(key),
    );
    assert.equal(
      resolveFacingDirection(key, { eightWay: false, isometric: true }),
      cardinalizeDirection(key),
    );
    assert.equal(
      resolveFacingDirection(key, { eightWay: true, isometric: false }),
      key,
    );
    assert.equal(
      resolveFacingDirection(key, { eightWay: true, isometric: true }),
      projectDirectionToScreen(key, true),
    );
  }
});

test("preview layout projects only four-way isometric directions", () => {
  for (const { key } of DIRECTIONS) {
    assert.equal(
      getPreviewLayoutDirection(key, {
        eightWay: false,
        isometric: false,
      }),
      key,
    );
    assert.equal(
      getPreviewLayoutDirection(key, {
        eightWay: true,
        isometric: true,
      }),
      key,
    );
  }
  for (const { key } of CARDINAL_DIRECTIONS) {
    assert.equal(
      getPreviewLayoutDirection(key, {
        eightWay: false,
        isometric: true,
      }),
      projectDirectionToScreen(key, true),
    );
  }
});

test("directional filenames preserve lowercase and uppercase conventions", () => {
  const lowercase = inferDirectionalImageSources(
    "tokens/hero_down.webp",
    true,
  );
  assert.equal(lowercase.facing, "down");
  assert.equal(lowercase.sources.up, "tokens/hero_up.webp");
  assert.equal(
    lowercase.sources["down-right"],
    "tokens/hero_dr.webp",
  );

  const uppercase = inferDirectionalImageSources(
    "tokens/HERO_RIGHT.PNG",
    true,
  );
  assert.equal(uppercase.facing, "right");
  assert.equal(uppercase.sources.left, "tokens/HERO_LEFT.PNG");
  assert.equal(uppercase.sources["up-left"], "tokens/HERO_UL.PNG");

  const unmatched = inferDirectionalImageSources("tokens/hero.webp", false);
  assert.equal(unmatched.facing, "down");
  assert.deepEqual(Object.values(unmatched.sources), [
    "tokens/hero.webp",
    "tokens/hero.webp",
    "tokens/hero.webp",
    "tokens/hero.webp",
  ]);
});

test("separate-image initialization keeps the persisted flag schema", async () => {
  const updates = [];
  const document = {
    flags: {
      "8bit-movement-frankhz": {
        diagonalMode: true,
        facing: "down",
      },
    },
    texture: { src: "tokens/hero_down.webp" },
    getFlag(scope, key) {
      return this.flags[scope]?.[key];
    },
    async update(change, options) {
      updates.push([change, options]);
    },
  };
  const token = { id: "token-1", document };
  globalThis.canvas = {
    tokens: {
      get(id) {
        assert.equal(id, token.id);
        return token;
      },
    },
  };

  await initializeMovement(token.id, { render: false });
  const [change, options] = updates[0];
  assert.equal(change["flags.8bit-movement-frankhz.up"], "tokens/hero_up.webp");
  assert.equal(change["flags.8bit-movement-frankhz.DR"], "tokens/hero_dr.webp");
  assert.equal(change["flags.8bit-movement-frankhz.mode"], "separate");
  assert.equal("flags.8bit-movement-frankhz.up-left" in change, false);
  assert.deepEqual(options, { render: false });
  delete globalThis.canvas;
});

test("isometric perspective is a safe world-setting lookup", () => {
  const calls = [];
  const gameInstance = {
    settings: {
      get(scope, setting) {
        calls.push([scope, setting]);
        return true;
      },
    },
  };

  assert.equal(getIsometricPerspectiveMode(gameInstance), true);
  assert.deepEqual(calls, [
    ["8bit-movement-frankhz", "isometricPerspective"],
  ]);
  assert.equal(getIsometricPerspectiveMode(undefined), false);
});

test("four-way isometric movement preserves all four canvas facings", () => {
  globalThis.foundry = {
    utils: {
      hasProperty(object, key) {
        return Object.hasOwn(object, key);
      },
    },
  };
  const token = { x: 0, y: 0 };
  const expected = [
    [{ y: -100 }, "up"],
    [{ x: 100 }, "right"],
    [{ y: 100 }, "down"],
    [{ x: -100 }, "left"],
  ];

  for (const [change, facing] of expected) {
    assert.equal(resolveMovementFacing(token, change, false, true), facing);
  }
  delete globalThis.foundry;
});

test("eight-way isometric movement projects canvas axes", () => {
  globalThis.foundry = {
    utils: {
      hasProperty(object, key) {
        return Object.hasOwn(object, key);
      },
    },
  };
  const token = { x: 0, y: 0 };
  const expected = [
    [{ y: -100 }, "up-left"],
    [{ x: 100 }, "up-right"],
    [{ y: 100 }, "down-right"],
    [{ x: -100 }, "down-left"],
    [{ x: 100, y: 100 }, "right"],
  ];

  for (const [change, facing] of expected) {
    assert.equal(resolveMovementFacing(token, change, true, true), facing);
  }
  delete globalThis.foundry;
});
