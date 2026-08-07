# EasyModules Hub 1.0.6 — Compatibility and Update Resilience

## Supported environment

- Foundry Virtual Tabletop v13 and v14
- Verified with v14 build 364

EasyModules uses Foundry's public `ApplicationV2`, Handlebars application, dialog, hook, settings, notification, and module API surfaces.

## Integration model

Child modules may expose actions through their module API, a supported global API alias, integration hooks, or registered Foundry settings. The Hub only resolves APIs from active modules and does not attempt to activate or install modules itself.

The public Hub API is available through:

```js
game.easyModules
```

and through the `api` property of the active `easy-modules` package.

## Update resilience

The module avoids direct modification of Foundry core documents and does not patch private core methods. Its main update-sensitive areas are:

- `ApplicationV2` and `HandlebarsApplicationMixin` lifecycle behavior;
- the `getSceneControlButtons` hook contract;
- module API resolution through `game.modules`;
- Foundry's settings registry structure;
- Font Awesome icon availability.

A future Foundry major version may require updates if any of these public interfaces change.

## Recommended regression tests

After a Foundry update:

1. Enable EasyModules in clean v13- and v14-compatible worlds.
2. Confirm the dedicated EasyModules gear control appears in the left scene controls for Gamemasters only.
3. Open and resize the dashboard.
4. Confirm module order, released Free badges, and the EasyRest upcoming card.
5. Test Open, Configure, and Restore Defaults for each active child module.
6. Confirm inactive or missing modules show the unavailable message without console errors.
7. Confirm the Patreon link opens in a new browser tab.
8. Test dynamic registration, unregistration, and refresh through `game.easyModules`.
9. Review the browser console for warnings or deprecated API notices.

## Child-module compatibility

EasyModules supports multiple historical IDs and API aliases for selected suite modules. Child modules should preferably expose a stable module API and preserve their public launch, configuration, and reset methods between minor releases.
