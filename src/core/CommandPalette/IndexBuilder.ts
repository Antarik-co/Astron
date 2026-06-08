/**
 * @file IndexBuilder.ts
 * @module core/CommandPalette
 * @task T007
 * @depends T003 (FuzzySearch), T004 (CommandRegistry), T006 (types/index)
 *
 * Builds and maintains the unified search index for the Astron command palette.
 * Aggregates all indexable sources — native AE effects, Astron module commands,
 * third-party plugin effects, and user scripts — into a single Fuse.js-backed
 * index that powers fuzzy search at <20ms response time.
 *
 * Index sources (per Section 5 of the Implementation Plan):
 *   1. Astron module commands  (/ease, /beats, /clean, etc.)
 *   2. Native AE effects       (300+ in full build; 50 seeded here)
 *   3. Third-party effects     (registered at runtime via addThirdPartyEffect)
 *   4. User scripts            (registered at runtime via addScript)
 *
 * Called once during CEP panel startup by the Core Engine bootstrap sequence.
 * After build(), search responses are always <20ms (index is pre-built, never rebuilt).
 */

import { IndexEntry, ModuleName, CommandSource } from '../../types/index';
import { fuzzySearch } from './FuzzySearch';
import { commandRegistry } from './CommandRegistry';

// ---------------------------------------------------------------------------
// IndexBuilder
// ---------------------------------------------------------------------------

export class IndexBuilder {
  // -------------------------------------------------------------------------
  // Private state
  // -------------------------------------------------------------------------

  private isBuilt: boolean = false;

  /**
   * Seed list of 50 common native After Effects effects.
   * Extended at runtime by the Effects module's AE DOM scanner (Module 03),
   * which enumerates every installed effect via ExtendScript.
   *
   * Grouped by category for readability — order does not affect search priority.
   */
  private readonly nativeEffectNames: string[] = [
    // Blur & Sharpen
    'Gaussian Blur',
    'Motion Blur',
    'Fast Box Blur',
    'CC Radial Fast Blur',
    'Unsharp Mask',
    'Fast Blur',

    // Stylize / Generate
    'Glow',
    'Lens Flare',
    'Stroke',
    'Fill',
    'Gradient Ramp',
    'Fractal Noise',
    'Strobe Light',

    // Color Correction
    'Levels',
    'Curves',
    'Hue/Saturation',
    'Color Balance',
    'Exposure',
    'Brightness & Contrast',
    'Colorama',
    'Tritone',
    'Tint',
    'Photo Filter',

    // Perspective / Layer Styles
    'Drop Shadow',
    'Bevel and Emboss',
    'Radial Shadow',
    'Inner Shadow',

    // Distort
    'Mesh Warp',
    'Bezier Warp',
    'Ripple',
    'Wave Warp',
    'Liquify',
    'Corner Pin',

    // Motion / Stabilization
    'Warp Stabilizer',
    'Puppet',
    'Reshape',

    // Time
    'Echo',
    'Posterize Time',
    'Time Warp',

    // Simulation / Particles
    'Particle Playground',
    'CC Particle Systems II',
    'CC Particle World',
    'Shatter',

    // Text / Obsolete (still heavily used)
    'Text',
    'Numbers',
    'Timecode',
    'Path Text',

    // Matte / Channel
    'Simple Choker',
    'Minimax',
    'Channel Combiner',
    'Set Matte',
    'Linear Wipe',
  ];

  // -------------------------------------------------------------------------
  // Public methods
  // -------------------------------------------------------------------------

  /**
   * Builds the full unified search index.
   *
   * Collects all Astron commands from CommandRegistry and all seeded native
   * effects, merges them into a single IndexEntry array, and hands it off to
   * FuzzySearch to construct the Fuse.js index.
   *
   * Must be called once during CEP panel startup (Core Engine bootstrap).
   * Subsequent calls are idempotent: `isBuilt` is set to `true` on first
   * completion, and callers can check `isReady()` before invoking `build()`.
   *
   * @returns {Promise<void>} Resolves once the index has been constructed.
   */
  public async build(): Promise<void> {
    const nativeEffects: IndexEntry[] = this.buildNativeEffects();
    const astronCommands: IndexEntry[] = this.buildAstronCommands();

    this.isBuilt = true;

    fuzzySearch.buildIndex([...astronCommands, ...nativeEffects]);

    console.log(
      `Astron Index: ${fuzzySearch.getItemCount()} entries indexed.`,
    );
  }

