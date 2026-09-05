# 8bit Movement v14

`8bit-movement` lets a token swap between directional images so movement feels closer to old-school 8-bit RPGs. You can configure four-direction movement or enable diagonals for eight-direction sprites.

This fork is focused on Foundry Virtual Tabletop v13 and v14 compatibility. The local v1.5.4 development manifest supports v13 and is verified for Foundry VTT `14.367`. The latest published release is v1.5.3.

## Features

- Set directional token images from the Token HUD
- Configure the same images from Token Config
- Auto-detect direction suffixes in filenames during setup
- Loop per-direction video assets independently for each Token
- Per-Token four/eight-direction switching in both image modes
- Single-character RPG Maker sprite-sheet mode with configurable frame size
- Save directional settings back to the actor's prototype token
- Optional warning controls
- Optional rotation animation override when `libWrapper` is active
- English and Simplified Chinese interface localization
- Upright sprite-sheet Tokens in scenes projected by `isometric-perspective`
- Optional world-level isometric screen-facing movement and HUD layout

## Expected image naming

If your token images share a naming pattern, the setup action can fill the flags automatically.

Examples:

- `hero_UP.webp`
- `hero_DOWN.webp`
- `hero_LEFT.webp`
- `hero_RIGHT.webp`
- `hero_UL.webp`
- `hero_UR.webp`
- `hero_DL.webp`
- `hero_DR.webp`

Lowercase suffixes also work.

## RPG Maker sprite sheets

Sprite-sheet mode accepts one RPG Maker-style image. Each row can represent a
direction and each column can be an animation frame. The default four-direction
mapping is:

| Row | Direction |
| --- | --- |
| 1 | Down |
| 2 | Left |
| 3 | Right |
| 4 | Up |

Enter the width and height of one frame and, if needed, a source crop X/Y offset
in Token Config. Then assign a one-based source row to each active direction.
Rows may be reused, so a missing diagonal can point to the same row as Up or
Down. Enabling eight directions exposes four additional row assignments.

World-level module settings provide the initial frame width, frame height, and
source row for each of the eight directions. These defaults are copied into new
sprite-sheet configurations; changing them does not overwrite values already
saved on existing Tokens. The built-in fallback remains 48×48 with the standard
four-row RPG Maker mapping.

The texture does not need to be evenly divisible by the frame size. Validation
only requires positive frame sizes and row numbers, non-negative crop offsets,
and enough texture bounds to contain every configured first-frame crop. The
module currently displays only the first frame in each row; it does not yet
play the walk animation. The current facing is stored in Token flags, while the
Token document's texture path is not rewritten on each move.

Separate directional images use the same facing-state approach. Directional
textures are preloaded and cached, movement synchronizes only a lightweight
facing flag, and the Token document's texture path is not rewritten after the
movement completes. This avoids a delayed mesh resize interrupting an active
mouse drag.

Separate-image mode also accepts Foundry's `.webm`, `.mp4`, `.m4v`, and `.ogv`
video formats. Each Token receives an independent muted video texture which
loops from the beginning when that direction becomes active. WebM is the
recommended format, especially when transparency is required. GIF and animated
WebP files remain image textures and are not supported as animated Token art;
their HUD preview may animate even when the canvas texture displays one frame.

## Setup

Enable the module in a world, then configure the module settings from Foundry's Configure Settings dialog.

For manual installation, use this manifest URL:

```text
https://raw.githubusercontent.com/FrankHZ/8bit-movementv14/v1.5.3/src/module.json
```

When installing a downloaded ZIP manually, the final directory must be named
`Data/modules/8bit-movement-frankhz/`, with `module.json` directly inside it.
The version-free `8bit-movement-frankhz.zip` is intended for Windows' default
Extract All workflow; a versioned ZIP may otherwise create a mismatched folder
name that Foundry will not recognize.

- **Token HUD mode** adds movement image controls to the token HUD. Its panel
  can be collapsed to a compact title bar and reopened with the visibility toggle. Both standard and isometric layouts place unboxed direction images over one continuous edge-to-edge preview background.
