# EasyModules Hub

Follow for more... https://www.patreon.com/EasyModules

EasyModules is the central launcher and integration hub for the EasyModules suite for Foundry Virtual Tabletop.

Open supported modules, access their configuration, restore registered settings, and discover upcoming tools from one compact interface.

## Released modules

- **EasyLoot — Free:** Generates immersive, balanced drops tailored to each creature's name, type, and Challenge Rating.
- **EasyMagicItems — Free:** Uses personalized filters to recommend useful magic items for each character.
- **EasyTrials — Free:** Creates a cinematic experience for saving throws, ability checks, and group checks.
- **EasyWounds — Free:** Adds health-based tinting, pulses, blood overlays, and evolving visual wounds.
- **EasyShops — Free:** Builds and runs immersive shops with minimal setup.
- **EasyTraps — Free:** Creates and automates cinematic traps quickly.

Coming next: **EasyRest**.

The Hub does not bundle the other modules. Each product is installed separately.

## Installation

Install the module in Foundry VTT using this manifest URL:

```text
https://github.com/EasyModules/EasyModules/releases/latest/download/module.json
```

After installation, enable **EasyModules** in the world's module settings.

- **Foundry v14:** Gamemasters get the original dedicated **EasyModules** gear in the left scene controls. It is not placed inside Token, Tiles, or another native control group.
- **Foundry v13:** the Hub deliberately does not add a scene-control button because v13 requires every top-level SceneControl to own an active tool. Instead, the Hub creates **Open EasyModules Hub** in `EASYMODULES/EasyModules`; drag that macro to the hotbar if desired.

In both versions the public `game.easyModules.open()` API remains available.

## Macro organization

For Gamemasters, the Hub automatically keeps recognized EasyModules macros under a shared folder structure:

```text
EASYMODULES
├── EasyModules
├── EasyLoot
├── EasyMagicItems
├── EasyTrials
├── EasyWounds
├── EasyShops
├── EasyTraps
└── EasyQOL
```

Subfolders are created only when a matching macro exists. Existing recognized macros are migrated when the world becomes ready, and newly created or retagged EasyModules macros are organized automatically.

The Hub identifies managed macros conservatively through the shared `flags.easy-modules.owner` marker, existing module-owned flags, or an explicit EasyModules module/API reference in the macro command. Macros unrelated to EasyModules are not moved.

Child modules may explicitly claim a macro and let the Hub place it correctly:

```js
await game.easyModules.claimMacro(macro, "easy-traps");
```

The owner marker used by the Hub is:

```js
flags: {
  "easy-modules": {
    owner: "easy-traps"
  }
}
```

## More modules

Discover current releases and project updates at:

https://www.patreon.com/EasyModules

## Compatibility

- Foundry Virtual Tabletop v13 and v14
- Verified with v14 build 364

See [COMPATIBILITY.md](COMPATIBILITY.md) for update-risk notes and recommended regression tests.

## Public API

The Hub exposes its API through `game.easyModules` and through the module API for `easy-modules`.

```js
await game.easyModules.open();
await game.easyModules.openConfiguration("easy-loot");
await game.easyModules.restoreDefaults("easy-loot");
await game.easyModules.refresh();
await game.easyModules.organizeMacros();
```

Other modules may register or replace dashboard entries:

```js
game.easyModules.register({
  id: "example-module",
  moduleIds: ["example-module"],
  globalApis: ["exampleModule"],
  title: "Example Module",
  description: "Example integration.",
  iconClass: "fas fa-puzzle-piece",
  status: "available",
  launchMethods: ["open"],
  configureMethods: ["configure"],
  resetMethods: ["restoreDefaults"]
});
```

Modules that load independently can wait for either lifecycle hook:

```js
Hooks.once("easyModulesReady", hub => {
  hub.register({
    id: "easy-rest",
    moduleIds: ["easy-rest"],
    globalApis: ["easyRest"],
    title: "EasyRest",
    description: "Coordinate cinematic group rests.",
    iconClass: "fas fa-campground",
    status: "available",
    launchMethods: ["open", "start"],
    configureMethods: ["openConfiguration", "configure"],
    resetMethods: ["restoreDefaults"]
  });
});
```

## Integration hooks

Asynchronous handlers must register their promise immediately with `payload.defer(...)`.

```js
Hooks.on("easyModules:easy-trials:reset", payload => {
  payload.defer(game.easyTrials.restoreDefaults());
});
```

Synchronous handlers may use `payload.markHandled(result)`.

Supported generic hooks:

- `easyModulesConfigure`
- `easyModulesReset`
- `easyModules:<module-id>:configure`
- `easyModules:<module-id>:reset`
- `easyModulesReady`
- `easyModules:ready`

## Support

Report bugs and compatibility issues through the repository's [Issues](https://github.com/EasyModules/EasyModules/issues) page.

## Development disclosure

EasyModules is developed with AI-assisted coding and design tools under the direction, testing, review, and maintenance of EasyModules.

The project is not presented as “Zero AI.”

## License and third-party notices

EasyModules is distributed under the proprietary [EasyModules Software License — Version 1.0](LICENSE).

Foundry Virtual Tabletop and other third-party names remain the property of their respective owners. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution, trademark, and runtime-integration notices.
