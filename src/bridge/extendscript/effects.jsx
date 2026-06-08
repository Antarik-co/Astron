/**
 * src/bridge/extendscript/effects.jsx
 * Astron — AE Plugin
 *
 * T012 — ExtendScript Effects Utils
 * Extends Astron.utils with an `effects` sub-namespace and registers the
 * `effects` module handler onto Astron.handlers.
 *
 * Depends on  : T011 — core.jsx must be evaluated before this file so that
 *               $.global.Astron, Astron.utils, Astron.handlers, and all core
 *               utility functions (requireSelectedLayers, beginUndo, endUndo)
 *               are already available.
 *
 * Load order  : core.jsx → effects.jsx → (other module .jsx files)
 *
 * ⚠  ExtendScript is ES3. Strict rules enforced throughout:
 *    - var only (no const / let)
 *    - function keyword only (no arrow functions)
 *    - string concatenation only (no template literals)
 *    - No Promises, async/await, destructuring, or spread operators
 *    - AE objects accessed only via the `app` global or layer references
 *      passed in from core utilities
 */

(function () {

    // -------------------------------------------------------------------------
    // 1. NAMESPACE GUARD
    //    Pull the existing Astron global created by core.jsx.
    //    If somehow this file is evaluated before core.jsx (should not happen),
    //    we create a minimal shell so nothing throws — but core.jsx MUST be
    //    loaded first for Astron.utils helpers to be available.
    // -------------------------------------------------------------------------

    var Astron = $.global.Astron || {};
    Astron.utils = Astron.utils || {};
    Astron.handlers = Astron.handlers || {};


    // =========================================================================
    // 2. ASTRON.UTILS.EFFECTS — low-level effect operations
    //
    //    These are pure utilities: they take explicit layer references and do
    //    not touch the selection state or undo stack themselves. All undo
    //    wrapping happens at the handler level (Section 3) so that batch
    //    operations across many layers are covered by a single undo group.
    // =========================================================================

    Astron.utils.effects = Astron.utils.effects || {};


    // -------------------------------------------------------------------------
    // 2.1  addEffect
    //
    //      Adds a single effect to a layer by its internal match name.
    //      Match names are stable across AE versions and locales; display names
    //      are not. Always use match names for programmatic effect application.
    //      See getMatchNames() for the built-in lookup table.
    //
    //      Returns the newly created PropertyBase (Effect) object so callers can
    //      immediately set parameters on it if needed.
    //
    //      Throws if the match name is not recognised by AE — the error will
    //      propagate up through applyToSelectedLayers()'s per-layer try/catch
    //      and be recorded in the results array rather than aborting the batch.
    //
    //      @param {Layer}  layer           - Target AE layer
    //      @param {string} effectMatchName - ADBE match name string
    //      @returns {Property} The added effect property
    // -------------------------------------------------------------------------

    Astron.utils.effects.addEffect = function (layer, effectMatchName) {
        return layer.Effects.addProperty(effectMatchName);
    };


    // -------------------------------------------------------------------------
    // 2.2  removeEffect
    //
    //      Removes the first effect whose display name exactly matches
    //      effectName. Uses display name (not match name) to match the UX of
    //      commands like `/remove "Gaussian Blur"` where users type what they
    //      see in the AE panel, not the internal ADBE string.
    //
    //      Returns true if an effect was found and removed, false otherwise.
    //      Does not throw on "not found" — the caller decides whether absence
    //      is an error condition.
    //
    //      NOTE: After remove(), the Effects collection re-indexes. We return
    //      immediately on the first match rather than continuing the loop,
    //      which avoids accessing a now-invalid index.
    //
    //      @param {Layer}  layer      - Target AE layer
    //      @param {string} effectName - Display name of the effect to remove
    //      @returns {boolean}
    // -------------------------------------------------------------------------

    Astron.utils.effects.removeEffect = function (layer, effectName) {
        var i;
        for (i = 1; i <= layer.Effects.numProperties; i++) {
            if (layer.Effects.property(i).name === effectName) {
                layer.Effects.property(i).remove();
                return true;
            }
        }
        return false;
    };


    // -------------------------------------------------------------------------
    // 2.3  getEffect
    //
    //      Returns a reference to the first effect matching effectName on the
    //      given layer, or null if not found.
    //
    //      Useful before calling setParameter operations so callers can check
    //      existence without a try/catch.
    //
    //      @param {Layer}  layer      - Target AE layer
    //      @param {string} effectName - Display name of the effect to find
    //      @returns {Property|null}
    // -------------------------------------------------------------------------

    Astron.utils.effects.getEffect = function (layer, effectName) {
        var i;
        for (i = 1; i <= layer.Effects.numProperties; i++) {
            if (layer.Effects.property(i).name === effectName) {
                return layer.Effects.property(i);
            }
        }
        return null;
    };


    // -------------------------------------------------------------------------
    // 2.4  applyToSelectedLayers
    //
    //      Applies a single effect (by match name) to every currently selected
    //      layer in the active comp. Wraps the entire batch in one undo group
    //      so the user can undo all additions with a single Ctrl/⌘+Z — this is
    //      the "Reversible Always" UX principle from the architecture docs.
    //
    //      Per-layer errors are caught and recorded in the results array rather
    //      than aborting the batch. This means applying to 10 layers where 1
    //      is a camera (which cannot receive effects) still succeeds for the
    //      other 9 and reports a clear error for the camera.
    //
    //      IMPORTANT: endUndo() is called unconditionally after the loop, not
    //      inside the try/catch. If beginUndo() was called, endUndo() must
    //      always be called — otherwise AE's undo stack is left in a broken
    //      open-group state for the rest of the session. The pattern used here
    //      (beginUndo before loop, endUndo after loop, per-layer try/catch
    //      inside) is the correct ExtendScript idiom for batch operations.
    //
    //      @param {string} effectMatchName - ADBE match name to apply
    //      @returns {Array} Array of { layer: string, success: boolean, error?: string }
    // -------------------------------------------------------------------------

    Astron.utils.effects.applyToSelectedLayers = function (effectMatchName) {
        var layers = Astron.utils.requireSelectedLayers();
        var results = [];
        var i;

        Astron.utils.beginUndo("Apply Effect");

        for (i = 0; i < layers.length; i++) {
            try {
                Astron.utils.effects.addEffect(layers[i], effectMatchName);
                results.push({ layer: layers[i].name, success: true });
            } catch (e) {
                results.push({
                    layer:   layers[i].name,
                    success: false,
                    error:   e.message
                });
            }
        }

        Astron.utils.endUndo();
        return results;
    };


    // -------------------------------------------------------------------------
    // 2.5  getMatchNames
    //
    //      Returns a plain lookup object mapping human-readable effect names
    //      (as typed in the command palette) to their stable ADBE match name
    //      strings. Module handlers use this to resolve user input before
    //      calling addEffect().
    //
    //      Match names are internal Adobe identifiers that are:
    //        - Locale-independent (work in every language of AE)
    //        - Version-stable across AE releases
    //        - Required by layer.Effects.addProperty()
    //
    //      This list covers the most commonly used effects across all 12 modules.
    //      Module-specific effects (e.g. CC Particle World for the Particles
    //      module, Warp Stabilizer for the Organise module) are included here
    //      for central discoverability rather than scattered across module files.
    //
    //      @returns {Object} { displayName: matchNameString, ... }
    // -------------------------------------------------------------------------

    Astron.utils.effects.getMatchNames = function () {
        return {
            "Gaussian Blur":           "ADBE Gaussian Blur 2",
            "Fast Box Blur":           "ADBE Fast Blur",
            "Glow":                    "ADBE Glo2",
            "Lens Flare":              "ADBE Lens Flare",
            "Fill":                    "ADBE Fill",
            "Stroke":                  "ADBE Stroke",
            "Gradient Ramp":           "ADBE Ramp",
            "Levels":                  "ADBE Levels2",
            "Curves":                  "ADBE CurvesCustom",
            "Hue/Saturation":          "ADBE HUE SATURATION",
            "Drop Shadow":             "ADBE Drop Shadow",
            "Brightness & Contrast":   "ADBE Brightness & Contrast 2",
            "Fractal Noise":           "ADBE Fractal Noise",
            "CC Particle World":       "CC Particle World",
            "Warp Stabilizer":         "ADBE Warp Stabilizer",
            "Motion Blur":             "ADBE Motion Blur",
            "Echo":                    "ADBE Echo",
            "Posterize Time":          "ADBE Posterize Time"
        };
    };


    // =========================================================================
    // 3. EFFECTS MODULE HANDLER — Astron.handlers.effects
    //
    //    Registered on Astron.handlers so the dispatcher in core.jsx can route
    //    messages of the form:
    //      { module: "effects", action: "add", params: { matchName: "..." } }
    //
    //    Each action validates its params, delegates to Astron.utils.effects,
    //    and returns a plain serialisable object. All AE host-object references
    //    are resolved to plain data before returning — Layer objects must never
    //    reach the JSON.stringify() call in Astron.handle().
    // =========================================================================

    Astron.handlers.effects = {

        // ---------------------------------------------------------------------
        // add
        //
        // Adds an effect to all selected layers by match name.
        //
        // Params:
        //   matchName {string} - ADBE match name (direct, for advanced callers)
        //
        // Example message:
        //   { module: "effects", action: "add",
        //     params: { matchName: "ADBE Gaussian Blur 2" } }
        //
        // Returns: Array of per-layer result objects from applyToSelectedLayers()
        // ---------------------------------------------------------------------

        add: function (params) {
            if (!params || !params.matchName) {
                throw new Error(
                    "effects.add requires params.matchName (ADBE match name string)."
                );
            }
            return Astron.utils.effects.applyToSelectedLayers(params.matchName);
        },

        // ---------------------------------------------------------------------
        // addByName
        //
        // Adds an effect to all selected layers by its human-readable display
        // name, resolved through the built-in getMatchNames() table.
        // This is the action used by the command palette when the user types
        // "/add Gaussian Blur" — the CEP layer resolves the display name to
        // a message and this handler resolves it to a match name.
        //
        // Params:
        //   displayName {string} - Human-readable effect name from the lookup table
        //
        // Example message:
        //   { module: "effects", action: "addByName",
        //     params: { displayName: "Gaussian Blur" } }
        //
        // Returns: Array of per-layer result objects, or error if name not found
        // ---------------------------------------------------------------------

        addByName: function (params) {
            if (!params || !params.displayName) {
                throw new Error(
                    "effects.addByName requires params.displayName."
                );
            }
            var matchNames = Astron.utils.effects.getMatchNames();
            var matchName = matchNames[params.displayName];
            if (!matchName) {
                throw new Error(
                    "Unknown effect display name: \"" + params.displayName + "\". " +
                    "Use effects.getMatchNames to list available names, or " +
                    "use effects.add with a direct ADBE match name."
                );
            }
            return Astron.utils.effects.applyToSelectedLayers(matchName);
        },

        // ---------------------------------------------------------------------
        // remove
        //
        // Removes a named effect from all selected layers.
        // Uses display name (what users see in AE) not the match name.
        //
        // Params:
        //   effectName {string} - Display name of effect to remove
        //
        // Example message:
        //   { module: "effects", action: "remove",
        //     params: { effectName: "Gaussian Blur" } }
        //
        // Returns: Array of { layer, removed: boolean } objects
        // ---------------------------------------------------------------------

        remove: function (params) {
            if (!params || !params.effectName) {
                throw new Error(
                    "effects.remove requires params.effectName (display name)."
                );
            }
            var layers = Astron.utils.requireSelectedLayers();
            var results = [];
            var i;

            Astron.utils.beginUndo("Remove Effect");

            for (i = 0; i < layers.length; i++) {
                try {
                    var removed = Astron.utils.effects.removeEffect(
                        layers[i],
                        params.effectName
                    );
                    results.push({ layer: layers[i].name, removed: removed });
                } catch (e) {
                    results.push({
                        layer:   layers[i].name,
                        removed: false,
                        error:   e.message
                    });
                }
            }

            Astron.utils.endUndo();
            return results;
        },

        // ---------------------------------------------------------------------
        // listOnLayer
        //
        // Returns a serialisable list of all effects currently on the first
        // selected layer. Useful for the Effects panel UI to populate the
        // "current effects" display and for the /stack save command to capture
        // an existing effect chain.
        //
        // Params: none
        //
        // Returns: Array of { index, name, enabled } objects
        // ---------------------------------------------------------------------

        listOnLayer: function (params) {
            var layers = Astron.utils.requireSelectedLayers();
            var layer = layers[0];
            var effectsList = [];
            var i;

            for (i = 1; i <= layer.Effects.numProperties; i++) {
                var fx = layer.Effects.property(i);
                effectsList.push({
                    index:   i,
                    name:    fx.name,
                    enabled: fx.enabled
                });
            }

            return {
                layer:   layer.name,
                effects: effectsList
            };
        },

        // ---------------------------------------------------------------------
        // toggleEnabled
        //
        // Enables or disables a named effect on all selected layers.
        // Used by the Effects panel's on/off toggle per effect row.
        //
        // Params:
        //   effectName {string}  - Display name of the effect
        //   enabled    {boolean} - true = enable, false = disable
        //
        // Returns: Array of { layer, found: boolean, enabled: boolean } objects
        // ---------------------------------------------------------------------

        toggleEnabled: function (params) {
            if (!params || !params.effectName || typeof params.enabled === "undefined") {
                throw new Error(
                    "effects.toggleEnabled requires params.effectName and params.enabled."
                );
            }
            var layers = Astron.utils.requireSelectedLayers();
            var results = [];
            var i;

            Astron.utils.beginUndo("Toggle Effect");

            for (i = 0; i < layers.length; i++) {
                try {
                    var fx = Astron.utils.effects.getEffect(layers[i], params.effectName);
                    if (fx) {
                        fx.enabled = params.enabled;
                        results.push({
                            layer:   layers[i].name,
                            found:   true,
                            enabled: params.enabled
                        });
                    } else {
                        results.push({
                            layer: layers[i].name,
                            found: false
                        });
                    }
                } catch (e) {
                    results.push({
                        layer: layers[i].name,
                        found: false,
                        error: e.message
                    });
                }
            }

            Astron.utils.endUndo();
            return results;
        },

        // ---------------------------------------------------------------------
        // getMatchNames
        //
        // Exposes the match name lookup table to the CEP layer.
        // Used by the command palette's effect search autocomplete and by the
        // /add command handler to validate user input before round-tripping to
        // ExtendScript.
        //
        // Params: none
        //
        // Returns: { displayName: matchNameString, ... }
        // ---------------------------------------------------------------------

        getMatchNames: function (params) {
            return Astron.utils.effects.getMatchNames();
        }

    };


    // =========================================================================
    // 4. WRITE BACK TO GLOBAL
    //    Ensure the extended Astron object (now including utils.effects and
    //    handlers.effects) is visible to all subsequent .jsx files and to any
    //    CEP eval calls made after this file is loaded.
    // =========================================================================

    $.global.Astron = Astron;

}());
