# EasyModules 1.2.1 — Compatibility and Update Resilience

## Scope

EasyModules is a launcher and integration hub. Its main compatibility surface is not game data; it is the public Foundry application lifecycle, scene controls, module metadata, settings, hooks, and the public APIs exposed by the other EasyModules products.

## Risk summary

| Update type | Estimated risk | Main exposure |
|---|---:|---|
| Foundry v14 patch update | Low | ApplicationV2 rendering and scene-control hook shape |
| Foundry major update | Moderate | Scene controls, ApplicationV2 options, settings internals, module lifecycle hooks |
| EasyModules child-module patch | Low | Method names and API availability |
| EasyModules child-module major update | Moderate | Renamed launch/config/reset methods or removed global API aliases |
| Third-party module update | Low | EasyModules does not patch third-party code |
| Compendium update | None / negligible | The hub does not read or modify compendium contents |
| Localization update | Low | Missing keys fall back visibly but do not corrupt data |

## Hardening included through 1.2.1

1. **Registry-first integration**
   - Public API operations now resolve both built-in and dynamically registered entries.
   - Registering or unregistering an entry refreshes an open dashboard.

2. **Safer API resolution**
   - Module APIs are used only when the owning module is active.
   - Legacy global API aliases remain supported for backward compatibility.

3. **Explicit asynchronous hook contract**
   - Integration payloads expose `defer(promise)` for asynchronous configuration and reset work.
   - The hub waits for deferred work before deciding whether to use its fallback behavior.
   - `markHandled(result)` remains available for synchronous integrations.

4. **Method binding preservation**
   - Child-module methods are invoked with their API object as `this`, preventing failures in APIs that depend on method context.

5. **Registry validation and normalization**
   - IDs and method-name arrays are normalized.
   - Duplicate module IDs and API names are removed.
   - Registry revision changes are tracked.

6. **Defensive settings fallback**
   - Missing settings registries are handled without throwing.
   - Individual setting failures remain isolated and reported.

7. **Defensive scene-control integration**
   - Both array-based and object-based control collections are accepted.
   - Unknown control payloads are ignored rather than mutated unsafely.

8. **HTML escaping**
   - Dynamic module titles and localized messages are escaped before being inserted into dialog HTML.

9. **Frozen public configuration snapshot**
   - Consumers cannot accidentally mutate the exported hub configuration object.

10. **Gamemaster-only operations**
   - Dashboard, configuration, and reset actions reject non-Gamemaster callers, including direct public API calls.

11. **Disabled-module API isolation**
   - Legacy global API aliases are considered only while the owning module is active, preventing stale globals from launching disabled modules.

## Remaining update-sensitive areas

### Foundry scene controls

`getSceneControlButtons` is a public integration point, but its data structure has changed across Foundry generations. Version 1.2.1 supports the v14 record shape and retains a defensive array fallback for older integrations. A future major Foundry release could replace the callback contract entirely.

**Mitigation:** all scene-control construction is isolated in one hook near the end of `scripts/main.mjs`.

### ApplicationV2 and DialogV2

The dashboard uses `ApplicationV2`, `HandlebarsApplicationMixin`, and `DialogV2`. These are the correct public v14 APIs, but major releases may rename options, lifecycle properties, or render signatures.

**Mitigation:** UI framework usage is concentrated in `scripts/dashboard.mjs`.

### Settings registry fallback

The generic Restore Defaults fallback reads `game.settings.settings`, which is stable in v14 but more coupled to Foundry internals than calling a child module's explicit reset API.

**Preferred integration order:**

1. child module reset API;
2. EasyModules reset hook;
3. generic registered-settings fallback.

Child modules should expose an explicit reset method whenever they store data outside `game.settings` or require side effects after reset.

### Child-module API names

Built-in entries intentionally support several historical method names. This improves backward compatibility but cannot guarantee compatibility with an unrelated future rename.

**Mitigation:** update only the corresponding method array in `scripts/suite.mjs`, without changing dashboard code.

### Asynchronous hooks

Foundry's native `Hooks.callAll` is synchronous. EasyModules adds `payload.defer(promise)` as its own cooperative protocol. Integrations must call `defer` synchronously from the hook callback; calling it after an unrelated awaited operation is too late.

Example:

```js
Hooks.on("easyModules:easy-example:reset", payload => {
  payload.defer(resetEverything());
});
```

## Recommended regression tests after updates

1. Open the hub from scene controls as a GM.
2. Confirm non-GM users do not receive the scene control.
3. Verify Active, Disabled, Not Installed, and Coming Soon states.
4. Launch every active suite module.
5. Open configuration for every active suite module.
6. Restore defaults through an explicit child-module API.
7. Restore defaults through a synchronous integration hook.
8. Restore defaults through `payload.defer(...)`.
9. Restore defaults through the generic settings fallback.
10. Register and unregister an external dashboard entry while the dashboard is open.
11. Disable and re-enable a child module, then reopen the dashboard.
12. Verify dialogs safely render unusual module titles containing `<`, `>`, `&`, quotes, or apostrophes.
13. Confirm dashboard resizing at wide, medium, and narrow widths.
14. Confirm all English localization keys resolve without raw key strings.

## Release policy recommendation

Do not raise the manifest `verified` version solely because Foundry starts successfully. Run the regression list above against the exact Foundry build before updating `compatibility.verified`.
