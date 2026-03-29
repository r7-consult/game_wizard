# Game Wizard

**Game Wizard** is an ONLYOFFICE plugin that brings a curated collection of mini-games directly into your office suite. Without leaving the document editor, users can browse the game catalog, install or remove individual games, and launch them in a resizable pop-up window — all within the familiar ONLYOFFICE environment.

---

## Table of Contents

- [Overview](#overview)
- [Requirements](#requirements)
- [Installation](#installation)
- [Available Games](#available-games)
- [Functional Details](#functional-details)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [License](#license)

---

## Overview

Game Wizard acts as an in-editor game manager (plugin) for ONLYOFFICE Spreadsheet Editor and other ONLYOFFICE applications. It provides:

- A **game catalog** that can be served locally or synchronized from a remote GitHub repository.
- A clean **card-based UI** for browsing, installing, updating, and removing games.
- A **modal launcher** that opens each game in its own resizable window inside ONLYOFFICE.
- Full **light/dark theme** support that follows the host editor's theme automatically.
- Localization support for **Russian** and **English** interfaces.

---

## Requirements

| Component | Version / Notes |
|-----------|-----------------|
| ONLYOFFICE Docs | 7.0 or later (Desktop or Server edition) |
| Browser | Any modern browser with ES5 support (Chrome, Firefox, Edge, Safari) |
| Internet access | Optional — required only for remote catalog synchronization via GitHub |

> **No external build tools or package managers are required.** The plugin is a self-contained set of static HTML, CSS, and JavaScript files.

---

## Installation

### Method 1 — ONLYOFFICE Plugin Manager (recommended)

1. Open ONLYOFFICE Docs (Desktop or Web).
2. Go to **Plugins → Plugin Manager**.
3. Search for *Game Wizard* and click **Install**.

### Method 2 — Manual installation

1. Download or clone this repository:
   ```
   git clone https://github.com/r7-consult/game_wizard.git
   ```
2. Copy the entire folder into your ONLYOFFICE plugins directory:
   - **Windows (Desktop):** `%LOCALAPPDATA%\ONLYOFFICE\DesktopEditors\sdkjs-plugins\`
   - **Linux (Desktop):** `~/.local/share/onlyoffice/desktopeditors/sdkjs-plugins/`
   - **macOS (Desktop):** `~/Library/Application Support/ONLYOFFICE/DesktopEditors/sdkjs-plugins/`
   - **Server (Docker / DEB / RPM):** `/var/www/onlyoffice/documentserver/sdkjs-plugins/`
3. Restart ONLYOFFICE.
4. Open any spreadsheet, go to **Plugins**, and select **Game Wizard**.

### Method 3 — Standalone `.plugin` archive

1. Run the build script:
   ```powershell
   .\scripts\build-standalone-module.ps1
   ```
2. The generated `.plugin` file can be installed via the ONLYOFFICE Plugin Manager's *Upload* feature.

---

## Available Games

| # | Game | Description |
|---|------|-------------|
| 1 | **2048** | Classic sliding-tile puzzle. Combine numbered tiles to reach 2048. |
| 2 | **Solitaire Klondike** | The classic Klondike card solitaire. |
| 3 | **Solitaire Spider** | Spider solitaire with one, two, or four suits. |
| 4 | **Solitaire FreeCell** | FreeCell solitaire — every deal is solvable. |
| 5 | **Chess** | Two-player chess with legal-move highlighting. |

New games can be added to the catalog without updating the plugin itself.

---

## Functional Details

### Game Catalog

Game Wizard merges two catalogs at startup:

- **Local catalog** (`modules/local-catalog.json`) — games bundled with or manually added to the plugin folder.
- **Remote catalog** — fetched from the configured GitHub repository (`modules/catalog.json` on the `main` branch). Remote games can be installed on demand.

Each game record describes the module folder name, display title, version, icon, window size constraints, and launch mode.

### Module States

| State | Meaning |
|-------|---------|
| `installed` | Game is present locally and ready to launch. |
| `available` | Listed in the remote catalog but not installed locally. |
| `update-available` | A newer version exists in the remote catalog. |
| `local-only` | Present locally but not in the remote catalog. |

### Launching a Game

Clicking an installed game card opens the game in a **modal plugin window** (via `Asc.PluginWindow`). If the ONLYOFFICE API is unavailable (e.g. during development), the game opens in a regular browser pop-up.

### Hosted OLE Mode

When Game Wizard is embedded as an OLE object in a spreadsheet, it can receive a JSON payload in its `initData` and automatically open the specified game module without requiring user interaction.

### Theme Support

The plugin reads the current ONLYOFFICE theme (`theme-light` / `theme-dark`) and applies a matching CSS class to its root element. Theme changes are applied in real-time via `onThemeChanged`.

### Localization

UI strings are managed through `translations/` JSON files. Supported locales: `ru-RU`, `en-US`.

---

## Configuration

Plugin-level settings are defined in `scripts/manager-config.js`:

```js
window.GameWizardConfig = {
  branding: {
    title: 'Game Wizard',
    subtitle: 'Choose a game to launch'
  },
  local: {
    modulesRoot: 'modules',
    bundledCatalogPath: 'modules/catalog.json',
    localCatalogPath: 'modules/local-catalog.json'
  },
  remote: {
    provider: 'github',
    repositoryUrl: 'https://github.com/r7-consult/game_wizard',
    branch: 'main',
    modulesRoot: 'modules'
  },
  hiddenModules: []   // module IDs to hide from the UI
};
```

---

## Project Structure

```
game_wizard/
├── config.json                  # ONLYOFFICE plugin manifest
├── index.html                   # Plugin main page
├── module-window-host.html      # Hosted game window wrapper
├── modules/
│   ├── catalog.json             # Bundled remote module list
│   ├── local-catalog.json       # Local module list
│   └── <game_id>/               # One folder per game module
├── resources/
│   ├── icons/                   # Plugin icons (light/dark)
│   └── images/                  # UI assets (mascot, etc.)
├── scripts/
│   ├── manager-config.js        # Runtime configuration
│   ├── plugin.js                # ONLYOFFICE plugin lifecycle
│   ├── module-service.js        # Catalog management & module ops
│   ├── game-launcher.js         # Game launch logic
│   └── ui.js                    # DOM rendering helpers
├── styles/
│   ├── main.css                 # Plugin shell styles
│   └── game-shell.css           # In-game wrapper styles
├── translations/
│   ├── langs.json               # Supported locales
│   ├── en-US.json               # English strings
│   └── ru-RU.json               # Russian strings
└── vendor/                      # Bundled third-party libraries
```

---

## License

This project is licensed for **non-commercial use only**.  
See the [LICENSE](LICENSE) file for full terms.

© 2024 r7-consult. All rights reserved.
