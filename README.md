# EasyModules

follow for more... https://www.patreon.com/EasyModules

EasyModules is the central launcher and integration hub for the EasyModules suite for Foundry Virtual Tabletop.

Open supported modules, access their configuration, restore registered settings, and discover upcoming tools from one clean interface.

## Modules

- **EasyLoot — Free:** Generates immersive, balanced loot tailored to each creature's name, type, and Challenge Rating.
- **EasyMagicItems — Free:** Creates a cinematic magic-item selection experience with personalized recommendations and advanced filters.
- **EasyTrials — Free:** Creates a cinematic experience for saving throws, skill checks, and group checks.
- **EasyWounds — Free:** Adds dynamic wound overlays, health-based tinting, critical-health effects, and damage-specific visual wounds.
- **EasyShops — Free:** Generates balanced and immersive shops based on party level, store specialty, stock categories, and configurable item sources.
- **EasyTraps — Free:** Provides an intuitive workflow for creating and automating traps with configurable triggers, targets, areas, sounds, and visual effects.

Coming next: **EasyRest**.

The Hub does not bundle the other modules. Each product is installed separately, allowing you to use only the modules that fit your game.

## Installation

Install the module in Foundry VTT using this manifest URL:

```text
https://github.com/EasyModules/EasyModules/releases/latest/download/module.json
```

After installation, enable **EasyModules** in the world's module settings.

Gamemasters can open the Hub from the EasyModules gear button in the scene controls.

## Patreon

Follow development, see upcoming projects, and support EasyModules:

https://www.patreon.com/EasyModules

## Compatibility

- Foundry Virtual Tabletop v14
- Verified with build 364

See [COMPATIBILITY.md](COMPATIBILITY.md) for update-risk notes and recommended regression tests.

Individual EasyModules products may have their own system or module requirements. Check each module's repository for additional compatibility information.

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

Registered integrations may also be removed:

```js
game.easyModules.unregister("example-module");
```

## Integration Hooks

Asynchronous handlers must register their promise immediately with `payload.defer(...)`.

```js
Hooks.on("easyModules:easy-trials:reset", payload => {
  payload.defer(game.easyTrials.restoreDefaults());
});
```

Synchronous handlers may use:

```js
payload.markHandled(result);
```

Supported generic hooks:

- `easyModulesConfigure`
- `easyModulesReset`
- `easyModules:<module-id>:configure`
- `easyModules:<module-id>:reset`

## Support

Report problems with the EasyModules Hub through GitHub Issues:

https://github.com/EasyModules/EasyModules/issues

Browse all EasyModules repositories:

https://github.com/EasyModules

Follow release announcements and development updates on Patreon:

https://www.patreon.com/EasyModules

## Development Disclosure

EasyModules is developed with AI-assisted coding and design tools under the direction, testing, review, and maintenance of EasyModules.

The project is not presented as “Zero AI.”

## License and Third-Party Notices

EasyModules is distributed under the proprietary [EasyModules Software License](LICENSE).

Foundry Virtual Tabletop and other third-party names remain the property of their respective owners.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution, trademark, and runtime-integration notices.
