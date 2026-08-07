# EasyModules Hub 1.0.7 — Compatibility and Update Resilience

## Supported environment

- Foundry Virtual Tabletop v13 and v14
- Verified with v14 build 364

EasyModules uses Foundry's public `ApplicationV2`, Handlebars application, dialog, hook, settings, notification, Folder, Macro, and module API surfaces.

## Integration model

Child modules may expose actions through their module API, a supported global API alias, integration hooks, or registered Foundry settings. The Hub only resolves APIs from active modules and does not attempt to activate or install modules itself.

The public Hub API is available through:

```js
game.easyModules
```

and through the `api` property of the active `easy-modules` package.

## Scene-control launcher

Launcher behavior is intentionally version-specific.

- **Foundry v14:** EasyModules uses its original lightweight top-level SceneControl with no child tools. Foundry v14 makes both `tools` and `activeTool` optional for a SceneControl, so the Hub can remain a dedicated gear outside Token, Tiles, Actors, and other native groups. Its callback is gated to activation and verifies the committed active control before opening, preventing deactivation/control-switch events from reopening a closed Hub.
- **Foundry v13:** EasyModules does not register a top-level SceneControl. Foundry v13 requires both `tools` and `activeTool`, which would force the Hub launcher into persistent tool state. Instead, the Hub creates the GM-only world macro **Open EasyModules Hub** and places it in `EASYMODULES/EasyModules`.

The public `game.easyModules.open()` API is unchanged on both versions.

## Macro organization

For Gamemasters, recognized EasyModules macros are organized into `EASYMODULES/<module>` folders. The migration is deliberately conservative: a macro must have a shared EasyModules owner flag, a recognized module-owned flag, or an explicit reference to an EasyModules module/API in its command before the Hub will move it.

The organizer runs once when the world reaches `ready` and also reacts to locally created or retagged macros. It does not rename macros and does not move unrelated macros.

## Update resilience

The module avoids direct modification of Foundry core documents and does not patch private core methods. Its main update-sensitive areas are:

- `ApplicationV2` and `HandlebarsApplicationMixin` lifecycle behavior;
- the `getSceneControlButtons` hook and SceneControlTool contract;
- world Folder and Macro document creation/update behavior;
- module API resolution through `game.modules`;
- Foundry's settings registry structure;
- Font Awesome icon availability.

A future Foundry major version may require updates if any of these public interfaces change.

## Recommended regression tests

After a Foundry update:

1. Enable EasyModules in clean v13- and v14-compatible worlds.
2. On v14, confirm the dedicated EasyModules gear appears as its own top-level scene control and does not appear inside Token, Tiles, or Actors.
3. On v14, open the Hub, close it, then switch repeatedly between Tokens, Actors, Tiles, and other scene controls. Confirm the Hub stays closed until the EasyModules gear is clicked again.
4. On v13, confirm no EasyModules scene-control button is injected and confirm **Open EasyModules Hub** exists in `EASYMODULES/EasyModules` and opens the Hub.
5. Reload a v13 world and confirm the launcher macro is reused rather than duplicated.
6. Open and resize the dashboard.
7. Confirm module order, released Free badges, and the EasyRest upcoming card.
8. Test Open, Configure, and Restore Defaults for each active child module.
9. Confirm inactive or missing modules show the unavailable message without console errors.
10. Confirm an existing EasyTraps Create Trap macro is moved to `EASYMODULES/EasyTraps` and receives `flags.easy-modules.owner = "easy-traps"`.
11. Confirm an EasyQOL loader macro that explicitly imports from `/modules/easy-qol/` is moved to `EASYMODULES/EasyQOL`.
12. Confirm unrelated user macros remain in their original folders.
13. Test `game.easyModules.organizeMacros()` and `game.easyModules.claimMacro(...)` from the console.
14. Confirm the Patreon link opens in a new browser tab.
15. Test dynamic registration, unregistration, and refresh through `game.easyModules`.
16. Review the browser console for warnings or deprecated API notices.

## Child-module compatibility

EasyModules supports multiple historical IDs and API aliases for selected suite modules. Child modules should preferably expose a stable module API and preserve their public launch, configuration, and reset methods between minor releases.

When a child module creates a world Macro, it should preferably set `flags.easy-modules.owner` to its canonical module ID or call `game.easyModules.claimMacro(macro, moduleId)` after creation. The Hub still recognizes existing module-specific flags for backwards compatibility.
