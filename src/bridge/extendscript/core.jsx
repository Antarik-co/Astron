/**
 * src/bridge/extendscript/core.jsx
 * Astron — AE Plugin
 *
 * T011 — ExtendScript Core Utils
 * Global Astron object: message dispatcher + utility library.
 * This file is the single ExtendScript entry point loaded by the CEP panel.
 * All module .jsx files must be included AFTER this file so their handlers
 * can register themselves onto Astron.handlers.
 *
 * Depends on  : T002 (manifest / CEP loader — ensures this file is evaluated first)
 * Called by   : src/bridge/CSInterface/index.ts via cs.evalScript("Astron.handle(...)")
 *
 * ⚠  ExtendScript is ES3. Strict rules enforced throughout:
 *    - var only (no const / let)
 *    - function keyword only (no arrow functions)
 *    - string concatenation only (no template literals)
 *    - No Promises, async/await, destructuring, or spread operators
 *    - AE objects accessed only via the `app` global
 */

(function () {

    // -------------------------------------------------------------------------
    // 1. NAMESPACE GUARD
    //    Safe to re-evaluate — preserves any handlers already registered by
    //    module .jsx files that may have been included before this file in
    //    edge-case loader orderings.
    // -------------------------------------------------------------------------

    var Astron = Astron || {};


    // -------------------------------------------------------------------------
    // 2. HANDLER REGISTRY
    //    Module .jsx files self-register here:
    //      Astron.handlers.motion = { ease: function(params){...}, ... }
    //    Core handler (ping) is registered at the bottom of this file.
    // -------------------------------------------------------------------------

    Astron.handlers = Astron.handlers || {};


    // -------------------------------------------------------------------------
    // 3. GLOBAL DISPATCHER — Astron.handle(messageJSON)
    //
    //    Called by CSInterfaceBridge.callExtendScript() as:
    //      Astron.handle('{"module":"motion","action":"ease","params":{...}}')
    //
    //    Message contract (ExtendScriptMessage from T003 types/index.ts):
    //      { module: string, action: string, params: object | undefined }
    //
    //    Always returns a JSON string so the CEP side can JSON.parse() it:
    //      Success: '{"success":true,"data":<any>}'
    //      Failure: '{"success":false,"error":"<message>"}'
    // -------------------------------------------------------------------------

    Astron.handle = function (messageJSON) {
        try {
            var msg = JSON.parse(messageJSON);

            // Validate minimum required fields
            if (!msg || typeof msg.module === "undefined" || typeof msg.action === "undefined") {
                return JSON.stringify({
                    success: false,
                    error: "Invalid message: missing required fields 'module' and/or 'action'."
                });
            }

            var handler = Astron.handlers[msg.module];

            if (handler && typeof handler[msg.action] === "function") {
                var result = handler[msg.action](msg.params || {});
                return JSON.stringify({ success: true, data: result });
            } else {
                return JSON.stringify({
                    success: false,
                    error: "Handler not found: " + msg.module + "." + msg.action
                });
            }
        } catch (e) {
            return JSON.stringify({ success: false, error: e.message });
        }
    };


    // =========================================================================
    // 4. ASTRON UTILITIES — Astron.utils
    //
    //    Shared helpers used by every module handler. Module .jsx files should
    //    always call these rather than accessing `app` directly, so that
    //    error messages, undo grouping, and frame math stay consistent across
    //    all 12 modules.
    // =========================================================================

    Astron.utils = Astron.utils || {};


    // -------------------------------------------------------------------------
    // 4.1  Composition access
    // -------------------------------------------------------------------------

    /**
     * Returns the currently active CompItem.
     * Throws a descriptive Error if no comp is active — the catch block in
     * Astron.handle() will serialise this into a { success:false, error } response.
     */
    Astron.utils.getActiveComp = function () {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error(
                "No active composition. Please select a composition first."
            );
        }
        return comp;
    };


    // -------------------------------------------------------------------------
    // 4.2  Layer selection helpers
    // -------------------------------------------------------------------------

    /**
     * Returns an array of all currently selected Layer objects in the active comp.
     * Returns an empty array (not an error) when nothing is selected — callers
     * that require at least one layer should use requireSelectedLayers() instead.
     *
     * NOTE: AE layer indices are 1-based. We iterate comp.numLayers to avoid
     * off-by-one errors that would be silent in ES3.
     */
    Astron.utils.getSelectedLayers = function () {
        var comp = Astron.utils.getActiveComp();
        var selected = [];
        var i;
        for (i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i).selected) {
                selected.push(comp.layer(i));
            }
        }
        return selected;
    };

    /**
     * Finds a layer in the active comp by exact name match.
     * Returns the first matching Layer object, or null if none found.
     *
     * @param {string} name - Exact layer name to search for
     */
    Astron.utils.getLayerByName = function (name) {
        var comp = Astron.utils.getActiveComp();
        var i;
        for (i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i).name === name) {
                return comp.layer(i);
            }
        }
        return null;
    };

    /**
     * Identical to getSelectedLayers() but throws if the result is empty.
     * Use this as the first call in any handler that MUST have a selection
     * (e.g. /ease, /stagger, /snap). The error is caught by Astron.handle()
     * and returned to the CEP side as { success:false, error: "..." }.
     *
     * @returns {Layer[]} Non-empty array of selected layers
     */
    Astron.utils.requireSelectedLayers = function () {
        var layers = Astron.utils.getSelectedLayers();
        if (layers.length === 0) {
            throw new Error(
                "No layers selected. Please select at least one layer."
            );
        }
        return layers;
    };


    // -------------------------------------------------------------------------
    // 4.3  Undo group helpers
    //
    //      Architecture principle (from Implementation Plan §10):
    //      "Every Astron action creates a single AE undo group. One Ctrl/⌘+Z
    //      undoes any Astron operation regardless of how many ExtendScript
    //      calls it made internally."
    //
    //      Usage pattern in module handlers:
    //        Astron.utils.beginUndo("Ease Overshoot");
    //        try { ... do work ... }
    //        finally { Astron.utils.endUndo(); }
    // -------------------------------------------------------------------------

    /**
     * Opens an AE undo group. The group name is prefixed with "Astron: " so
     * every undo entry in AE's history is clearly attributed to this plugin.
     *
     * @param {string} undoName - Human-readable operation name (e.g. "Ease Overshoot")
     */
    Astron.utils.beginUndo = function (undoName) {
        app.beginUndoGroup("Astron: " + undoName);
    };

    /**
     * Closes the currently open undo group.
     * Always call this in a finally block to avoid leaving an open undo group
     * if a handler throws mid-operation.
     */
    Astron.utils.endUndo = function () {
        app.endUndoGroup();
    };


    // -------------------------------------------------------------------------
    // 4.4  Frame / time conversion helpers
    //
    //      AE stores all time values as floating-point seconds. The Timeline
    //      module's frame shift operations and the Motion module's stagger
    //      system both work in frames on the CEP side, so these conversions
    //      are used heavily. Centralising them here ensures all modules use
    //      the same rounding logic.
    // -------------------------------------------------------------------------

    /**
     * Returns the frame rate (fps) of the active composition as a number.
     */
    Astron.utils.getCompFPS = function () {
        return Astron.utils.getActiveComp().frameRate;
    };

    /**
     * Converts a frame count to AE time (seconds).
     *
     * @param  {number} frames - Integer frame count
     * @returns {number} Time in seconds
     */
    Astron.utils.framesToTime = function (frames) {
        return frames / Astron.utils.getCompFPS();
    };

    /**
     * Converts AE time (seconds) to the nearest integer frame count.
     * Uses Math.round to avoid accumulating floating-point drift across
     * the large layer stacks described in the Timeline module spec.
     *
     * @param  {number} time - Time value in seconds
     * @returns {number} Rounded frame count
     */
    Astron.utils.timeToFrames = function (time) {
        return Math.round(time * Astron.utils.getCompFPS());
    };


    // -------------------------------------------------------------------------
    // 4.5  Layer info serialiser
    //
    //      ExtendScript Layer objects cannot be JSON.stringify()'d directly —
    //      they are host objects with circular references and private members.
    //      This utility extracts a plain data object that is safe to return
    //      via Astron.handle() and receive in the CEP / TypeScript layer.
    //
    //      The returned shape maps to the LayerInfo type expected by T003.
    // -------------------------------------------------------------------------

    /**
     * Extracts a serialisable plain object from an AE Layer.
     * Handles both AVLayer (footage, solids, precomps, adjustments, nulls)
     * and non-AVLayer types (cameras, lights) gracefully.
     *
     * @param  {Layer} layer - Any AE layer object
     * @returns {Object} Plain data object safe for JSON serialisation
     */
    Astron.utils.layerInfo = function (layer) {
        var isAV = (layer instanceof AVLayer);
        return {
            name:         layer.name,
            index:        layer.index,
            inPoint:      layer.inPoint,
            outPoint:     layer.outPoint,
            startTime:    layer.startTime,
            enabled:      layer.enabled,
            selected:     layer.selected,
            label:        layer.label,
            isAdjustment: isAV ? layer.adjustmentLayer : false,
            isNull:       isAV ? layer.nullLayer       : false,
            isShy:        layer.shy,
            isGuide:      layer.guideLayer || false
        };
    };


    // =========================================================================
    // 5. CORE HANDLER
    //
    //    The 'core' module handles system-level messages: health checks,
    //    version reporting, and any cross-module diagnostics.
    //    Called by CSInterfaceBridge at panel startup to verify the bridge
    //    is live and core.jsx has been evaluated by AE.
    //
    //    Usage from CEP side:
    //      callExtendScript({ module: 'core', action: 'ping', params: {} })
    //      → { success: true, data: { status: 'ok', version: '1.0.0', ... } }
    // =========================================================================

    Astron.handlers.core = {

        /**
         * Health-check ping.
         * Returns plugin version, AE build info, and the name of the currently
         * active composition (null if no comp is open).
         *
         * @param {Object} params - Unused; reserved for future flags
         * @returns {Object} Status payload
         */
        ping: function (params) {
            var activeCompName = null;
            if (app.project.activeItem && (app.project.activeItem instanceof CompItem)) {
                activeCompName = app.project.activeItem.name;
            }

            return {
                status:    "ok",
                version:   "1.0.0",
                plugin:    "Astron",
                activeComp: activeCompName
            };
        }

    };


    // =========================================================================
    // 6. EXPOSE GLOBAL
    //
    //    Assign back to the global scope so all subsequently-loaded module
    //    .jsx files (motion.extendscript.jsx, timeline.extendscript.jsx, etc.)
    //    can access Astron.utils and register into Astron.handlers without
    //    needing to import anything.
    //
    //    In ExtendScript, `$` is the ES host object; assigning to an unqualified
    //    name inside an IIFE creates a local, not a global. Explicit global
    //    assignment is required.
    // =========================================================================

    $.global.Astron = Astron;

}());
