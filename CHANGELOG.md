# Changelog

## 1.2.1 — Public release preparation

- Added the official repository, manifest, download, and issue-tracker URLs.
- Updated the visible package title to EasyModules Hub.
- Replaced prototype and asset-audit wording with release-facing descriptions.
- Restricted Hub actions and settings reset operations to Gamemasters.
- Prevented stale global APIs from being used when a child module is disabled.
- Corrected dynamic registration so method-based external entries receive working launch, configure, and reset handlers.
- Made unregistering a built-in entry fully remove it from public API resolution.
- Removed unsupported module activation hooks; Foundry reloads module state through its normal world lifecycle.
- Updated installation and public API documentation for the first GitHub release.


## 1.2.0 — Stability and compatibility hardening

- Added registry-first resolution for built-in and dynamically registered modules.
- Added automatic dashboard refresh after public registry changes.
- Restricted module API resolution to active modules while preserving legacy global aliases.
- Added `payload.defer(promise)` for safe asynchronous configuration and reset integrations.
- Preserved API method binding when invoking child-module methods.
- Normalized registry IDs, module IDs, global API names, and method arrays.
- Added defensive handling when the Foundry settings registry is unavailable.
- Hardened scene-control insertion for array and object control collections.
- Escaped dynamic dialog content before HTML insertion.
- Exposed a frozen public configuration snapshot and API version.
- Added a complete compatibility and update-resilience report.
- Consolidated and corrected release documentation.

## 1.1.6

- Corrected remaining localization integration issues.

## 1.1.5

- Moved user-facing interface text from JavaScript and Handlebars templates into `lang/en.json`.
- Added localization keys for dashboard sections, statuses, buttons, tooltips, dialogs, notifications, and built-in suite descriptions.

## 1.1.4 — Public API audit

- Replaced the numeric `ApplicationV2.state` sentinel check with the public `rendered` lifecycle property.
- Confirmed use of public Foundry v14 application, dialog, hook, settings, notification, and utility APIs.

## 1.1.3

- Removed bundled PNG assets and replaced them with native Foundry / Font Awesome icons.

## 1.1.2

- EasyMagicItems Configure now opens only its persistent settings and never falls back to starting a draw.

## 1.1.1

- Improved dashboard resizing, compact layout, and responsive action alignment.

## 1.1.0

- Added Configure and confirmed Restore Defaults actions.
- Added child-module API, module-specific hook, generic hook, and registered-settings integration paths.

## 1.0.7

- Promoted EasyMagicItems to an available module card.

## 1.0.6

- Promoted EasyWounds to an available module card.