- **Token Settings mode** adds the same movement image controls to the Token Config appearance tab.
- The Token HUD can clear only the selected Token. Token Config additionally
  provides Save to Prototype and Clear All actions, where Clear All resets both
  the selected Token and its actor's prototype Token.
- **Use eight directions for this Token** enables the four diagonal directions
  for either separate images or a sprite sheet. It is stored per Token.
- **RPG Maker sprite sheet** can be selected as an alternative to separate
  direction images from the Token HUD or Token Config.
- **Only allow GM changes** restricts setup controls to GMs.
- **Disable Rotation Animation** registers a `libWrapper` wrapper that suppresses Foundry's rotation animation during combined texture/rotation updates.

To initialize a token, select it and click the activate button from the Token HUD or Token Config. If the current texture filename contains a direction suffix, the module infers sibling image paths. Otherwise, every direction starts with the current token texture and can be changed manually.

Enable **Isometric Perspective direction layout** in Module Settings when the world uses an isometric grid. Movement along Foundry's transformed canvas axes selects the matching screen-space facing (for example, moving southeast selects Down Right). Four-way HUD previews use the four corners of the standard-size grid; eight-way previews use a large diamond with matching padding over the same continuous background. Source-art positions remain stable: Down stays at the bottom of the eight-way diamond and Down Right stays at the lower right.

## Current status

- Manifest minimum and verified versions are Foundry VTT `13` and `14.367`
- Updated from earlier v10-v13 forks
- Smoke-tested on Foundry VTT `13.351` and `14.367`, including the v1.5.3
  separate-image movement fix on Foundry VTT `14.367`

## Development notes

Run the lightweight automated checks before committing:

- `npm test` runs dependency-free unit tests with Node's built-in test runner.
- `npm run check` syntax-checks all source scripts, parses key JSON files,
  verifies package/manifest version alignment and locale key parity, and runs
  the tests.
- `git diff --check` catches whitespace errors before commit.

See [`docs/architecture.md`](docs/architecture.md) for current module boundaries
and deliberately deferred refactor candidates.

The automated suite does not emulate the complete Foundry/PIXI runtime. For
future releases, repeat the cross-machine smoke test for Token HUD and Token
Config rendering, cardinal/diagonal movement, standard/isometric sprite layout,
and the optional `libWrapper` rotation wrapper.

## Release helper

Build both the manual-install ZIP and a versioned archive from `src/`:

```powershell
npm run release:package
```

The generated files are placed in `release/`. The version-free ZIP is convenient
for manual extraction, while the versioned ZIP is retained as a release archive.

This repo also includes a small helper for Foundry's Package Release API.

1. Copy `.env.example` to `.env.local` or set `FOUNDRY_RELEASE_TOKEN` in your shell.
2. Get the token from the package edit page on foundryvtt.com.
3. Keep `.env` and `.env.local` private; they are ignored by git.
4. Confirm the generated API payload:

   ```powershell
   npm run release:payload
   ```

5. Validate the release with Foundry without saving it:

   ```powershell
   npm run release:dry-run
   ```

6. Publish the release:

   ```powershell
   npm run release:publish
   ```

Before publishing, make sure the version in `src/module.json` has a matching pushed git tag such as `v1.5.4`. The API payload uses that tag for the version-specific manifest URL.

## Credits

This module exists because of work across several forks and maintenance passes.

- Original module by `Freeze` / `Freeze020`
  Original repo: https://gitlab.com/Freeze020/8bit-movement
- Later maintenance by `muhahahahe`
- v13 fork and maintenance by `darth-beedz`
- Current v14 fork and maintenance: `FrankHZ`
  Some local git history may appear under `FFang`, which is the same maintainer identity

If you are one of the previous maintainers and want the wording adjusted, I’m happy to refine the credit section.

## Notes

- `libWrapper` is optional and only used for the rotation animation override setting
- Settings that need reloads use Foundry's `requiresReload` setting option
- See `CHANGELOG` for earlier historical changes through the prior forks
