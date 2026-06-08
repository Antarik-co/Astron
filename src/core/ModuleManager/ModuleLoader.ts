// === FILE: src/core/ModuleManager/ModuleLoader.ts ===

import { ModuleName } from '../../types/index';
import { moduleRegistry } from './ModuleRegistry';

/**
 * ModuleLoader
 *
 * Handles lazy loading and unloading of Astron modules at runtime.
 * Follows Astron Performance Rule 4: "Disabled module JavaScript never loads."
 *
 * Each load/unload operation dispatches a CustomEvent on `window` so
 * the Command Registry, Search Index, and UI can react without tight
 * coupling to this class.
 *
 * Events dispatched:
 *   'astron:module:loaded'   — detail: { module: ModuleName }
 *   'astron:module:unloaded' — detail: { module: ModuleName }
 */
export class ModuleLoader {
  /** Tracks which modules are currently loaded in this session. */
  private loadedModules: Set<ModuleName> = new Set();

  /**
   * Load a module by name.
   * No-ops silently if the module is already loaded (idempotent).
   *
   * @param name — The ModuleName to load.
   */
  async load(name: ModuleName): Promise<void> {
    if (this.loadedModules.has(name)) {
      return;
    }

    this.loadedModules.add(name);

    window.dispatchEvent(
      new CustomEvent('astron:module:loaded', {
        detail: { module: name },
      })
    );
  }

  /**
   * Unload a module by name.
   * If the module was not loaded, the Set deletion is a no-op and the
   * unloaded event is still dispatched so listeners can reconcile state.
   *
   * @param name — The ModuleName to unload.
   */
  async unload(name: ModuleName): Promise<void> {
    this.loadedModules.delete(name);

    window.dispatchEvent(
      new CustomEvent('astron:module:unloaded', {
        detail: { module: name },
      })
    );
  }

  /**
   * Load multiple modules in parallel.
   * Resolves only after every module in the list has loaded.
   *
   * @param names — Array of ModuleNames to load concurrently.
   */
  async loadAll(names: ModuleName[]): Promise<void> {
    await Promise.all(names.map((n) => this.load(n)));
  }

  /**
   * Returns true if the given module is currently loaded in this session.
   */
  isLoaded(name: ModuleName): boolean {
    return this.loadedModules.has(name);
  }
}

/** Shared singleton — import this across the codebase, not the class directly. */
export const moduleLoader = new ModuleLoader();
