# Architecture

This module intentionally uses native JavaScript modules and Foundry hooks
without a bundler. The goal is to keep the source directly inspectable in an
installed Foundry module while giving stateful runtime code and pure logic clear
boundaries.

## Current layers

1. `src/scripts/constants.js` owns the module ID, image-mode constants, the
   compatibility fallback for diagonal mode, source-to-screen isometric
   HUD projection, and canvas-axis-to-screen-facing movement projection.
2. `src/scripts/directional-images.js` owns separate-image facing state, cached
   texture loading, stale-request rejection, client-side Token/mesh updates, and
   canvas lifecycle hooks. Movement writes only the facing flag; it never queues
   a later Token texture document update.
3. `src/scripts/sprite-sheet/config.js` owns sprite-sheet direction metadata,
   default merging, input validation, and first-frame rectangle calculations.
   It has no PIXI or Token dependency, so it is the primary unit-test boundary.
4. `src/scripts/sprite-sheet/rendering.js` keeps cropped Token textures aligned
   with their meshes and chooses between standard layout and the mesh layout
   owned by an active Isometric Perspective Scene.
5. `src/scripts/sprite-sheet.js` is both the sprite-sheet runtime and the stable
   public facade. It re-exports the config API and owns texture loading, PIXI
   frame caching, Token mesh updates, and render hooks.
6. `src/scripts/functions.js` coordinates directional-image setup, facing,
   and movement updates across both image modes.
7. `src/scripts/ui.js` is the stable UI facade. Files under `src/scripts/ui/`
   own the Token HUD, Token Config, previews, shared form data, and DOM helpers.
8. `src/scripts/main.js` remains the composition root that registers settings,
   hooks, UI integration, and the optional `libWrapper` behavior.

Existing imports should continue through `sprite-sheet.js` or `ui.js` unless a
module specifically needs a pure internal function. This keeps future internal
splits from forcing broad import rewrites.

## Test strategy

The automated suite uses Node's built-in test runner. It covers deterministic
logic that can run without Foundry, including defaults, direction fallback,
row mapping, source offsets, bounds validation, frame rectangles, separate-image
facing changes, texture caching and stale-request rejection, isometric direction
projection, facade exports, and focused standard/isometric mesh-layout mocks.
`npm run check` also
syntax-checks every source script, parses key JSON files, verifies that package
and manifest versions match, and requires every locale to contain exactly the
same keys as `lang/en.json`.

Foundry hooks, PIXI textures, Token documents, and application rendering stay in
the manual test checklist. Mocking the whole Foundry runtime would add more
maintenance than confidence at the current module size.

## Refactor candidates

These are useful next boundaries if the affected code needs substantial feature
work. They are not requirements for routine fixes.

1. Split `ui/token-config.js` by form section: activation/mode controls,
   separate directional images, and sprite-sheet fields.
2. Split `functions.js` into setup/picker behavior and movement-hook behavior.
3. Separate persistence and Token flag access from application/DOM helpers in
   `ui/shared.js`.
4. Consolidate shared direction metadata only after coverage exists for both
   separate-image filename inference and sprite-sheet direction fallback.

For now, a bundler, TypeScript migration, DOM test environment, and Foundry
integration harness are deliberately deferred. They would make this small
module heavier without addressing a current failure mode.
