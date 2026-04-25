# 8bit Movement v14

`8bit-movement` lets a token swap between directional images so movement feels closer to old-school 8-bit RPGs. You can configure four-direction movement or enable diagonals for eight-direction sprites.

This fork is focused on Foundry Virtual Tabletop v13 and v14 compatibility. It has been locally tested on Foundry VTT v13.351 and targets compatibility through v14.360.

## Features

- Set directional token images from the Token HUD
- Configure the same images from Token Config
- Auto-detect direction suffixes in filenames during setup
- Optional diagonal support using `UL`, `UR`, `DL`, and `DR` from either setup UI
- Save directional settings back to the actor's prototype token
- Optional warning controls
- Optional rotation animation override when `libWrapper` is active

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

## Setup

Enable the module in a world, then configure the module settings from Foundry's Configure Settings dialog.

- **Token HUD mode** adds movement image buttons to the token HUD.
- **Token Settings mode** adds the same movement image controls to the Token Config appearance tab.
- **Diagonal mode** enables four extra diagonal image slots.
- **Only allow GM changes** restricts setup controls to GMs.
- **Disable Rotation Animation** registers a `libWrapper` wrapper that suppresses Foundry's rotation animation during combined texture/rotation updates.

To initialize a token, select it and click the activate button from the Token HUD or Token Config. If the current texture filename contains a direction suffix, the module infers sibling image paths. Otherwise, every direction starts with the current token texture and can be changed manually.

## Current status

- Targeted at Foundry VTT `13` through `14.360`
- Updated from earlier v10-v13 forks
- Locally tested on Foundry VTT `13.351`
- Still needs more real-world testing on Foundry v14 before calling it fully stable

## Development notes

This module does not currently have an automated test suite. Useful checks before committing:

- `node --check src/scripts/main.js`
- `node --check src/scripts/functions.js`
- `node --check src/scripts/ui.js`
- `node -e "JSON.parse(require('fs').readFileSync('src/lang/en.json','utf8'))"`

Runtime behavior still needs to be checked in Foundry itself, especially Token HUD rendering, Token Config rendering, movement texture swaps, diagonal movement, and the optional `libWrapper` rotation wrapper.

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
