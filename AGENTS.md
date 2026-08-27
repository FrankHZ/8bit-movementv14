# Agent Notes

This repository is a Foundry Virtual Tabletop module for v13/v14. Keep changes small and test in Foundry when behavior touches hooks, token documents, canvas rendering, or settings.

## Project Layout

- `src/module.json`: Foundry module manifest.
- `src/scripts/main.js`: module hooks, settings registration, and optional `libWrapper` registration.
- `src/scripts/settings.js`: module setting definitions.
- `src/scripts/functions.js`: directional texture setup, movement update hooks, preview/persist logic.
- `src/scripts/sprite-sheet.js`: row-mapped sprite-sheet validation, frame cropping, texture caching, and Token render hooks.
- `src/scripts/ui.js`: public UI facade.
- `src/scripts/ui/`: Token HUD, Token Config, sprite previews, DOM helpers, and shared UI data.
- `src/css/8bitmovement.css`: HUD and Token Config styling.
- `src/lang/en.json`: English localization strings.

## Development Rules

- Preserve compatibility with Foundry VTT v13 and v14 unless the task explicitly changes support.
- Prefer Foundry APIs and current v13/v14 patterns over older jQuery-only approaches.
- Do not reintroduce manual `window.location.reload()` callbacks for settings; use `requiresReload: true`.
- `libWrapper` is optional. Code must work when it is not active.
- Keep `libWrapper.register` calls during or after Foundry's `init` hook.
- Avoid raw `innerHTML` for image paths or user-controlled values in UI code.
- Four/eight-direction mode is a per-Token flag. The hidden world setting exists only as a compatibility fallback for older Tokens.
- Sprite-sheet source crop offsets are distinct from Token display offsets. Source rows are one-based and may be shared by multiple directions.
- Token Config field edits should use `{ render: false }`; rebuild only the module fieldset when its structure changes.
- Do not commit generated zip files unless the task is explicitly about packaging a release.

## Versioning and Local Release

- The current development release is `1.5.0`.
- Keep `package.json` and `src/module.json` versions identical.
- Record this development cycle under one `1.5.0` CHANGELOG entry; avoid interim local patch-version entries.
- `src/` is canonical. The unpacked `release/8bit-movement-frankhz/` directory and versioned zip are generated local test artifacts.
- Local packaging or linking does not authorize pushing tags, publishing a GitHub release, or calling Foundry's release API.

## Useful Checks

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
- Test source frame size, crop offsets, repeated direction rows, and out-of-bounds validation.
- Confirm sprite previews and rendered Tokens use the first frame from every configured row.
- Collapse and reopen the HUD panel, then confirm its state survives a HUD re-render.
- Test locking/unlocking movement settings.
- Test Save to Prototype, Clear Token, and Clear All independently.
- If `libWrapper` is active, enable Disable Rotation Animation and confirm wrapper registration appears in the console.
