import { EASY_MODULES_CONFIG } from "./config.mjs";
import { EASY_MODULES_SUITE } from "./suite.mjs";
import { EasyModulesRegistry } from "./registry.mjs";
import { EasyModulesDashboard } from "./dashboard.mjs";
import {
  EASY_MODULES_MACRO_FOLDERS,
  claimEasyModulesMacro,
  ensureEasyModulesHubLauncherMacro,
  isOrganizingEasyModulesMacro,
  organizeEasyModulesMacro,
  organizeEasyModulesMacros
} from "./macros.mjs";

const registry = new EasyModulesRegistry();
let dashboard = null;

function getDefinition(id) {
  return registry.get(id) ?? null;
}

function ensureGmAccess() {
  if (game.user?.isGM) return true;
  ui.notifications.warn(game.i18n.localize("EASYMODULES.Messages.GmOnly"));
  return false;
}

function openDashboard() {
  if (!ensureGmAccess()) return undefined;
  if (!dashboard?.rendered) dashboard = new EasyModulesDashboard(registry);
  return dashboard.render({ force: true });
}

function refreshDashboard() {
  if (dashboard?.rendered) return dashboard.render({ force: true });
  return undefined;
}

function findModule(definition) {
  const ids = definition?.moduleIds?.length
    ? definition.moduleIds
    : [definition?.moduleId ?? definition?.id].filter(Boolean);

  let installedFallback = null;
  for (const moduleId of ids) {
    const foundryModule = game.modules.get(moduleId);
    if (!foundryModule) continue;
    if (foundryModule.active) return foundryModule;
    installedFallback ??= foundryModule;
  }
  return installedFallback;
}

function findApi(definition) {
  const foundryModule = findModule(definition);
  if (!foundryModule?.active) return null;
  if (foundryModule.api) return foundryModule.api;

  for (const globalName of definition?.globalApis ?? []) {
    if (game[globalName]) return game[globalName];
  }
  return null;
}

async function invokeFirstMethod(api, methods, args = []) {
  for (const method of methods ?? []) {
    const candidate = api?.[method];
    if (typeof candidate === "function") {
      return { called: true, method, result: await candidate.apply(api, args) };
    }
  }
  return { called: false, method: null, result: undefined };
}

function hookNamesFor(definition, action) {
  const pascal = String(definition.id)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return [
    `easyModules${pascal}${action}`,
    `easyModules:${definition.id}:${action.toLowerCase()}`,
    `easyModules${action}`
  ];
}

async function emitIntegrationHooks(definition, action, extra = {}) {
  const pending = [];
  const payload = {
    source: EASY_MODULES_CONFIG.moduleId,
    moduleId: definition.id,
    resolvedModuleId: findModule(definition)?.id ?? definition.moduleIds?.[0] ?? definition.id,
    handled: false,
    result: undefined,
    markHandled(result) {
      this.handled = true;
      if (arguments.length) this.result = result;
      return result;
    },
    defer(promise) {
      this.handled = true;
      const tracked = Promise.resolve(promise).then(result => {
        if (result !== undefined) this.result = result;
        return result;
      });
      pending.push(tracked);
      return tracked;
    },
    ...extra
  };

  for (const hook of hookNamesFor(definition, action)) Hooks.callAll(hook, payload);
  if (pending.length) await Promise.all(pending);
  return payload;
}

async function openConfiguration(definition) {
  if (!ensureGmAccess()) return undefined;
  const api = findApi(definition);
  const invoked = await invokeFirstMethod(api, definition.configureMethods);
  if (invoked.called) return invoked.result;

  const payload = await emitIntegrationHooks(definition, "Configure", {
    api,
    tokens: [...(canvas?.tokens?.controlled ?? [])]
  });
  if (payload.handled) return payload.result;

  ui.notifications.info(game.i18n.format("EASYMODULES.Notifications.ConfigurationHookReady", { title: definition.title }));
  return undefined;
}

async function resetRegisteredSettings(definition) {
  const namespaces = new Set([
    ...(definition.moduleIds ?? []),
    definition.moduleId,
    definition.id,
    findModule(definition)?.id
  ].filter(Boolean));

  const registeredSettings = game.settings?.settings;
  if (!registeredSettings?.values) return { resetCount: 0, failures: [], unavailable: true };

  const settings = [...registeredSettings.values()].filter(setting => namespaces.has(setting.namespace));
  let resetCount = 0;
  const failures = [];

  for (const setting of settings) {
    try {
      const defaultValue = foundry.utils.deepClone(setting.default);
      await game.settings.set(setting.namespace, setting.key, defaultValue);
      resetCount += 1;
    } catch (error) {
      console.error(`EasyModules | Could not reset ${setting.namespace}.${setting.key}`, error);
      failures.push(`${setting.namespace}.${setting.key}`);
    }
  }

  return { resetCount, failures, unavailable: false };
}

