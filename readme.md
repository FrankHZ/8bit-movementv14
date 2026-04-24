# 8bit Movement v14

`8bit-movement` lets a token swap between directional images so movement feels closer to old-school 8-bit RPGs. You can configure four-direction movement or enable diagonals for eight-direction sprites.

This fork is focused on Foundry Virtual Tabletop v13 and v14 compatibility.

## Features

- Set directional token images from the Token HUD
- Configure the same images from Token Config
- Auto-detect direction suffixes in filenames during setup
- Optional diagonal support using `UL`, `UR`, `DL`, and `DR`
- Save directional settings back to the actor's prototype token
- Optional warning controls and rotation animation handling

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

## Current status

- Targeted at Foundry VTT `13` through `14.360`
- Updated from earlier v10-v13 forks
- Still needs more real-world testing across both Foundry v13 and v14 before calling it fully stable

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
- See `CHANGELOG` for earlier historical changes through the prior forks
