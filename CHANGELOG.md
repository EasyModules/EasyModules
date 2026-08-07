# Changelog

## 1.0.7

- Restored the original dedicated EasyModules top-level gear launcher on Foundry v14; it is no longer attached to Token or any other native scene-control group.
- Added a stronger v14 launcher guard so closing the Hub and then switching to Actors, Tiles, Tokens, or another scene control does not reopen it.
- Removed the v13 SceneControl compatibility shim entirely. Foundry v13 now receives no EasyModules scene-control button, avoiding invalid/persistent tool-state workarounds.
- Added an idempotent Foundry v13 fallback macro, **Open EasyModules Hub**, automatically created for Gamemasters in `EASYMODULES/EasyModules`.
- Added automatic EasyModules macro organization for Gamemasters under `EASYMODULES/<module>`.
- Added conservative migration of existing macros using the shared EasyModules owner flag, module-owned flags, and explicit EasyModules module/API references. Unrelated macros are left untouched.
- Added automatic organization for newly created or retagged managed macros.
- Added `game.easyModules.organizeMacros()`, `game.easyModules.organizeMacro(...)`, `game.easyModules.claimMacro(...)`, and macro-folder metadata to the public Hub API.
- Included EasyQOL and the Hub itself in the shared macro-folder registry without changing the dashboard release list.
- Standardized the Hub license to **EasyModules Software License — Version 1.0**.
- Synchronized package metadata and documentation for v1.0.7.

## 1.0.6

- Prepared the Hub for the next GitHub release with synchronized version metadata and documentation.
- Standardized the visible package title as **EasyModules Hub** while preserving the `easy-modules` package ID and `game.easyModules` public API.
- Updated scene-control callbacks so the Hub opens only when its control is activated, as an initial mitigation for unintended reopen behavior when switching away from the control on Foundry v13 or v14.
- Updated compatibility documentation for the dedicated top-level scene control and Foundry v13/v14 support.
- Restored the standard Patreon follow line and development disclosure in the README.

## 1.0.5

- Restored the dedicated EasyModules top-level gear control in the left scene controls.
- Removed the v1.0.4 workaround that attached the Hub launcher to native Token/Actor controls.
- Added a Foundry v13-specific SceneControl fallback with a valid active tool while preserving the original standalone launcher behavior on v14.
- Updated README launcher instructions and the public API version.

## 1.0.4

- Restored Foundry VTT v13 compatibility in the manifest.
- Replaced the v14-only empty SceneControl group with a real button tool in the native Token controls.
- Preserved the same EasyModules dashboard launch behavior on Foundry v13 and v14.
- Updated compatibility documentation and the public API version.

## 1.0.3

- Marked EasyTraps as a released Free module, leaving EasyRest as the only Coming Up Next entry.
- Connected the EasyTraps launch action to its public `createTrap` API, with library and manager fallbacks for compatibility.
- Connected EasyTraps configuration to its public `openSettings` API and retained generic reset fallback support.
- Updated release documentation, compatibility checks, and the Hub public API version.
- Adjusted the single upcoming-module card to use the full Coming Up Next row.
- Revalidated built-in module IDs and historical aliases so installed suite modules resolve to their fixed dashboard positions.
- Updated alias resolution to prefer an active installed package when both a current ID and a historical ID are present.

## 1.0.2

- Reworked the Hub into a cleaner, compact two-column layout so released modules and upcoming tools remain visible at common desktop window sizes.
- Added a Patreon discovery banner at the top of the Hub with neutral “check out more modules” wording.
- Marked EasyLoot, EasyMagicItems, EasyTrials, EasyWounds, and EasyShops as released Free modules.
- Moved EasyShops out of Coming Up Next and enabled its standard launch, configuration, reset, API, and hook integration paths.
- Added EasyRest to Coming Up Next with reserved module IDs, global API aliases, launch/configuration/reset method conventions, and registry support.
- Added `game.easyModules.refresh()` plus `easyModulesReady` and `easyModules:ready` lifecycle hooks for future modules.
- Preserved existing module IDs, API aliases, integration hooks, launch methods, configuration methods, and reset methods.
- Updated documentation and performed a consistency and cleanup pass.

## 1.0.1

- Marked EasyLoot and EasyMagicItems as Free in the Hub.
- Replaced Premium labels for EasyTrials and EasyWounds with Early Access.
- Updated Patreon wording to focus on supporting development.
- Preserved all existing module IDs, API aliases, integration hooks, launch methods, configuration methods, and reset methods.

## 1.0.0

First public release.
