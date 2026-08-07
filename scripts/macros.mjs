import { EASY_MODULES_SUITE } from "./suite.mjs";

const OWNER_FLAG_SCOPE = "easy-modules";
const OWNER_FLAG_KEY = "owner";
const ROOT_FOLDER_NAME = "EASYMODULES";
const MACRO_FOLDER_TYPE = "Macro";
const organizingMacroIds = new Set();
const folderCreationPromises = new Map();

const EXTRA_MACRO_OWNERS = [
  {
    id: "easy-modules",
    moduleIds: ["easy-modules"],
    globalApis: ["easyModules"],
    title: "EasyModules"
  },
  {
    id: "easy-qol",
    moduleIds: ["easy-qol"],
    globalApis: ["easyQOL"],
    title: "EasyQOL"
  }
];

const HUB_LAUNCHER_MACRO_NAME = "Open EasyModules Hub";
const HUB_LAUNCHER_PURPOSE_FLAG = "hub-launcher";
const HUB_LAUNCHER_COMMAND = "game.easyModules?.open?.();";

const MACRO_OWNERS = [
  ...EASY_MODULES_SUITE.map(definition => ({
    id: definition.id,
    moduleIds: [...(definition.moduleIds ?? [definition.id])],
    globalApis: [...(definition.globalApis ?? [])],
    title: definition.title
  })),
  ...EXTRA_MACRO_OWNERS
];

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function folderParentId(folder) {
  const parent = folder?.folder;
  if (!parent) return null;
  if (typeof parent === "string") return parent;
  return parent.id ?? parent._id ?? null;
}

function macroFolderId(macro) {
  const folder = macro?.folder;
  if (!folder) return null;
  if (typeof folder === "string") return folder;
  return folder.id ?? folder._id ?? null;
}

function allFolders() {
  return game.folders?.contents ?? Array.from(game.folders ?? []);
}

function allMacros() {
  return game.macros?.contents ?? Array.from(game.macros ?? []);
}

function resolveOwner(value) {
  const target = normalizeText(value);
  if (!target) return null;

  return MACRO_OWNERS.find(owner => {
    if (normalizeText(owner.id) === target) return true;
    if (normalizeText(owner.title) === target) return true;
    return owner.moduleIds.some(id => normalizeText(id) === target);
  }) ?? null;
}

function moduleFlagMatches(macro, owner) {
  const flags = macro?.flags ?? {};
  return owner.moduleIds.some(moduleId => {
    const value = flags[moduleId];
    return value && typeof value === "object" && Object.keys(value).length > 0;
  });
}

function commandMatches(macro, owner) {
  const command = String(macro?.command ?? "");
  if (!command) return false;

  for (const moduleId of owner.moduleIds) {
    if (command.includes(`/modules/${moduleId}/`)) return true;

    const escaped = moduleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const getModulePattern = new RegExp(`game\\.modules\\.get\\(\\s*["']${escaped}["']\\s*\\)`);
    if (getModulePattern.test(command)) return true;
  }

  return owner.globalApis.some(globalName => command.includes(`game.${globalName}`));
}

export function detectEasyModulesMacroOwner(macro) {
  const explicitOwner = macro?.getFlag?.(OWNER_FLAG_SCOPE, OWNER_FLAG_KEY)
    ?? macro?.flags?.[OWNER_FLAG_SCOPE]?.[OWNER_FLAG_KEY];
  const explicit = resolveOwner(explicitOwner);
  if (explicit) return explicit;

  for (const owner of MACRO_OWNERS) {
    if (moduleFlagMatches(macro, owner)) return owner;
  }

  for (const owner of MACRO_OWNERS) {
    if (commandMatches(macro, owner)) return owner;
  }

  return null;
}

async function ensureMacroFolder(name, parentId = null) {
  const existing = allFolders().find(folder => (
    folder.type === MACRO_FOLDER_TYPE
    && folder.name === name
    && folderParentId(folder) === parentId
  ));
  if (existing) return existing;

  const key = `${parentId ?? "root"}::${name}`;
  if (folderCreationPromises.has(key)) return folderCreationPromises.get(key);

  const FolderClass = CONFIG?.Folder?.documentClass ?? globalThis.Folder;
  if (!FolderClass?.create) throw new Error("EasyModules | Foundry Folder document class is unavailable.");

  const pending = FolderClass.create({
    name,
    type: MACRO_FOLDER_TYPE,
    folder: parentId
  }, { renderSheet: false }).finally(() => folderCreationPromises.delete(key));

  folderCreationPromises.set(key, pending);
  return pending;
}

async function ensureOwnerFolder(owner) {
  const root = await ensureMacroFolder(ROOT_FOLDER_NAME, null);
  const ownerFolder = await ensureMacroFolder(owner.title, root.id);
  return { root, ownerFolder };
}

function getMacroDocument(macroOrId) {
  if (!macroOrId) return null;
  if (typeof macroOrId === "string") return game.macros?.get?.(macroOrId) ?? null;
  return macroOrId;
}

