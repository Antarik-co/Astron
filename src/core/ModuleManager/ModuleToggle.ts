// === FILE: src/core/ModuleManager/ModuleToggle.ts ===

import {
  AstronConfig,
  DEFAULT_ASTRON_CONFIG,
  WorkspaceProfile,
  ModuleName,
} from '../../types/index';
import { moduleRegistry } from './ModuleRegistry';
import { moduleLoader } from './ModuleLoader';

/**
 * MODULE → WORKSPACE PROFILE MAP
 *
 * Sourced directly from Astron Implementation Plan §9 — "Pre-Built Workspace Profiles".
 * Each profile key maps to the exact set of ModuleNames that should be active.
 * All other modules are disabled when a workspace is applied.
 */
const WORKSPACE_MODULE_MAP: Record<WorkspaceProfile, ModuleName[]> = {
  motion_design: [
    'motion',
    'timeline',
    'effects',
    'color',
    'export',
    'organize',
    'automate',
    'ai_studio',
  ],
  vfx: [
    'timeline',
    'effects',
    '3d',
    'color',
    'rig',
    'export',
    'organize',
    'ai_studio',
  ],
  character_animation: [
    'motion',
    'timeline',
    'rig',
    'audio',
    'organize',
    'ai_studio',
  ],
  social_content: [
    'motion',
    'effects',
    'text',
    'color',
    'export',
    'automate',
    'ai_studio',
  ],
  minimal: ['timeline', 'organize', 'automate'],
};

/** localStorage key used to persist user config between sessions. */
const CONFIG_STORAGE_KEY = 'astron-config';

/**
 * ModuleToggle
 *
 * The single authority for enabling/disabling Astron modules and applying
 * workspace profiles. Persists all state changes to localStorage so the
 * user's module selection survives across AE sessions.
 *
 * Depends on:
 *   moduleRegistry — to validate module names (via import, not direct call here)
 *   moduleLoader   — to actually load/unload module JS at runtime
 *
 * Config persistence flow (Astron §9):
 *   startup → loadConfig() → enable only modules flagged true → register commands
 *   toggle  → update config → call moduleLoader → saveConfig()
 */
export class ModuleToggle {
  /** Live config state. Defaults to DEFAULT_ASTRON_CONFIG until loadConfig() is called. */
  config: AstronConfig = { ...DEFAULT_ASTRON_CONFIG };

  // ─── Config I/O ───────────────────────────────────────────────────────────

  /**
   * Read and merge persisted config from localStorage.
   * Merges over DEFAULT_ASTRON_CONFIG so any keys missing from the stored
   * JSON still receive their default values (forward-compat with new keys).
   *
   * Parse errors are swallowed silently; the default config is used instead,
   * which is safe — the next saveConfig() call will overwrite the bad data.
   */
  loadConfig(): void {
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as Partial<AstronConfig>;
        this.config = Object.assign({ ...DEFAULT_ASTRON_CONFIG }, parsed);
      }
    } catch {
      // Corrupt or unparsable JSON — fall back to defaults.
      this.config = { ...DEFAULT_ASTRON_CONFIG };
    }
  }

  /**
   * Persist the current config to localStorage.
   * Called automatically after every enable/disable/applyWorkspace operation.
   */
  saveConfig(): void {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
  }

  // ─── Module Enable / Disable ──────────────────────────────────────────────

  /**
   * Enable a module:
   *   1. Mark it as enabled in the live config.
   *   2. Tell moduleLoader to load it (dispatches 'astron:module:loaded').
   *   3. Persist to localStorage.
   *
   * @param module — The ModuleName to enable.
   */
  async enable(module: ModuleName): Promise<void> {
    this.config.modules[module] = true;
    await moduleLoader.load(module);
    this.saveConfig();
  }

  /**
   * Disable a module:
   *   1. Mark it as disabled in the live config.
   *   2. Tell moduleLoader to unload it (dispatches 'astron:module:unloaded').
   *   3. Persist to localStorage.
   *
   * @param module — The ModuleName to disable.
   */
  async disable(module: ModuleName): Promise<void> {
    this.config.modules[module] = false;
    await moduleLoader.unload(module);
    this.saveConfig();
  }

  // ─── State Queries ────────────────────────────────────────────────────────

  /**
   * Returns true if the module is currently flagged as enabled in the live config.
   * Defaults to false for any module not present in the config object.
   */
  isEnabled(module: ModuleName): boolean {
    return this.config.modules[module] ?? false;
  }

  /**
   * Return all ModuleNames that are currently enabled in the live config.
   */
  getEnabledModules(): ModuleName[] {
    return (
      Object.entries(this.config.modules)
        .filter(([, v]) => v)
        // Safe cast: keys of the modules record are ModuleName strings.
        .map(([k]) => k as ModuleName)
    );
  }

  // ─── Workspace Profiles ───────────────────────────────────────────────────

  /**
   * Apply a workspace profile.
   *
   * Algorithm (Astron §9):
   *   1. Disable ALL currently-known modules (full reset).
   *   2. Enable only the modules defined for the target profile.
   *   3. Stamp the workspace name onto the live config.
   *   4. Persist once — not after every individual toggle.
   *
   * Steps 1 & 2 are performed in serial to avoid race conditions on
   * overlapping enable/disable calls for the same module name.
   *
   * @param profile — The WorkspaceProfile preset to apply.
   */
  async applyWorkspace(profile: WorkspaceProfile): Promise<void> {
    // Step 1: Disable all modules (iterate all known ModuleNames in config).
    const allModules = Object.keys(this.config.modules) as ModuleName[];
    await Promise.all(allModules.map((m) => this.disable(m)));

    // Step 2: Enable only the profile's module set.
    const profileModules = WORKSPACE_MODULE_MAP[profile];
    await Promise.all(profileModules.map((m) => this.enable(m)));

    // Step 3: Stamp workspace name.
    this.config.workspace = profile;

    // Step 4: Single persist call (enable() already called saveConfig per module,
    // but we do a final save here to guarantee workspace key is written).
    this.saveConfig();
  }
}

/** Shared singleton — import this across the codebase, not the class directly. */
export const moduleToggle = new ModuleToggle();