async function restoreDefaults(definition) {
  if (!ensureGmAccess()) return undefined;
  const api = findApi(definition);
  const invoked = await invokeFirstMethod(api, definition.resetMethods);
  if (invoked.called) {
    ui.notifications.info(game.i18n.format("EASYMODULES.Notifications.SettingsRestored", { title: definition.title }));
    return invoked.result;
  }

  const payload = await emitIntegrationHooks(definition, "Reset", { api });
  if (payload.handled) {
    ui.notifications.info(game.i18n.format("EASYMODULES.Notifications.SettingsRestored", { title: definition.title }));
    return payload.result;
  }

  const { resetCount, failures, unavailable } = await resetRegisteredSettings(definition);
  if (unavailable) {
    ui.notifications.warn(game.i18n.format("EASYMODULES.Notifications.SettingsRegistryUnavailable", { title: definition.title }));
    return { resetCount: 0, failures: [], unavailable: true };
  }
  if (resetCount > 0 && failures.length === 0) {
    ui.notifications.info(game.i18n.format("EASYMODULES.Notifications.RestoredSettings", {
      title: definition.title,
      count: resetCount,
      settings: game.i18n.localize(resetCount === 1
        ? "EASYMODULES.Words.SettingSingular"
        : "EASYMODULES.Words.SettingPlural")
    }));
    return { resetCount, failures };
  }
  if (resetCount > 0) {
    ui.notifications.warn(game.i18n.format("EASYMODULES.Notifications.RestoredWithFailures", {
      title: definition.title,
      count: resetCount,
      failures: failures.length
    }));
    return { resetCount, failures };
  }

  ui.notifications.info(game.i18n.format("EASYMODULES.Notifications.NoSettings", { title: definition.title }));
  return { resetCount: 0, failures: [] };
}

function createEntry(definition) {
  const entry = {
    ...definition,
    moduleId: definition.moduleIds?.[0] ?? definition.id,
    icon: definition.icon ?? null,
    fallbackIcon: definition.fallbackIcon ?? null
  };

  if (definition.status !== "coming-soon") {
    if (typeof definition.onClick !== "function") {
      entry.onClick = async () => {
        const api = findApi(definition);
        const invoked = await invokeFirstMethod(api, definition.launchMethods);
        if (invoked.called) return invoked.result;
        return ui.notifications.warn(game.i18n.format("EASYMODULES.Notifications.ActionUnavailable", {
          title: definition.title,
          action: definition.actionLabelKey ? game.i18n.localize(definition.actionLabelKey) : definition.actionLabel
        }));
      };
    }
    if (typeof definition.onConfigure !== "function") entry.onConfigure = () => openConfiguration(definition);
    if (typeof definition.onReset !== "function") entry.onReset = () => restoreDefaults(definition);
  }

  return entry;
}

function registerBuiltInEntries() {
  for (const definition of EASY_MODULES_SUITE) registry.register(createEntry(definition));
}

function foundryGeneration() {
  const releaseGeneration = Number(game.release?.generation);
  if (Number.isFinite(releaseGeneration)) return releaseGeneration;

  const versionGeneration = Number(String(game.version ?? "").split(".")[0]);
  return Number.isFinite(versionGeneration) ? versionGeneration : 14;
}

function activeSceneControlName() {
  const control = ui.controls?.control;
  if (typeof control === "string") return control;
  return control?.name ?? null;
}

function eventSceneControlName(event) {
  const currentTargetName = event?.currentTarget?.dataset?.control;
  if (currentTargetName) return currentTargetName;

  const target = event?.target;
  const controlElement = target?.closest?.("[data-control]");
  return controlElement?.dataset?.control ?? null;
}

