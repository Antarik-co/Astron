// =============================================================================
// Astron — Module 03: EFFECTS
// src/modules/03_effects/effects.extendscript.jsx
//
// Depends on: T011 (core.jsx — Astron global), T012 (Astron.utils.effects)
// Registers:  Astron.handlers.effects
//
// Implements:
//   addEffect(params)
//   applyStack(params)
//   saveStack(params)
//   clearEffects(params)
//   applyGlow(params)
// =============================================================================

(function () {

    // -------------------------------------------------------------------------
    // Guard: Astron global must exist (provided by core.jsx / T011)
    // -------------------------------------------------------------------------
    if (typeof Astron === "undefined") {
        throw new Error("[Astron:effects] Astron global not found. Load core.jsx first.");
    }
    if (typeof Astron.utils === "undefined" || typeof Astron.utils.effects === "undefined") {
        throw new Error("[Astron:effects] Astron.utils.effects not found. Load effects utils first.");
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Return the active composition, or null.
     * @returns {CompItem|null}
     */
    function _getActiveComp() {
        var proj = app.project;
        if (!proj) { return null; }
        var comp = proj.activeItem;
        if (!comp || !(comp instanceof CompItem)) { return null; }
        return comp;
    }

    /**
     * Return an array of currently selected layers in the active comp.
     * @returns {Layer[]}
     */
    function _getSelectedLayers() {
        var comp = _getActiveComp();
        if (!comp) { return []; }
        var layers = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i).selected) {
                layers.push(comp.layer(i));
            }
        }
        return layers;
    }

    /**
     * Safely parse a JSON string.  Returns null on failure.
     * ES3-safe: relies on the AE host's built-in JSON or a simple eval wrapper.
     * @param {string} str
     * @returns {*|null}
     */
    function _safeParseJSON(str) {
        if (!str || str === "") { return null; }
        try {
            // AE CS6+ ships with a JSON global; fall back to eval for older hosts.
            if (typeof JSON !== "undefined" && JSON.parse) {
                return JSON.parse(str);
            }
            // Safe subset eval: only allow arrays/objects of primitives.
            // We explicitly discard anything that looks like a function call.
            if (/[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/.test(
                    str.replace(/"(\\.|[^"\\])*"/g, ""))) {
                return null;
            }
            return eval("(" + str + ")");
        } catch (e) {
            return null;
        }
    }

    /**
     * Resolve a human-readable effect name to its matchName string.
     * Falls back to using effectName itself (supports third-party effects).
     * @param {string} effectName
     * @returns {string}
     */
    function _resolveMatchName(effectName) {
        var matchNames = Astron.utils.effects.getMatchNames();
        // matchNames is expected to be an object: { "Display Name": "ADBE matchName", ... }
        if (matchNames && typeof matchNames === "object") {
            // Direct key lookup (case-insensitive search)
            var lower = effectName.toLowerCase();
            for (var key in matchNames) {
                if (matchNames.hasOwnProperty(key)) {
                    if (key.toLowerCase() === lower) {
                        return matchNames[key];
                    }
                }
            }
        }
        // Not found in registry — treat the supplied string as the matchName directly.
        // This allows third-party effects whose matchName is already known to the caller.
        return effectName;
    }

    // -------------------------------------------------------------------------
    // Glow quality presets
    // -------------------------------------------------------------------------
    var GLOW_PRESETS = {
        "soft":   { threshold: 50, intensity: 1.5 },
        "medium": { threshold: 40, intensity: 3   },
        "hard":   { threshold: 30, intensity: 5   }
    };

    // ADBE property names for ADBE Glo2 (After Effects built-in Glow)
    // Property display names as used in ExtendScript property access:
    //   "Glow Threshold"  → index 1 in the effect
    //   "Glow Radius"     → index 2
    //   "Glow Intensity"  → index 3
    // We use the match-name approach for robustness across localised AE installs.
    var GLOW_MATCHNAME      = "ADBE Glo2";
    var GLOW_THRESHOLD_IDX  = 1;   // Glow Threshold (%)
    var GLOW_INTENSITY_IDX  = 3;   // Glow Intensity

    // -------------------------------------------------------------------------
    // Handler implementations
    // -------------------------------------------------------------------------

    /**
     * addEffect(params)
     *
     * params.effectName {string} — human-readable name or direct matchName
     *
     * 1. Resolves matchName via Astron.utils.effects.getMatchNames().
     * 2. Falls back to using params.effectName as matchName directly.
     * 3. Delegates actual application to Astron.utils.effects.applyToSelectedLayers().
     *
     * Returns: { applied: number, effectName: string }
     */
    function addEffect(params) {
        Astron.utils.beginUndo("Astron: Add Effect");

        var result = { applied: 0, effectName: "" };

        try {
            if (!params || typeof params.effectName !== "string" || params.effectName === "") {
                Astron.utils.endUndo();
                return { applied: 0, effectName: "", error: "effectName param required" };
            }

            var matchName = _resolveMatchName(params.effectName);
            var results   = Astron.utils.effects.applyToSelectedLayers(matchName);

            result.applied     = results ? results.length : 0;
            result.effectName  = params.effectName;

        } catch (e) {
            result.error = e.message || String(e);
        }

        Astron.utils.endUndo();
        return result;
    }

    /**
     * applyStack(params)
     *
     * params.stackName {string} — name of a previously saved effect stack
     *
     * 1. Reads the stack JSON from AE persistent settings.
     * 2. Iterates over each effect name and delegates to addEffect().
     *
     * Returns: { stackName: string, applied: number }
     */
    function applyStack(params) {
        Astron.utils.beginUndo("Astron: Apply Effect Stack");

        var result = { stackName: "", applied: 0 };

        try {
            if (!params || typeof params.stackName !== "string" || params.stackName === "") {
                Astron.utils.endUndo();
                return { stackName: "", applied: 0, error: "stackName param required" };
            }

            result.stackName = params.stackName;

            var settingKey = "STACK_" + params.stackName;
            var rawJSON    = "";

            if (app.settings.haveSetting("Astron", settingKey)) {
                rawJSON = app.settings.getSetting("Astron", settingKey);
            } else {
                Astron.utils.endUndo();
                return { stackName: params.stackName, applied: 0, error: "Stack not found: " + params.stackName };
            }

            var effectNames = _safeParseJSON(rawJSON);
            if (!effectNames || !(effectNames instanceof Array)) {
                Astron.utils.endUndo();
                return { stackName: params.stackName, applied: 0, error: "Invalid stack data for: " + params.stackName };
            }

            for (var i = 0; i < effectNames.length; i++) {
                var name = effectNames[i];
                if (typeof name === "string" && name !== "") {
                    Astron.handlers.effects.addEffect({ effectName: name });
                }
            }

            result.applied = effectNames.length;

        } catch (e) {
            result.error = e.message || String(e);
        }

        Astron.utils.endUndo();
        return result;
    }

    /**
     * saveStack(params)
     *
     * params.name {string} — name to save the stack under
     *
     * 1. Gets the first selected layer.
     * 2. Collects all effect display names from layer.Effects.
     * 3. Serialises as JSON and stores in AE persistent settings.
     *
     * Returns: { saved: boolean, name: string, effects: string[] }
     */
    function saveStack(params) {
        Astron.utils.beginUndo("Astron: Save Effect Stack");

        var result = { saved: false, name: "", effects: [] };

        try {
            if (!params || typeof params.name !== "string" || params.name === "") {
                Astron.utils.endUndo();
                return { saved: false, name: "", effects: [], error: "name param required" };
            }

            var layers = _getSelectedLayers();
            if (layers.length === 0) {
                Astron.utils.endUndo();
                return { saved: false, name: params.name, effects: [], error: "No layers selected" };
            }

            var firstLayer  = layers[0];
            var effectNames = [];
            var fx          = firstLayer.Effects;

            if (fx && fx.numProperties > 0) {
                for (var i = 1; i <= fx.numProperties; i++) {
                    var prop = fx.property(i);
                    if (prop && prop.name) {
                        effectNames.push(prop.name);
                    }
                }
            }

            var settingKey = "STACK_" + params.name;
            var serialised = "";

            // Build JSON array string manually (ES3 safe — no JSON.stringify guarantee
            // on every AE host, so we construct the string directly).
            if (typeof JSON !== "undefined" && JSON.stringify) {
                serialised = JSON.stringify(effectNames);
            } else {
                var parts = [];
                for (var j = 0; j < effectNames.length; j++) {
                    parts.push('"' + effectNames[j].replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"');
                }
                serialised = "[" + parts.join(",") + "]";
            }

            app.settings.saveSetting("Astron", settingKey, serialised);

            result.saved   = true;
            result.name    = params.name;
            result.effects = effectNames;

        } catch (e) {
            result.error = e.message || String(e);
        }

        Astron.utils.endUndo();
        return result;
    }

    /**
     * clearEffects(params)
     *
     * Removes ALL effects from every currently selected layer.
     *
     * Returns: { cleared: number }
     */
    function clearEffects(params) {
        Astron.utils.beginUndo("Astron: Clear Effects");

        var result = { cleared: 0 };

        try {
            var layers = _getSelectedLayers();
            if (layers.length === 0) {
                Astron.utils.endUndo();
                return { cleared: 0, error: "No layers selected" };
            }

            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                if (layer.Effects && layer.Effects.numProperties > 0) {
                    layer.Effects.removeAll();
                }
            }

            result.cleared = layers.length;

        } catch (e) {
            result.error = e.message || String(e);
        }

        Astron.utils.endUndo();
        return result;
    }

    /**
     * applyGlow(params)
     *
     * params.quality {string} — "soft" | "medium" | "hard"
     *
     * Applies the native AE Glow effect (ADBE Glo2) to every selected layer
     * and sets Glow Threshold and Glow Intensity per the chosen quality preset.
     *
     * Returns: { applied: number, quality: string }
     */
    function applyGlow(params) {
        Astron.utils.beginUndo("Astron: Apply Glow");

        var result = { applied: 0, quality: "" };

        try {
            var quality = (params && typeof params.quality === "string") ? params.quality : "medium";

            // Normalise to lowercase and validate against presets.
            quality = quality.toLowerCase();
            if (!GLOW_PRESETS.hasOwnProperty(quality)) {
                quality = "medium";
            }

            var preset  = GLOW_PRESETS[quality];
            var layers  = _getSelectedLayers();

            if (layers.length === 0) {
                Astron.utils.endUndo();
                return { applied: 0, quality: quality, error: "No layers selected" };
            }

            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];

                try {
                    // Apply ADBE Glo2 (built-in AE Glow) by matchName.
                    var glowEffect = layer.Effects.addProperty(GLOW_MATCHNAME);

                    if (glowEffect) {
                        // Set Glow Threshold (property index 1)
                        var threshProp = glowEffect.property(GLOW_THRESHOLD_IDX);
                        if (threshProp && threshProp.canSetValue) {
                            threshProp.setValue(preset.threshold);
                        }

                        // Set Glow Intensity (property index 3)
                        var intensProp = glowEffect.property(GLOW_INTENSITY_IDX);
                        if (intensProp && intensProp.canSetValue) {
                            intensProp.setValue(preset.intensity);
                        }
                    }

                } catch (layerErr) {
                    // Skip layers that cannot accept the effect (e.g. audio-only layers)
                    // and continue processing the rest of the selection.
                }
            }

            result.applied = layers.length;
            result.quality = quality;

        } catch (e) {
            result.error = e.message || String(e);
        }

        Astron.utils.endUndo();
        return result;
    }

    // -------------------------------------------------------------------------
    // Register handler namespace
    // -------------------------------------------------------------------------
    Astron.handlers.effects = {
        addEffect:     addEffect,
        applyStack:    applyStack,
        saveStack:     saveStack,
        clearEffects:  clearEffects,
        applyGlow:     applyGlow
    };

}());
