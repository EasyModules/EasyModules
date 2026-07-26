function normalizeStringArray(value, fallback = []) {
  if (!Array.isArray(value)) return [...fallback];
  return [...new Set(value.filter(item => typeof item === "string" && item.trim()).map(item => item.trim()))];
}

export class EasyModulesRegistry {
  #entries = new Map();
  #revision = 0;

  get revision() {
    return this.#revision;
  }

  register(definition) {
    if (!definition?.id || typeof definition.id !== "string") {
      throw new Error(game.i18n.localize("EASYMODULES.Registry.MissingId"));
    }

    const id = definition.id.trim();
    if (!id) throw new Error(game.i18n.localize("EASYMODULES.Registry.MissingId"));

    const previous = this.#entries.get(id) ?? {};
    const primaryModuleId = definition.moduleId ?? definition.moduleIds?.[0] ?? previous.moduleId ?? id;
    const moduleIds = normalizeStringArray([
      ...(definition.moduleIds ?? []),
      primaryModuleId,
      ...(previous.moduleIds ?? [])
    ]);

    const normalized = {
      id,
      title: definition.title ?? previous.title ?? id,
      titleKey: definition.titleKey ?? previous.titleKey,
      description: definition.description ?? previous.description ?? "",
      descriptionKey: definition.descriptionKey ?? previous.descriptionKey,
      moduleId: primaryModuleId,
      moduleIds,
      globalApis: normalizeStringArray(definition.globalApis, previous.globalApis),
      status: definition.status ?? previous.status ?? "available",
      actionLabel: definition.actionLabel ?? previous.actionLabel,
      actionLabelKey: definition.actionLabelKey ?? previous.actionLabelKey ?? "EASYMODULES.Actions.Open",
      configLabel: definition.configLabel ?? previous.configLabel,
      configLabelKey: definition.configLabelKey ?? previous.configLabelKey ?? "EASYMODULES.Actions.Configure",
      resetLabel: definition.resetLabel ?? previous.resetLabel,
      resetLabelKey: definition.resetLabelKey ?? previous.resetLabelKey ?? "EASYMODULES.Actions.RestoreDefaults",
      icon: Object.hasOwn(definition, "icon") ? definition.icon : (previous.icon ?? null),
      iconClass: Object.hasOwn(definition, "iconClass") ? definition.iconClass : (previous.iconClass ?? null),
      fallbackIcon: Object.hasOwn(definition, "fallbackIcon") ? definition.fallbackIcon : (previous.fallbackIcon ?? null),
      order: Number.isFinite(definition.order) ? definition.order : (previous.order ?? 100),
      launchMethods: normalizeStringArray(definition.launchMethods, previous.launchMethods),
      configureMethods: normalizeStringArray(definition.configureMethods, previous.configureMethods),
      resetMethods: normalizeStringArray(definition.resetMethods, previous.resetMethods),
      onClick: typeof definition.onClick === "function" ? definition.onClick : previous.onClick,
      onConfigure: typeof definition.onConfigure === "function" ? definition.onConfigure : previous.onConfigure,
      onReset: typeof definition.onReset === "function" ? definition.onReset : previous.onReset,
      accessUrl: definition.accessUrl ?? previous.accessUrl,
      accessTier: definition.accessTier ?? previous.accessTier ?? null,
      accessLabelKey: definition.accessLabelKey ?? previous.accessLabelKey ?? null
    };

    this.#entries.set(id, normalized);
    this.#revision += 1;
    return normalized;
  }

  unregister(id) {
    const removed = this.#entries.delete(id);
    if (removed) this.#revision += 1;
    return removed;
  }

  get(id) {
    return this.#entries.get(id);
  }

  getAll() {
    return [...this.#entries.values()].sort((a, b) => {
      const orderDifference = a.order - b.order;
      if (orderDifference) return orderDifference;
      return String(a.title).localeCompare(String(b.title), game.i18n.lang);
    });
  }
}