Hooks.once("init", () => {
  registerBuiltInEntries();

  const api = {
    register: definition => {
      const registered = registry.register(createEntry(definition));
      refreshDashboard();
      return registered;
    },
    unregister: id => {
      const removed = registry.unregister(id);
      if (removed) refreshDashboard();
      return removed;
    },
    get: id => registry.get(id),
    getAll: () => registry.getAll(),
    getSuite: () => foundry.utils.deepClone(EASY_MODULES_SUITE),
    resolveModule: id => {
      const definition = getDefinition(id);
      return definition ? findModule(definition) : null;
    },
    resolveApi: id => {
      const definition = getDefinition(id);
      return definition ? findApi(definition) : null;
    },
    open: openDashboard,
    openConfiguration: id => {
      const definition = getDefinition(id);
      return definition ? openConfiguration(definition) : undefined;
    },
    restoreDefaults: id => {
      const definition = getDefinition(id);
      return definition ? restoreDefaults(definition) : undefined;
    },
    config: Object.freeze({ ...EASY_MODULES_CONFIG }),
    refresh: refreshDashboard,
    organizeMacros: organizeEasyModulesMacros,
    organizeMacro: (macro, options) => organizeEasyModulesMacro(macro, options),
    claimMacro: (macro, ownerId) => claimEasyModulesMacro(macro, ownerId),
    macroFolders: EASY_MODULES_MACRO_FOLDERS,
    version: "1.0.7"
  };

  game.easyModules = api;
  Hooks.callAll("easyModulesReady", api);
  Hooks.callAll("easyModules:ready", api);
  const self = game.modules.get(EASY_MODULES_CONFIG.moduleId);
  if (self) self.api = api;

  const version = self?.version ?? "unknown";
  console.log(`${EASY_MODULES_CONFIG.moduleId} | Initializing v${version}`);
});

Hooks.on("getSceneControlButtons", controls => {
  if (!game.user?.isGM || !controls || typeof controls !== "object") return;

  // Foundry v13 requires a SceneControl to own an active tool and tools record.
  // EasyModules is a launcher, not a canvas mode, so v13 deliberately receives
  // no scene-control entry. The ready hook creates a dedicated launcher macro
  // instead. Foundry v14 supports the original lightweight top-level control.
  if (foundryGeneration() < 14) return;

  const controlName = EASY_MODULES_CONFIG.control.name;
  if (controls[controlName]) return;

  const title = game.i18n.localize(EASY_MODULES_CONFIG.control.titleKey);
  const existingOrders = Object.values(controls)
    .map(control => Number(control?.order))
    .filter(Number.isFinite);
  const order = existingOrders.length ? Math.max(...existingOrders) + 1 : 0;

  controls[controlName] = {
    name: controlName,
    title,
    icon: EASY_MODULES_CONFIG.control.icon,
    order,
    visible: true,
    onChange: (event, active) => {
      if (active !== true) return undefined;
      const eventControl = eventSceneControlName(event);
      if (eventControl && eventControl !== controlName) return undefined;

      // Wait until Foundry has committed the requested control. This extra
      // guard keeps deactivation/control-switch events from reopening a Hub
      // window the user intentionally closed, while the event identity still
      // allows the original v14 gear click to open if UI state is one tick late.
      queueMicrotask(() => {
        const currentControl = activeSceneControlName();
        if (!eventControl && currentControl && currentControl !== controlName) return;
        openDashboard();
      });
      return undefined;
    }
  };
});

Hooks.on("createMacro", (macro, _options, userId) => {
  if (!game.user?.isGM || userId !== game.user.id) return;
  organizeEasyModulesMacro(macro).catch(error => {
    console.error(`EasyModules | Could not organize newly created macro ${macro?.name ?? macro?.id ?? "unknown"}.`, error);
  });
});

Hooks.on("updateMacro", (macro, changes, _options, userId) => {
  if (!game.user?.isGM || userId !== game.user.id || isOrganizingEasyModulesMacro(macro?.id)) return;
  if (!("command" in (changes ?? {})) && !("flags" in (changes ?? {}))) return;

  organizeEasyModulesMacro(macro).catch(error => {
    console.error(`EasyModules | Could not reorganize updated macro ${macro?.name ?? macro?.id ?? "unknown"}.`, error);
  });
});

Hooks.once("ready", async () => {
  console.log(`${EASY_MODULES_CONFIG.moduleId} | Ready. API: game.easyModules`);

  if (!game.user?.isGM) return;

  if (foundryGeneration() < 14) {
    try {
      await ensureEasyModulesHubLauncherMacro();
    } catch (error) {
      console.error("EasyModules | Could not create the Foundry v13 Hub launcher macro.", error);
    }
  }

  const result = await organizeEasyModulesMacros();
  if (result.moved || result.tagged) {
    console.log(`EasyModules | Organized ${result.managed} macro(s): ${result.moved} moved, ${result.tagged} tagged.`);
  }
});
