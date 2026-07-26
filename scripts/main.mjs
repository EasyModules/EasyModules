import { EASY_MODULES_CONFIG } from "./config.mjs";
import { EASY_MODULES_SUITE } from "./suite.mjs";
import { EasyModulesRegistry } from "./registry.mjs";
import { EasyModulesDashboard } from "./dashboard.mjs";

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

  for (const moduleId of ids) {
    const foundryModule = game.modules.get(moduleId);
    if (foundryModule) return foundryModule;
  }
  return null;
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
    version: "1.0.0"
  };

  game.easyModules = api;
  const self = game.modules.get(EASY_MODULES_CONFIG.moduleId);
  if (self) self.api = api;

  const version = self?.version ?? "unknown";
  console.log(`${EASY_MODULES_CONFIG.moduleId} | Initializing v${version}`);
});

Hooks.on("getSceneControlButtons", controls => {
  if (!game.user?.isGM) return;

  const control = {
    name: EASY_MODULES_CONFIG.control.name,
    title: game.i18n.localize(EASY_MODULES_CONFIG.control.titleKey),
    icon: EASY_MODULES_CONFIG.control.icon,
    order: 90,
    visible: true,
    tools: {},
    onChange: (_event, active) => { if (active) openDashboard(); }
  };

  if (Array.isArray(controls)) {
    if (!controls.some(candidate => candidate.name === control.name)) controls.push(control);
    return;
  }

  if (controls && typeof controls === "object") controls[control.name] ??= control;
});

Hooks.once("ready", () => {
  console.log(`${EASY_MODULES_CONFIG.moduleId} | Ready. API: game.easyModules`);
});
