/**
 * src/bridge/CSInterface/index.ts
 * Astron — AE Plugin
 *
 * T010 — CSInterface Bridge
 * Bridges the CEP panel (HTML/JS) to After Effects via the Adobe CSInterface API.
 * Delegates all ExtendScript execution through the global `Astron` object defined
 * in core.jsx (ExtendScript side).
 *
 * Depends on: T003 (types/index.ts — ExtendScriptMessage, ExtendScriptResult)
 */

import { ExtendScriptMessage, ExtendScriptResult } from '../../types/index';

// ---------------------------------------------------------------------------
// CSInterfaceBridge Class
// ---------------------------------------------------------------------------

export class CSInterfaceBridge {
  /**
   * Native CSInterface instance.
   * Set to `null` when running outside a CEP environment (dev / browser mode).
   */
  private cs: any;

  constructor() {
    try {
      this.cs =
        typeof window !== 'undefined' && (window as any).CSInterface
          ? new (window as any).CSInterface()
          : null;
    } catch {
      // Guard against environments where window is undefined (e.g. SSR, Node tests)
      this.cs = null;
    }
  }

  // -------------------------------------------------------------------------
  // Core eval
  // -------------------------------------------------------------------------

  /**
   * Evaluates a raw ExtendScript string inside After Effects.
   *
   * - Dev mode (cs === null): resolves immediately with a descriptive error.
   * - CEP mode: wraps the CSInterface callback in a Promise and attempts JSON
   *   parsing of the result string; falls back to the raw string on parse failure.
   */
  evalScript(script: string): Promise<ExtendScriptResult> {
    if (this.cs === null) {
      return Promise.resolve({
        success: false,
        error: 'Not in CEP environment (dev mode)',
      });
    }

    return new Promise<ExtendScriptResult>((resolve) => {
      this.cs.evalScript(script, (result: string) => {
        try {
          resolve({ success: true, data: JSON.parse(result) });
        } catch {
          // Result is a plain string (not JSON) — return as-is
          resolve({ success: true, data: result });
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // Structured message dispatch
  // -------------------------------------------------------------------------

  /**
   * Serialises an `ExtendScriptMessage` and dispatches it to the global
   * `Astron.handle()` function defined in core.jsx.
   *
   * This is the primary call surface for all Astron module commands —
   * every module action should route through here rather than calling
   * `evalScript` directly with raw JSX strings.
   *
   * @param message - Typed message object consumed by Astron.handle()
   */
  callExtendScript(message: ExtendScriptMessage): Promise<ExtendScriptResult> {
    const scriptCall = `Astron.handle(${JSON.stringify(message)})`;
    return this.evalScript(scriptCall);
  }

  // -------------------------------------------------------------------------
  // Batch execution
  // -------------------------------------------------------------------------

  /**
   * Runs an array of raw ExtendScript strings **sequentially** (one after
   * another, not in parallel).
   *
   * Rationale: AE's ExtendScript engine is single-threaded. Firing concurrent
   * evalScript calls can corrupt the undo stack and cause race conditions on
   * large comps. Sequential execution via a reduce + promise chain guarantees
   * ordered, safe batching — consistent with the performance rule from the
   * Astron architecture docs ("Group all operations into a single evalScript
   * call; never call once per layer").
   *
   * For callers that want a single batched JSX string (faster), prefer building
   * one composite script and calling `evalScript` directly.
   *
   * @param scripts - Ordered list of ExtendScript strings to evaluate
   * @returns Array of results in the same order as the input scripts
   */
  batchEvalScript(scripts: string[]): Promise<ExtendScriptResult[]> {
    return scripts.reduce<Promise<ExtendScriptResult[]>>(
      (chain, script) =>
        chain.then((results) =>
          this.evalScript(script).then((result) => [...results, result])
        ),
      Promise.resolve([])
    );
  }

  // -------------------------------------------------------------------------
  // Utility helpers
  // -------------------------------------------------------------------------

  /**
   * Returns `true` when a live CSInterface instance is available.
   * Use this to gate CEP-only UI or features in dev/test environments.
   */
  isConnected(): boolean {
    return this.cs !== null;
  }

  /**
   * Retrieves a system path from CSInterface (e.g. application, extension,
   * or desktop paths). Returns an empty string in dev mode.
   *
   * @param pathType - One of the CSInterface SystemPath constants
   *   e.g. `SystemPath.APPLICATION`, `SystemPath.EXTENSION`
   */
  getSystemPath(pathType: string): string {
    return this.cs ? this.cs.getSystemPath(pathType) : '';
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

/**
 * Shared singleton bridge instance.
 * Import this (or the standalone functions below) throughout Astron's
 * module layer — do not create additional `CSInterfaceBridge` instances.
 */
export const csBridge = new CSInterfaceBridge();

// ---------------------------------------------------------------------------
// Standalone convenience functions (delegate to singleton)
// ---------------------------------------------------------------------------

/**
 * Evaluate a raw ExtendScript string.
 * @see CSInterfaceBridge.evalScript
 */
export const evalScript = (script: string): Promise<ExtendScriptResult> =>
  csBridge.evalScript(script);

/**
 * Dispatch a typed Astron message to `Astron.handle()` in core.jsx.
 * @see CSInterfaceBridge.callExtendScript
 */
export const callExtendScript = (
  msg: ExtendScriptMessage
): Promise<ExtendScriptResult> => csBridge.callExtendScript(msg);

/**
 * Sequentially evaluate multiple ExtendScript strings.
 * @see CSInterfaceBridge.batchEvalScript
 */
export const batchEvalScript = (
  scripts: string[]
): Promise<ExtendScriptResult[]> => csBridge.batchEvalScript(scripts);
