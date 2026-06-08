// === FILE: src/core/ModuleManager/ModuleRegistry.ts ===

import { ModuleName, ModuleConfig } from '../../types/index';

/**
 * ModuleRegistry
 *
 * Central store for all registered Astron module configurations.
 * Modules must be registered before they can be loaded or toggled.
 * Follows the "register once, reference everywhere" pattern
 * described in Astron Implementation Plan §9.
 *
 * Throws on duplicate registration to prevent silent config conflicts.
 */
export class ModuleRegistry {
  private modules: Map<ModuleName, ModuleConfig> = new Map();

  /**
   * Register a module configuration.
   * @throws {Error} if a module with this name is already registered.
   */
  register(config: ModuleConfig): void {
    if (this.modules.has(config.name)) {
      throw new Error(
        `[ModuleRegistry] Module "${config.name}" is already registered. ` +
          `Duplicate registration is not allowed.`
      );
    }
    this.modules.set(config.name, config);
  }

  /**
   * Retrieve a single module configuration by name.
   * Returns undefined if the module has not been registered.
   */
  get(name: ModuleName): ModuleConfig | undefined {
    return this.modules.get(name);
  }

  /**
   * Return all registered module configurations.
   */
  getAll(): ModuleConfig[] {
    return Array.from(this.modules.values());
  }

  /**
   * Return only modules whose `enabled` flag is explicitly true.
   * Modules with enabled === false or undefined are excluded.
   */
  getEnabled(): ModuleConfig[] {
    return Array.from(this.modules.values()).filter(
      (config) => config.enabled === true
    );
  }

  /**
   * Check whether a module name has been registered.
   */
  isRegistered(name: ModuleName): boolean {
    return this.modules.has(name);
  }

  /**
   * Total number of registered modules (enabled or not).
   */
  count(): number {
    return this.modules.size;
  }
}

/** Shared singleton — import this across the codebase, not the class directly. */
export const moduleRegistry = new ModuleRegistry();
