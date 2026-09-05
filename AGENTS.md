# Agent Notes

This repository is a Foundry Virtual Tabletop module for v13/v14. Keep changes small and test in Foundry when behavior touches hooks, token documents, canvas rendering, or settings.

## Project Layout

- `src/module.json`: Foundry module manifest.
- `src/scripts/main.js`: module hooks, settings registration, and optional `libWrapper` registration.
- `src/scripts/settings.js`: module setting definitions.
- `src/scripts/functions.js`: directional setup and movement-facing coordination across both image modes.
- `src/scripts/directional-images.js`: separate-image facing state, static/video texture caching, client-side rendering, and lifecycle hooks.
- `src/scripts/sprite-sheet/config.js`: pure row mapping, defaults, validation, and frame-rectangle calculations.
- `src/scripts/sprite-sheet/rendering.js`: standard and isometric Token mesh layout compatibility.
- `src/scripts/sprite-sheet.js`: stable sprite-sheet facade plus texture caching and Token render hooks.
- `src/scripts/ui.js`: public UI facade.
- `src/scripts/ui/`: Token HUD, Token Config, sprite previews, DOM helpers, and shared UI data.
- `src/css/8bitmovement.css`: HUD and Token Config styling.
- `src/lang/en.json` and `src/lang/cn.json`: English and Simplified Chinese localization strings. The `cn` code matches the Foundry-listed Chinese core translation package.
- `test/`: dependency-free Node tests for pure logic and public facades.
- `scripts/check.mjs`: syntax, JSON, version, and unit-test checks.
- `docs/architecture.md`: current module boundaries and deferred refactor candidates.

## Development Rules

- Preserve compatibility with Foundry VTT v13 and v14 unless the task explicitly changes support.
- Prefer Foundry APIs and current v13/v14 patterns over older jQuery-only approaches.
- Do not reintroduce manual `window.location.reload()` callbacks for settings; use `requiresReload: true`.
- `libWrapper` is optional. Code must work when it is not active.
- Keep `libWrapper.register` calls during or after Foundry's `init` hook.
- Avoid raw `innerHTML` for image paths or user-controlled values in UI code.
- Four/eight-direction mode is a per-Token flag. The hidden world setting exists only as a compatibility fallback for older Tokens.
- Isometric Perspective direction layout is a world setting. Four-way mode keeps Foundry's canvas directions and projects them onto the HUD corners, with Down at the lower right. Eight-way mode projects canvas movement axes into screen-space facings and uses a large diamond with matching padding. Standard and isometric HUDs both use unboxed direction images over one continuous edge-to-edge background. Source flags and row meanings stay unchanged.
- Sprite-sheet source crop offsets are distinct from Token display offsets. Source rows are one-based and may be shared by multiple directions.
- World settings provide sprite-sheet frame and direction-row defaults only for missing Token fields. Explicit values already saved in Token flags must always take priority.
- Token Config field edits should use `{ render: false }`; rebuild only the module fieldset when its structure changes.
- Keep every locale file's keys aligned with `src/lang/en.json`; `npm run check` enforces exact key parity.
- Foundry v13 fires module `init` before `game.i18n.initialize()`. Register setting `name` and `hint` values as localization keys; do not eagerly call `game.i18n.localize()` or `format()` during `init`.
- Keep `token.texture` aligned with cropped `token.mesh.texture` frames. In an active `isometric-perspective` Scene, let that module own mesh scale and position and request a mesh refresh after changing frames.
- Separate-image movement must synchronize only `flags.<module>.facing`; do not reintroduce a delayed `texture.src` document update. Directional textures are preloaded and applied to both `token.texture` and `token.mesh.texture` on each client.
- Directional video files use Foundry's supported WebM, MP4, M4V, and OGV extensions. Clone video textures per Token, play them muted and looped through `game.video`, and release clones on Token deletion or canvas teardown. GIF and animated WebP remain image textures rather than supported animation formats.
- Do not commit generated zip files unless the task is explicitly about packaging a release.

## Versioning and Local Release

- The current development release is `1.5.4`; the latest published release is
  `1.5.3`, and README's install manifest URL remains on that immutable tag.
- During future version work, keep README's install URL on the latest published
  tag until its replacement tag and GitHub release exist.
- The v1.5.4 manifest uses Foundry `minimum: 13` and `verified: 14.367`.
- Keep `package.json` and `src/module.json` versions identical.
- Record this patch cycle under the `1.5.4` CHANGELOG entry.
- `src/` is canonical. Run `npm run release:package` to generate the unpacked module, the version-free manual-install zip, and the versioned release zip under `release/`.
- Once requested local work is complete and relevant checks pass, create a local commit without waiting for a separate commit instruction.
- Local packaging or linking does not authorize pushing tags, publishing a GitHub release, or calling Foundry's release API.
- Prefer a fixed packaged module asset over GitHub's mutable source-branch archive for release `download` URLs. Foundry can locate a nested manifest, but a version-specific asset is easier to reproduce and roll back.

## Useful Checks

Run the complete lightweight check before packaging:

```powershell
npm run check
```

Run only the Node unit tests with `npm test`.

Run syntax checks after script edits:

```powershell
Get-ChildItem src/scripts -Recurse -Filter *.js | ForEach-Object {
  node --check $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $($_.FullName)" }
}
```

Validate localization JSON after editing translations:

```powershell
Get-Content -Raw -Encoding utf8 src/lang/en.json | ConvertFrom-Json | Out-Null
Get-Content -Raw -Encoding utf8 src/module.json | ConvertFrom-Json | Out-Null
git diff --check
```

Manual Foundry checks are still important:

- Open Token HUD and Token Config on a token with and without module flags.
- Toggle four/eight directions per Token in both separate-image and sprite-sheet modes.
- Test cardinal and diagonal movement texture swaps, including missing diagonal-image fallbacks.
- Repeatedly drag a separate-image Token through short moves and direction changes; different image files and dimensions must not resize late, complete the drag, or release Token control.
- Assign WebM files to multiple directions and Tokens; confirm HUD/Config previews animate, active directions restart and loop silently, Tokens have independent playback, and switching to static images stops the prior video.
- Test source frame size, crop offsets, repeated direction rows, and out-of-bounds validation.
- Confirm sprite previews and rendered Tokens use the first frame from every configured row.
- Confirm sprite-sheet Tokens remain upright in an Isometric Perspective Scene and retain normal scale/offset behavior in a standard Scene.
- Enable the world isometric layout and confirm all four source facings remain reachable in four-way mode, Down appears at the lower-right HUD corner, and southeast movement selects source Down Right in eight-way mode. Both HUD image modes should have no individual cells; four-way previews occupy the corners of the standard grid and eight-way previews form a large diamond over one continuous background.
- Confirm the standard HUD uses the same unboxed, continuous-background preview treatment without the isometric direction projection.
- Collapse and reopen the HUD panel, then confirm its state survives a HUD re-render.
- Test locking/unlocking movement settings.
- Test Save to Prototype, Clear Token, and Clear All independently.
- If `libWrapper` is active, enable Disable Rotation Animation and confirm wrapper registration appears in the console.
