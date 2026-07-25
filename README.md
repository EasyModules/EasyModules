# EasyModules Hub

EasyModules Hub is the central launcher and integration point for the EasyModules suite for Foundry Virtual Tabletop.

It gives Gamemasters one place to open supported modules, access their configuration, and restore their registered settings when those actions are exposed by the module.

## Included integrations

- EasyLoot
- EasyMagicItems
- EasyTrials
- EasyWounds
- Additional upcoming EasyModules products

The Hub does not include the other modules. Each product is installed separately.

## Installation

Install the module in Foundry VTT using this manifest URL:

```text
https://raw.githubusercontent.com/EasyModules/EasyModules/main/module.json
```

After installation, enable **EasyModules Hub** in the world's module settings. A toolbox button will be added to the scene controls for Gamemasters.

## Public API

The Hub exposes its API through `game.easyModules` and through the module API for `easy-modules`.

```js
await game.easyModules.open();
await game.easyModules.openConfiguration("easy-loot");
await game.easyModules.restoreDefaults("easy-loot");
```

Other modules may register dashboard entries:

```js
game.easyModules.register({
  id: "example-module",
  moduleIds: ["example-module"],
  title: "Example Module",
  description: "Example integration.",
  iconClass: "fas fa-puzzle-piece",
  launchMethods: ["open"],
  configureMethods: ["configure"],
  resetMethods: ["restoreDefaults"]
});
```

## Integration hooks

The Hub supports module-specific and generic hooks for configuration and reset actions. Asynchronous handlers must register their promise immediately with `payload.defer(...)`.

```js
Hooks.on("easyModules:easy-trials:reset", payload => {
  payload.defer(game.easyTrials.restoreDefaults());
});
```

Synchronous handlers may use `payload.markHandled(result)`.

Generic hooks:

- `easyModulesConfigure`
- `easyModulesReset`
- `easyModules:<module-id>:configure`
- `easyModules:<module-id>:reset`

## Compatibility

- Foundry Virtual Tabletop v14
- Verified with build 364

See [COMPATIBILITY.md](COMPATIBILITY.md) for update-risk notes and recommended regression tests.

## Support

Report bugs and compatibility issues through the repository's [Issues](https://github.com/EasyModules/EasyModules/issues) page.

## License

Copyright (c) 2026 EasyModules. All rights reserved. See [LICENSE](LICENSE).