export async function organizeEasyModulesMacro(macroOrId, { ownerId = null } = {}) {
  if (!game.user?.isGM) return { managed: false, reason: "gm-only" };

  const macro = getMacroDocument(macroOrId);
  if (!macro) return { managed: false, reason: "macro-not-found" };
  if (organizingMacroIds.has(macro.id)) return { managed: false, reason: "already-organizing" };

  const owner = ownerId ? resolveOwner(ownerId) : detectEasyModulesMacroOwner(macro);
  if (!owner) return { managed: false, reason: "not-easymodules" };

  organizingMacroIds.add(macro.id);
  try {
    const { ownerFolder } = await ensureOwnerFolder(owner);
    let moved = false;
    let tagged = false;

    if (macroFolderId(macro) !== ownerFolder.id) {
      await macro.update({ folder: ownerFolder.id });
      moved = true;
    }

    const currentOwner = macro.getFlag?.(OWNER_FLAG_SCOPE, OWNER_FLAG_KEY)
      ?? macro.flags?.[OWNER_FLAG_SCOPE]?.[OWNER_FLAG_KEY];
    if (currentOwner !== owner.id) {
      await macro.setFlag(OWNER_FLAG_SCOPE, OWNER_FLAG_KEY, owner.id);
      tagged = true;
    }

    return {
      managed: true,
      macroId: macro.id,
      macroName: macro.name,
      ownerId: owner.id,
      folderId: ownerFolder.id,
      moved,
      tagged
    };
  } finally {
    organizingMacroIds.delete(macro.id);
  }
}

export async function organizeEasyModulesMacros() {
  if (!game.user?.isGM) {
    return { managed: 0, moved: 0, tagged: 0, skipped: 0, reason: "gm-only", results: [] };
  }

  const candidates = allMacros()
    .map(macro => ({ macro, owner: detectEasyModulesMacroOwner(macro) }))
    .filter(entry => entry.owner);

  const results = [];
  for (const { macro, owner } of candidates) {
    try {
      results.push(await organizeEasyModulesMacro(macro, { ownerId: owner.id }));
    } catch (error) {
      console.error(`EasyModules | Could not organize macro ${macro.name} (${macro.id}).`, error);
      results.push({
        managed: false,
        macroId: macro.id,
        macroName: macro.name,
        ownerId: owner.id,
        reason: "error",
        error
      });
    }
  }

  return {
    managed: results.filter(result => result.managed).length,
    moved: results.filter(result => result.moved).length,
    tagged: results.filter(result => result.tagged).length,
    skipped: results.filter(result => !result.managed).length,
    results
  };
}

export async function claimEasyModulesMacro(macroOrId, ownerId) {
  const owner = resolveOwner(ownerId);
  if (!owner) throw new Error(`EasyModules | Unknown macro owner: ${ownerId}`);

  const macro = getMacroDocument(macroOrId);
  if (!macro) throw new Error("EasyModules | Macro not found.");

  if (!game.user?.isGM) throw new Error("EasyModules | Only a Gamemaster can organize macros.");
  if (organizingMacroIds.has(macro.id)) return organizeEasyModulesMacro(macro, { ownerId: owner.id });

  organizingMacroIds.add(macro.id);
  try {
    const currentOwner = macro.getFlag?.(OWNER_FLAG_SCOPE, OWNER_FLAG_KEY)
      ?? macro.flags?.[OWNER_FLAG_SCOPE]?.[OWNER_FLAG_KEY];
    if (currentOwner !== owner.id) await macro.setFlag(OWNER_FLAG_SCOPE, OWNER_FLAG_KEY, owner.id);
  } finally {
    organizingMacroIds.delete(macro.id);
  }

  return organizeEasyModulesMacro(macro, { ownerId: owner.id });
}

export async function ensureEasyModulesHubLauncherMacro() {
  if (!game.user?.isGM) return { created: false, reason: "gm-only", macro: null };

  const existing = allMacros().find(macro => {
    const owner = macro.getFlag?.(OWNER_FLAG_SCOPE, OWNER_FLAG_KEY)
      ?? macro.flags?.[OWNER_FLAG_SCOPE]?.[OWNER_FLAG_KEY];
    const purpose = macro.getFlag?.(OWNER_FLAG_SCOPE, "purpose")
      ?? macro.flags?.[OWNER_FLAG_SCOPE]?.purpose;
    if (owner === "easy-modules" && purpose === HUB_LAUNCHER_PURPOSE_FLAG) return true;

    return macro.name === HUB_LAUNCHER_MACRO_NAME
      && String(macro.command ?? "").includes("game.easyModules")
      && String(macro.command ?? "").includes("open");
  });

  if (existing) {
    if ((existing.getFlag?.(OWNER_FLAG_SCOPE, "purpose") ?? existing.flags?.[OWNER_FLAG_SCOPE]?.purpose)
      !== HUB_LAUNCHER_PURPOSE_FLAG) {
      await existing.setFlag(OWNER_FLAG_SCOPE, "purpose", HUB_LAUNCHER_PURPOSE_FLAG);
    }
    await organizeEasyModulesMacro(existing, { ownerId: "easy-modules" });
    return { created: false, reason: "existing", macro: existing };
  }

  const MacroClass = CONFIG?.Macro?.documentClass ?? globalThis.Macro;
  if (!MacroClass?.create) throw new Error("EasyModules | Foundry Macro document class is unavailable.");

  const owner = resolveOwner("easy-modules");
  const { ownerFolder } = await ensureOwnerFolder(owner);
  const macro = await MacroClass.create({
    name: HUB_LAUNCHER_MACRO_NAME,
    type: "script",
    command: HUB_LAUNCHER_COMMAND,
    img: "icons/svg/cog.svg",
    folder: ownerFolder.id,
    flags: {
      [OWNER_FLAG_SCOPE]: {
        [OWNER_FLAG_KEY]: "easy-modules",
        purpose: HUB_LAUNCHER_PURPOSE_FLAG
      }
    }
  }, { renderSheet: false });

  return { created: true, reason: "created", macro };
}

export function isOrganizingEasyModulesMacro(macroId) {
  return organizingMacroIds.has(macroId);
}

export const EASY_MODULES_MACRO_FOLDERS = Object.freeze({
  root: ROOT_FOLDER_NAME,
  owners: MACRO_OWNERS.map(owner => Object.freeze({
    id: owner.id,
    title: owner.title,
    moduleIds: Object.freeze([...owner.moduleIds])
  }))
});