  /**
   * Registers a third-party plugin effect into the live index.
   *
   * Called by the Effects module (T003) after it scans the AE plugin directory
   * via ExtendScript at startup. Each discovered effect is passed in individually.
   *
   * The entry is added directly to the FuzzySearch instance so it is immediately
   * searchable without a full index rebuild.
   *
   * @param name       - Display name of the effect (e.g. "Deep Glow")
   * @param pluginName - Name of the parent plugin (e.g. "Rowbyte")
   */
  public addThirdPartyEffect(name: string, pluginName: string): void {
    const entry: IndexEntry = {
      id: `third-party:${pluginName}:${name}`.replace(/\s+/g, '-').toLowerCase(),
      label: name,
      type: 'effect',
      source: 'third_party' as CommandSource,
      keywords: [
        name.toLowerCase(),
        pluginName.toLowerCase(),
        'plugin',
        'effect',
      ],
    };

    fuzzySearch.addEntry(entry);
  }

  /**
   * Registers a user-installed script into the live index.
   *
   * Called by the Automate module (Module 11) Script Indexer after it scans
   * the AE Scripts folder and ScriptUI Panels directory via ExtendScript.
   *
   * @param scriptName - Display name of the script (e.g. "Duik Bassel 2")
   */
  public addScript(scriptName: string): void {
    const entry: IndexEntry = {
      id: `script:${scriptName.replace(/\s+/g, '-').toLowerCase()}`,
      label: scriptName,
      type: 'script',
      source: 'script' as CommandSource,
      keywords: [
        scriptName.toLowerCase(),
        'script',
        'run',
        'execute',
      ],
    };

    fuzzySearch.addEntry(entry);
  }

  /**
   * Returns whether the index has been successfully built.
   *
   * The Core Engine and CommandPalette UI gate search interactions on this flag —
   * the palette shows a "Building index…" spinner until `isReady()` returns true.
   *
   * @returns {boolean} `true` once `build()` has completed at least once.
   */
  public isReady(): boolean {
    return this.isBuilt;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Maps the seeded `nativeEffectNames` list into typed `IndexEntry` objects.
   *
   * Each native effect receives:
   *   - A deterministic, URL-safe id prefixed with `native:`
   *   - type: 'effect' and source: 'native_effect' for search-result priority scoring
   *   - A minimal keyword set: the lowercased name, plus 'effect' and 'native'
   *     as generic fallback terms
   *
   * @returns {IndexEntry[]} Array of IndexEntry objects for all native effects.
   */
  private buildNativeEffects(): IndexEntry[] {
    return this.nativeEffectNames.map((name): IndexEntry => ({
      id: `native:${name.replace(/\s+/g, '-').toLowerCase()}`,
      label: name,
      type: 'effect',
      source: 'native_effect' as CommandSource,
      keywords: [
        name.toLowerCase(),
        'effect',
        'native',
      ],
    }));
  }

  /**
   * Retrieves all registered Astron module commands from CommandRegistry
   * and maps them into typed `IndexEntry` objects.
   *
   * Commands carry their `module` field so the palette UI can render the
   * module badge (e.g. "MOTION", "TIMELINE") alongside each result.
   * They also carry their full `keywords` array — authored per-command in
   * CommandRegistry — which improves fuzzy match recall over label-only search.
   *
   * @returns {IndexEntry[]} Array of IndexEntry objects for all registered commands.
   */
  private buildAstronCommands(): IndexEntry[] {
    return commandRegistry.getAll().map((command): IndexEntry => ({
      id: command.id,
      label: command.label,
      type: 'command',
      source: 'astron' as CommandSource,
      module: command.module as ModuleName,
      keywords: command.keywords,
    }));
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/**
 * Singleton instance of IndexBuilder.
 *
 * Consumed by:
 *   - Core Engine bootstrap  → calls `indexBuilder.build()` on panel open
 *   - Effects module (T003)  → calls `indexBuilder.addThirdPartyEffect()`
 *   - Automate module        → calls `indexBuilder.addScript()`
 *   - CommandPalette UI      → polls `indexBuilder.isReady()` before first search
 */
export const indexBuilder = new IndexBuilder();
