import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDirectionalImage,
  applyDirectionalTexture,
  clearDirectionalImageCache,
  getDirectionalFacing,
  getDirectionalImage,
  preloadDirectionalImages,
  stageDirectionalFacing,
} from "../src/scripts/directional-images.js";

const MODULE_NAME = "8bit-movement-frankhz";

function mockDocument({
  diagonalMode = true,
  facing,
  texture = "tokens/hero-down.webp",
  images = {},
} = {}) {
  const movement = {
    mode: "separate",
    diagonalMode,
    down: "tokens/hero-down.webp",
    left: "tokens/hero-left.webp",
    right: "tokens/hero-right.webp",
    up: "tokens/hero-up.webp",
    ...images,
  };
  if (facing !== undefined) movement.facing = facing;
  return {
    flags: { [MODULE_NAME]: movement },
    texture: { src: texture },
    getFlag(scope, key) {
      assert.equal(scope, MODULE_NAME);
      return this.flags[scope]?.[key];
    },
  };
}

function mockToken(document = mockDocument()) {
  const refreshCalls = [];
  return {
    id: "token-1",
    document,
    texture: { id: "original" },
    mesh: { texture: { id: "original-mesh" }, alpha: 0.5 },
    alpha: 0.5,
    renderFlags: {
      set(flags) {
        refreshCalls.push(flags);
      },
    },
    refreshCalls,
  };
}

test("resolves configured images and vertical diagonal fallbacks", () => {
  const document = mockDocument({
    images: { DR: "tokens/hero-down-right.webp" },
  });
  assert.equal(
    getDirectionalImage(document, "down-right"),
    "tokens/hero-down-right.webp",
  );
  assert.equal(
    getDirectionalImage(document, "down-left"),
    "tokens/hero-down.webp",
  );
  assert.equal(getDirectionalImage(document, "up-left"), "tokens/hero-up.webp");
});

test("migrates facing from the persisted texture and respects four-way mode", () => {
  assert.equal(
    getDirectionalFacing(
      mockDocument({ facing: undefined, texture: "tokens/hero-right.webp" }),
    ),
    "right",
  );
  assert.equal(
    getDirectionalFacing(mockDocument({ diagonalMode: false, facing: "up-right" })),
    "up",
  );
});

test("movement stages only a facing flag and never a texture document update", () => {
  const document = mockDocument({
    images: { DR: "tokens/hero-down-right.webp" },
  });
  const change = { x: 100, y: 100 };

  assert.equal(stageDirectionalFacing(document, change, "down-right"), "down-right");
  assert.deepEqual(change, {
    x: 100,
    y: 100,
    flags: { [MODULE_NAME]: { facing: "down-right" } },
  });
  assert.equal("texture" in change, false);
  assert.equal("__nextTexture" in change.flags[MODULE_NAME], false);
});

test("installs loaded textures once and requests only a mesh refresh", async () => {
  clearDirectionalImageCache();
  const loaded = { width: 96, height: 64 };
  let loadCalls = 0;
  globalThis.foundry = {
    canvas: {
      async loadTexture(src) {
        loadCalls += 1;
        assert.equal(src, "tokens/hero-right.webp");
        return loaded;
      },
    },
  };
  const token = mockToken(mockDocument({ facing: "right" }));

  await applyDirectionalImage(token, "right");
  assert.equal(token.texture, loaded);
  assert.equal(token.mesh.texture, loaded);
  assert.equal(token.alpha, 1);
  assert.equal(token.mesh.alpha, 1);
  assert.deepEqual(token.refreshCalls, [{ refreshMesh: true }]);

  await applyDirectionalImage(token, "right");
  assert.equal(loadCalls, 1, "the loaded directional texture is cached");
  assert.equal(token.refreshCalls.length, 1, "unchanged textures do not reflow");

  delete globalThis.foundry;
  clearDirectionalImageCache();
});

test("preloading deduplicates shared directional sources", async () => {
  clearDirectionalImageCache();
  let loadCalls = 0;
  globalThis.foundry = {
    canvas: {
      async loadTexture() {
        loadCalls += 1;
        return { width: 48, height: 48 };
      },
    },
  };
  const document = mockDocument({
    images: {
      left: "tokens/shared.webp",
      right: "tokens/shared.webp",
      up: "tokens/shared.webp",
      down: "tokens/shared.webp",
    },
  });

  await preloadDirectionalImages(document);
  await preloadDirectionalImages(document);
  assert.equal(loadCalls, 1);

  delete globalThis.foundry;
  clearDirectionalImageCache();
});

test("rapid direction changes discard stale asynchronous texture loads", async () => {
  clearDirectionalImageCache();
  const pending = new Map();
  globalThis.foundry = {
    canvas: {
      loadTexture(src) {
        return new Promise((resolve) => pending.set(src, resolve));
      },
    },
  };
  const token = mockToken(mockDocument({ facing: "up" }));
  const upTexture = { id: "up", width: 48, height: 48 };
  const rightTexture = { id: "right", width: 48, height: 48 };

  const upRequest = applyDirectionalImage(token, "up");
  const rightRequest = applyDirectionalImage(token, "right");
  pending.get("tokens/hero-up.webp")(upTexture);
  await upRequest;
  assert.notEqual(token.texture, upTexture, "the superseded load is ignored");

  pending.get("tokens/hero-right.webp")(rightTexture);
  await rightRequest;
  assert.equal(token.texture, rightTexture);
  assert.deepEqual(token.refreshCalls, [{ refreshMesh: true }]);

  delete globalThis.foundry;
  clearDirectionalImageCache();
});

test("direct texture installation never mutates the Token document", () => {
  const document = mockDocument();
  const snapshot = structuredClone(document.flags);
  const token = mockToken(document);
  const texture = { width: 32, height: 64 };

  assert.equal(applyDirectionalTexture(token, texture), true);
  assert.deepEqual(document.flags, snapshot);
  assert.equal(document.texture.src, "tokens/hero-down.webp");
});
