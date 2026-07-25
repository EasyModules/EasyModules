import { EASY_MODULES_CONFIG } from "./config.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function localize(key) {
  return game.i18n.localize(key);
}

function format(key, data = {}) {
  return game.i18n.format(key, data);
}

function escapeHtml(value) {
  const text = String(value ?? "");
  if (typeof foundry.utils.escapeHTML === "function") return foundry.utils.escapeHTML(text);
  return text.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function resolveLocalizedText(key, value, fallbackKey) {
  const valueKey = typeof value === "string" && value.startsWith("EASYMODULES.") ? value : null;
  const resolvedKey = key || valueKey || fallbackKey;
  return resolvedKey ? localize(resolvedKey) : value;
}

function findInstalledModule(entry) {
  for (const moduleId of entry.moduleIds ?? [entry.moduleId]) {
    const foundryModule = game.modules.get(moduleId);
    if (foundryModule) return foundryModule;
  }
  return null;
}

export class EasyModulesDashboard extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "easy-modules-dashboard",
    classes: ["easy-modules-dashboard"],
    tag: "section",
    window: {
      title: EASY_MODULES_CONFIG.brandName,
      icon: "fas fa-toolbox",
      resizable: true
    },
    position: {
      width: 760,
      height: 760
    },
    actions: {
      launch: function(event, target) {
        return this._onLaunch(event, target);
      },
      configure: function(event, target) {
        return this._onConfigure(event, target);
      },
      reset: function(event, target) {
        return this._onReset(event, target);
      }
    }
  };

  static PARTS = {
    content: {
      template: `modules/${EASY_MODULES_CONFIG.moduleId}/templates/dashboard.hbs`
    }
  };

  constructor(registry, options = {}) {
    super(options);
    this.registry = registry;
  }

  async _prepareContext(options) {
    const entries = this.registry.getAll().map(entry => {
      const foundryModule = findInstalledModule(entry);
      const installed = Boolean(foundryModule);
      const active = Boolean(foundryModule?.active);
      const comingSoon = entry.status === "coming-soon";
      const iconUrl = entry.icon || entry.fallbackIcon || null;
      const iconClass = entry.iconClass || null;
      const title = entry.titleKey ? localize(entry.titleKey) : entry.title;
      const description = entry.descriptionKey ? localize(entry.descriptionKey) : entry.description;
      const actionLabel = resolveLocalizedText(entry.actionLabelKey, entry.actionLabel, "EASYMODULES.Actions.Open");
      const configLabel = resolveLocalizedText(entry.configLabelKey, entry.configLabel, "EASYMODULES.Actions.Configure");
      const resetLabel = resolveLocalizedText(entry.resetLabelKey, entry.resetLabel, "EASYMODULES.Actions.RestoreDefaults");

      return {
        ...entry,
        title,
        description,
        actionLabel,
        configLabel,
        resetLabel,
        resolvedModuleId: foundryModule?.id ?? entry.moduleId,
        installed,
        active,
        comingSoon,
        canConfigure: active && !comingSoon,
        canReset: active && !comingSoon,
        iconUrl,
        iconClass,
        hasImageIcon: Boolean(iconUrl),
        hasFontIcon: Boolean(iconClass),
        hasIcon: Boolean(iconUrl || iconClass),
        version: !comingSoon && installed ? foundryModule.version : null,
        stateLabel: comingSoon
          ? localize("EASYMODULES.Status.ComingSoon")
          : active
            ? localize("EASYMODULES.Status.Active")
            : installed
              ? localize("EASYMODULES.Status.Disabled")
              : localize("EASYMODULES.Status.NotInstalled"),
        stateClass: comingSoon ? "coming-soon" : active ? "installed" : "locked",
        configureTooltip: format("EASYMODULES.Tooltips.Configure", { title }),
        resetTooltip: format("EASYMODULES.Tooltips.RestoreDefaults", { title })
      };
    });

    return {
      brandName: EASY_MODULES_CONFIG.brandName,
      brandIconClass: EASY_MODULES_CONFIG.brandIconClass,
      eyebrow: localize("EASYMODULES.Header.Eyebrow"),
      tagline: localize("EASYMODULES.Header.Tagline"),
      availableModulesLabel: localize("EASYMODULES.Sections.Available"),
      toolCountLabel: format("EASYMODULES.Sections.ToolCount", {
        count: entries.filter(entry => !entry.comingSoon).length
      }),
      comingNextLabel: localize("EASYMODULES.Sections.ComingNext"),
      inDevelopmentLabel: localize("EASYMODULES.Sections.InDevelopment"),
      comingSoonLabel: localize("EASYMODULES.Status.ComingSoon"),
      featuredEntries: entries.filter(entry => !entry.comingSoon),
      upcomingEntries: entries.filter(entry => entry.comingSoon)
    };
  }

  async _onLaunch(event, target) {
    const entry = this._getEntry(target);
    if (!entry) return;

    if (entry.status === "coming-soon") {
      return this._showMessage(
        localize(EASY_MODULES_CONFIG.messages.comingSoonKey),
        localize("EASYMODULES.Dialogs.ComingSoonTitle")
      );
    }

    if (!this._isModuleActive(entry)) {
      return this._showMessage(
        localize(EASY_MODULES_CONFIG.messages.noAccessKey),
        localize("EASYMODULES.Dialogs.ModuleUnavailableTitle")
      );
    }

    if (typeof entry.onClick !== "function") {
      return ui.notifications.warn(format("EASYMODULES.Notifications.NoAction", { title: entry.title }));
    }

    return this._runEntryAction(
      entry,
      entry.onClick,
      format("EASYMODULES.Errors.CouldNotOpen", { title: entry.title })
    );
  }

  async _onConfigure(event, target) {
    const entry = this._getEntry(target);
    if (!entry) return;

    if (!this._isModuleActive(entry)) {
      return this._showMessage(
        localize(EASY_MODULES_CONFIG.messages.noAccessKey),
        localize("EASYMODULES.Dialogs.ModuleUnavailableTitle")
      );
    }

    if (typeof entry.onConfigure !== "function") {
      return ui.notifications.info(format("EASYMODULES.Notifications.NoConfiguration", { title: entry.title }));
    }

    return this._runEntryAction(
      entry,
      entry.onConfigure,
      format("EASYMODULES.Errors.CouldNotConfigure", { title: entry.title })
    );
  }

  async _onReset(event, target) {
    const entry = this._getEntry(target);
    if (!entry) return;

    if (!this._isModuleActive(entry)) {
      return this._showMessage(
        localize(EASY_MODULES_CONFIG.messages.noAccessKey),
        localize("EASYMODULES.Dialogs.ModuleUnavailableTitle")
      );
    }

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: format("EASYMODULES.Dialogs.RestoreTitle", { title: entry.title }) },
      content: `
        <div class="easy-modules-message easy-modules-reset-warning">
          <p><strong>${escapeHtml(format("EASYMODULES.Dialogs.RestoreQuestion", { title: entry.title }))}</strong></p>
          <p>${escapeHtml(localize("EASYMODULES.Dialogs.RestoreWarning"))}</p>
        </div>`,
      yes: { label: localize("EASYMODULES.Actions.RestoreDefaults"), icon: "fas fa-rotate-left" },
      no: { label: localize("EASYMODULES.Actions.Cancel") }
    });
    if (!confirmed) return;

    if (typeof entry.onReset !== "function") {
      return ui.notifications.warn(format("EASYMODULES.Notifications.NoReset", { title: entry.title }));
    }

    const result = await this._runEntryAction(
      entry,
      entry.onReset,
      format("EASYMODULES.Errors.CouldNotRestore", { title: entry.title })
    );
    await this.render({ force: true });
    return result;
  }

  _getEntry(target) {
    const id = target?.dataset?.moduleId;
    return id ? this.registry.get(id) : null;
  }

  _isModuleActive(entry) {
    return Boolean(findInstalledModule(entry)?.active);
  }

  async _runEntryAction(entry, action, errorMessage) {
    try {
      return await action();
    } catch (error) {
      console.error("EasyModules | Module action failed", error);
      ui.notifications.error(format("EASYMODULES.Notifications.ActionFailed", { message: errorMessage }));
      return undefined;
    }
  }

  async _showMessage(message, title) {
    return foundry.applications.api.DialogV2.wait({
      window: { title },
      content: `<div class="easy-modules-message"><p>${escapeHtml(message)}</p></div>`,
      buttons: [{ action: "close", label: localize("EASYMODULES.Actions.Close"), default: true }]
    });
  }
}
