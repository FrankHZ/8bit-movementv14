import assert from "node:assert/strict";
import test from "node:test";

import {
  applySpriteSheetFrame,
  isIsometricToken,
  restoreSpriteSheetFrame,
} from "../src/scripts/sprite-sheet/rendering.js";

function mockGame({ active = true, world = true } = {}) {
  return {
    modules: new Map([["isometric-perspective", { active }]]),
    settings: {
      get(moduleId, setting) {
        assert.equal(moduleId, "isometric-perspective");
        assert.equal(setting, "worldIsometricFlag");
        return world;
      },
    },
  };
}

function mockToken({ scene = true, disabled = false } = {}) {
  const scaleCalls = [];
  const positionCalls = [];
  const refreshCalls = [];
  const texture = { width: 144, height: 384 };
  return {
    texture,
    w: 100,
    h: 100,
    center: { x: 250, y: 350 },
    scene: {
      getFlag(moduleId, flag) {
        assert.equal(moduleId, "isometric-perspective");
        assert.equal(flag, "isometricEnabled");
        return scene;
      },
    },
    document: {
      getFlag(moduleId, flag) {
        assert.equal(moduleId, "isometric-perspective");
        assert.equal(flag, "isoTokenDisabled");
        return disabled;
      },
    },
    mesh: {
      texture,
      scale: {
        x: 7,
        y: 11,
        set(...values) {
          scaleCalls.push(values);
        },
      },
      position: {
        set(...values) {
          positionCalls.push(values);
        },
      },
    },
    renderFlags: {
      set(flags) {
        refreshCalls.push(flags);
      },
    },
    scaleCalls,
    positionCalls,
    refreshCalls,
  };
}

test("detects only active, enabled isometric Tokens", () => {
  const token = mockToken();
  assert.equal(isIsometricToken(token, mockGame()), true);
  assert.equal(isIsometricToken(token, mockGame({ active: false })), false);
  assert.equal(isIsometricToken(token, mockGame({ world: false })), false);
  assert.equal(
    isIsometricToken(mockToken({ scene: false }), mockGame()),
    false,
  );
  assert.equal(
    isIsometricToken(mockToken({ disabled: true }), mockGame()),
    false,
  );
});

test("preserves isometric mesh transforms and requests a reflow", () => {
  globalThis.game = mockGame();
  const token = mockToken();
  const frame = { width: 48, height: 64 };

  assert.equal(applySpriteSheetFrame(token, frame, { scale: 2 }), "isometric");
  assert.equal(token.texture, frame);
  assert.equal(token.mesh.texture, frame);
  assert.deepEqual(token.scaleCalls, []);
  assert.deepEqual(token.positionCalls, []);
  assert.deepEqual(token.refreshCalls, [{ refreshMesh: true }]);

  applySpriteSheetFrame(token, frame, { scale: 2 });
  assert.equal(token.refreshCalls.length, 1, "unchanged frames do not loop");
  delete globalThis.game;
});

test("keeps standard-view scaling and offsets", () => {
  globalThis.game = mockGame({ active: false });
  const token = mockToken();
  const frame = { width: 50, height: 25 };

  assert.equal(
    applySpriteSheetFrame(token, frame, {
      scale: 1.5,
      offsetX: 4,
      offsetY: -6,
    }),
    "standard",
  );
  assert.deepEqual(token.scaleCalls, [[3, 6]]);
  assert.deepEqual(token.positionCalls, [[254, 319]]);
  assert.deepEqual(token.refreshCalls, []);
  delete globalThis.game;
});

test("restoring a projected Token also delegates its layout", () => {
  globalThis.game = mockGame();
  const token = mockToken();
  const original = token.texture;
  token.texture = token.mesh.texture = { width: 48, height: 48 };

  assert.equal(restoreSpriteSheetFrame(token, original), "isometric");
  assert.equal(token.texture, original);
  assert.equal(token.mesh.texture, original);
  assert.deepEqual(token.scaleCalls, []);
  assert.deepEqual(token.positionCalls, []);
  assert.deepEqual(token.refreshCalls, [{ refreshMesh: true }]);
  delete globalThis.game;
});
