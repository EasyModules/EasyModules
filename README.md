# EasyModules

follow for more... https://www.patreon.com/EasyModules

EasyModules is the central launcher and integration hub for the EasyModules suite for Foundry Virtual Tabletop.

Open supported modules, access their configuration, restore registered settings, and discover upcoming tools from one clean interface.

## Modules

- **EasyLoot — Free:** Generates immersive, balanced drops tailored to each creature's name, type, and Challenge Rating.
- **EasyMagicItems — Free:** Uses personalized filters to recommend useful magic items for each character.
- **EasyTrials — Early Access:** Creates a cinematic experience for saving throws, ability checks, and group checks.
- **EasyWounds — Early Access:** Adds blood overlays, health-based red tinting, critical-health pulses, and evolving visual wounds.

Coming next: **EasyShops** and **EasyTraps**.

The Hub does not bundle the other modules. Each product is installed separately.

## Installation

Install the module in Foundry VTT using this manifest URL:

```text
https://raw.githubusercontent.com/EasyModules/EasyModules/main/module.json
```

After installation, enable **EasyModules** in the world's module settings. Gamemasters can open it from the EasyModules gear button in the scene controls.

## Patreon

Support development and help shape future EasyModules releases:

https://www.patreon.com/EasyModules

## Compatibility

- Foundry Virtual Tabletop v14
- Verified with build 364

See [COMPATIBILITY.md](COMPATIBILITY.md) for update-risk notes and recommended regression tests.

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

## Support

Support development and access EasyModules releases and report bugs through [Patreon](https://www.patreon.com/EasyModules).

## License and third-party notices

EasyModules is distributed under the proprietary [EasyModules Software License](LICENSE).

Foundry Virtual Tabletop and other third-party names remain the property of their respective owners. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution, trademark, and runtime-integration notices.
