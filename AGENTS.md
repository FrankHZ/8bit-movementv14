# Agent Notes

This repository is a Foundry Virtual Tabletop module for v13/v14. Keep changes small and test in Foundry when behavior touches hooks, token documents, canvas rendering, or settings.

## Project Layout

- `src/module.json`: Foundry module manifest.
- `src/scripts/main.js`: module hooks, settings registration, and optional `libWrapper` registration.
- `src/scripts/settings.js`: module setting definitions.
- `src/scripts/functions.js`: directional texture setup, movement update hooks, preview/persist logic.
- `src/scripts/ui.js`: Token HUD and Token Config UI injection.
- `src/css/8bitmovement.css`: HUD and Token Config styling.
- `src/lang/en.json`: English localization strings.

## Development Rules

- Preserve compatibility with Foundry VTT v13 and v14 unless the task explicitly changes support.
- Prefer Foundry APIs and current v13/v14 patterns over older jQuery-only approaches.
- Do not reintroduce manual `window.location.reload()` callbacks for settings; use `requiresReload: true`.
- `libWrapper` is optional. Code must work when it is not active.
- Keep `libWrapper.register` calls during or after Foundry's `init` hook.
- Avoid raw `innerHTML` for image paths or user-controlled values in UI code.
- Do not commit generated zip files unless the task is explicitly about packaging a release.

## Useful Checks

Run syntax checks after script edits:

```bash
node --check src/scripts/main.js
node --check src/scripts/functions.js
node --check src/scripts/ui.js
```

Validate localization JSON after editing translations:

```bash
node -e "JSON.parse(require('fs').readFileSync('src/lang/en.json','utf8'))"
```

Manual Foundry checks are still important:

- Toggle each module setting and confirm it persists.
- Open Token HUD and Token Config on a token with and without module flags.
- Test cardinal and diagonal movement texture swaps.
- Test locking/unlocking movement settings.
- Test saving and clearing actor prototype token settings.
- If `libWrapper` is active, enable Disable Rotation Animation and confirm wrapper registration appears in the console.
