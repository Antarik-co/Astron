(function () {
    // ─────────────────────────────────────────────────────────────────────────
    // Astron — MODULE 01: MOTION
    // motion.extendscript.jsx
    // ExtendScript ES3 — no const/let, no arrow functions, no template literals
    // Depends on: Astron global (core.jsx)
    // ─────────────────────────────────────────────────────────────────────────

    // ── Internal helper: recursively walk all properties on a layer
    // and collect every PropertyBase that has keyframes (numKeys > 0).
    function collectKeyframedProps(propGroup, results) {
        var i;
        for (i = 1; i <= propGroup.numProperties; i++) {
            var prop = propGroup.property(i);
            if (prop.propertyType === PropertyType.INDEXED_GROUP ||
                prop.propertyType === PropertyType.NAMED_GROUP) {
                collectKeyframedProps(prop, results);
            } else {
                try {
                    if (prop.numKeys && prop.numKeys > 0) {
                        results.push(prop);
                    }
                } catch (e) {
                    // Some properties throw on numKeys access — skip silently
                }
            }
        }
    }

    // ── Internal helper: apply KeyframeInterpolationType to all selected
    // (or all) keyframes of a single property.
    function applyInterpToProp(prop, inType, outType) {
        var k;
        for (k = 1; k <= prop.numKeys; k++) {
            try {
                prop.setInterpolationTypeAtKey(k, inType, outType);
            } catch (e) {
                // Skip properties that don't support interpolation changes
            }
        }
    }

    // ── Internal helper: apply temporal easing objects to all keyframes
    // of a single property.
    function applyEasingToProp(prop, easeInObj, easeOutObj) {
        var k;
        for (k = 1; k <= prop.numKeys; k++) {
            try {
                prop.setTemporalEaseAtKey(k, [easeInObj], [easeOutObj]);
            } catch (e) {
                // Skip read-only or non-temporal properties
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Register module handlers
    // ─────────────────────────────────────────────────────────────────────────
    Astron.handlers.motion = {

        // ─────────────────────────────────────────────────────────────────
        // applyEasing(params)
        // params.preset: 'overshoot'|'elastic'|'bounce'|'ease-in'|
        //                'ease-out'|'ease-in-out'|'linear'
        // ─────────────────────────────────────────────────────────────────
        applyEasing: function (params) {
            Astron.utils.beginUndo("Astron: Apply Easing");

            var preset = params.preset || "ease-in-out";
            var layers = Astron.utils.getSelectedLayers();
            var affectedCount = 0;
            var i, j;

            // Determine interpolation types and whether we need custom easing
            var inType;
            var outType;
            var useCustomEase = false;

            if (preset === "linear") {
                inType  = KeyframeInterpolationType.LINEAR;
                outType = KeyframeInterpolationType.LINEAR;
            } else if (preset === "ease-in") {
                inType  = KeyframeInterpolationType.EASY_EASE_IN;
                outType = KeyframeInterpolationType.EASY_EASE_IN;
            } else if (preset === "ease-out") {
                inType  = KeyframeInterpolationType.EASY_EASE_OUT;
                outType = KeyframeInterpolationType.EASY_EASE_OUT;
            } else if (preset === "ease-in-out") {
                inType  = KeyframeInterpolationType.EASY_EASE;
                outType = KeyframeInterpolationType.EASY_EASE;
            } else if (preset === "overshoot" ||
                       preset === "elastic"   ||
                       preset === "bounce") {
                // Use EASY_EASE as the base, then override temporal easing
                inType        = KeyframeInterpolationType.EASY_EASE;
                outType       = KeyframeInterpolationType.EASY_EASE;
                useCustomEase = true;
            } else {
                // Fallback: treat unknown presets as ease-in-out
                inType  = KeyframeInterpolationType.EASY_EASE;
                outType = KeyframeInterpolationType.EASY_EASE;
            }

            for (i = 0; i < layers.length; i++) {
                var layer = layers[i];
                var keyframedProps = [];
                collectKeyframedProps(layer, keyframedProps);

                for (j = 0; j < keyframedProps.length; j++) {
                    var prop = keyframedProps[j];

                    // Apply interpolation type
                    applyInterpToProp(prop, inType, outType);
                    affectedCount += prop.numKeys;

                    // Apply custom temporal easing for physical presets
                    if (useCustomEase) {
                        var easeIn  = new KeyframeEase(0, 33);
                        var easeOut = new KeyframeEase(0, 33);
                        applyEasingToProp(prop, easeIn, easeOut);
                    }
                }
            }

            Astron.utils.endUndo();
            return { affected: affectedCount, preset: preset };
        },

        // ─────────────────────────────────────────────────────────────────
        // applyStagger(params)
        // params.delayMs: number
        // params.direction: 'left'|'right'|'up'|'down'|'random'
        // ─────────────────────────────────────────────────────────────────
        applyStagger: function (params) {
            Astron.utils.beginUndo("Astron: Apply Stagger");

            var delayMs   = params.delayMs   || 100;
            var direction = params.direction || "right";
            var layers    = Astron.utils.getSelectedLayers();
            var i;

            // Sort layers by index (ascending) to ensure consistent stagger order
            layers.sort(function (a, b) {
                return a.index - b.index;
            });

            // For 'random' direction we still stagger sequentially but could
            // shuffle order — here we shuffle the array before applying offsets
            if (direction === "random") {
                for (i = layers.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    var temp = layers[i];
                    layers[i] = layers[j];
                    layers[j] = temp;
                }
            }

            // For 'left'/'up' we reverse the stagger direction (latest index = 0 delay)
            var shouldReverse = (direction === "left" || direction === "up");

            for (i = 0; i < layers.length; i++) {
                var layerIndex = shouldReverse ? (layers.length - 1 - i) : i;
                var offsetSec  = (layerIndex * delayMs) / 1000;
                layers[i].startTime += offsetSec;
            }

            Astron.utils.endUndo();
            return { affected: layers.length, delayMs: delayMs };
        },

        // ─────────────────────────────────────────────────────────────────
        // applyBounce(params)
        // params.height: number (0-100)
        // params.decay:  number (0-1)
        // params.elasticity: number (0-2)
        // ─────────────────────────────────────────────────────────────────
        applyBounce: function (params) {
            Astron.utils.beginUndo("Astron: Apply Bounce");

            var height      = (params.height      !== undefined) ? params.height      : 50;
            var decay       = (params.decay       !== undefined) ? params.decay       : 0.7;
            var elasticity  = (params.elasticity  !== undefined) ? params.elasticity  : 1.2;
            var layers      = Astron.utils.getSelectedLayers();
            var i;

            // Build expression string using concatenation (ES3 safe, no template literals)
            var expr =
                "var amp = "   + height     + ";\n" +
                "var decay = " + decay      + ";\n" +
                "var freq = "  + elasticity + ";\n" +
                "var t = time - inPoint;\n" +
                "var b = amp * Math.abs(Math.sin(Math.PI * freq * t)) * Math.pow(Math.E, -decay * t);\n" +
                "[value[0], value[1] - b]";

            for (i = 0; i < layers.length; i++) {
                try {
                    var positionProp = layers[i].property("Transform").property("Position");
                    positionProp.expression = expr;
                } catch (e) {
                    // Layer might not have a standard Position property — skip
                }
            }

            Astron.utils.endUndo();
            return { affected: layers.length };
        },

        // ─────────────────────────────────────────────────────────────────
        // applyWiggle(params)
        // params.frequency: number
        // params.amplitude: number
        // ─────────────────────────────────────────────────────────────────
        applyWiggle: function (params) {
            Astron.utils.beginUndo("Astron: Apply Wiggle");

            var frequency = (params.frequency !== undefined) ? params.frequency : 2;
            var amplitude = (params.amplitude !== undefined) ? params.amplitude : 20;
            var layers    = Astron.utils.getSelectedLayers();
            var i;

            var expr = "wiggle(" + frequency + ", " + amplitude + ")";

            for (i = 0; i < layers.length; i++) {
                try {
                    var positionProp = layers[i].property("Transform").property("Position");
                    positionProp.expression = expr;
                } catch (e) {
                    // Skip layers without a Position property
                }
            }

            Astron.utils.endUndo();
            return { affected: layers.length };
        },

        // ─────────────────────────────────────────────────────────────────
        // applyLoop(params)
        // params.type: 'cycle'|'pingpong'|'offset'
        // ─────────────────────────────────────────────────────────────────
        applyLoop: function (params) {
            Astron.utils.beginUndo("Astron: Apply Loop");

            var type   = params.type || "cycle";
            var layers = Astron.utils.getSelectedLayers();
            var i, j;

            var expr = "loopOut('" + type + "')";

            for (i = 0; i < layers.length; i++) {
                var layer          = layers[i];
                var keyframedProps = [];
                collectKeyframedProps(layer, keyframedProps);

                for (j = 0; j < keyframedProps.length; j++) {
                    try {
                        // Only apply loop expression if the property has ≥ 2 keyframes
                        // (loopOut requires at least 2 KFs to function)
                        if (keyframedProps[j].numKeys >= 2) {
                            keyframedProps[j].expression = expr;
                        }
                    } catch (e) {
                        // Some properties don't accept expressions — skip
                    }
                }
            }

            Astron.utils.endUndo();
            return { affected: layers.length };
        },

        // ─────────────────────────────────────────────────────────────────
        // copyEasing(params)
        // Copies temporal easing from the first keyframe of the first
        // keyframed property on the first selected layer.
        // ─────────────────────────────────────────────────────────────────
        copyEasing: function (params) {
            Astron.utils.beginUndo("Astron: Copy Easing");

            var layers = Astron.utils.getSelectedLayers();

            if (!layers || layers.length === 0) {
                Astron.utils.endUndo();
                return { copied: false, error: "No layers selected." };
            }

            var sourceProp     = null;
            var keyframedProps = [];
            collectKeyframedProps(layers[0], keyframedProps);

            var k;
            for (k = 0; k < keyframedProps.length; k++) {
                if (keyframedProps[k].numKeys > 1) {
                    sourceProp = keyframedProps[k];
                    break;
                }
            }

            if (!sourceProp) {
                Astron.utils.endUndo();
                return { copied: false, error: "No keyframed property with more than 1 keyframe found." };
            }

            try {
                // Read easing at keyframe index 1 (first keyframe, 1-based)
                var easeInArr  = sourceProp.keyInTemporalEase(1);
                var easeOutArr = sourceProp.keyOutTemporalEase(1);
                var easeIn     = easeInArr[0];
                var easeOut    = easeOutArr[0];

                var easingData = JSON.stringify({
                    easeIn:  { influence: easeIn.influence,  speed: easeIn.speed  },
                    easeOut: { influence: easeOut.influence, speed: easeOut.speed }
                });

                app.settings.saveSetting("Astron", "copiedEasing", easingData);
            } catch (e) {
                Astron.utils.endUndo();
                return { copied: false, error: "Failed to read temporal easing: " + e.toString() };
            }

            Astron.utils.endUndo();
            return { copied: true };
        },

        // ─────────────────────────────────────────────────────────────────
        // pasteEasing(params)
        // Reads stored easing from app.settings and applies to all
        // keyframes on all keyframed properties of selected layers.
        // ─────────────────────────────────────────────────────────────────
        pasteEasing: function (params) {
            Astron.utils.beginUndo("Astron: Paste Easing");

            var rawJson;
            try {
                rawJson = app.settings.getSetting("Astron", "copiedEasing");
            } catch (e) {
                Astron.utils.endUndo();
                return { pasted: false, error: "No copied easing found. Run copyEasing first." };
            }

            var easingData;
            try {
                easingData = JSON.parse(rawJson);
            } catch (e) {
                Astron.utils.endUndo();
                return { pasted: false, error: "Stored easing data is corrupted." };
            }

            var layers = Astron.utils.getSelectedLayers();
            var i, j, k;

            for (i = 0; i < layers.length; i++) {
                var keyframedProps = [];
                collectKeyframedProps(layers[i], keyframedProps);

                for (j = 0; j < keyframedProps.length; j++) {
                    var prop = keyframedProps[j];

                    // First set interpolation to EASY_EASE so temporal easing is applicable
                    try {
                        for (k = 1; k <= prop.numKeys; k++) {
                            prop.setInterpolationTypeAtKey(
                                k,
                                KeyframeInterpolationType.EASY_EASE,
                                KeyframeInterpolationType.EASY_EASE
                            );
                        }
                    } catch (e) {
                        // Continue even if interpolation type change fails
                    }

                    // Apply stored easing values to every keyframe
                    try {
                        var easeIn  = new KeyframeEase(
                            easingData.easeIn.speed,
                            easingData.easeIn.influence
                        );
                        var easeOut = new KeyframeEase(
                            easingData.easeOut.speed,
                            easingData.easeOut.influence
                        );

                        for (k = 1; k <= prop.numKeys; k++) {
                            prop.setTemporalEaseAtKey(k, [easeIn], [easeOut]);
                        }
                    } catch (e) {
                        // Some properties don't support temporal easing — skip silently
                    }
                }
            }

            Astron.utils.endUndo();
            return { pasted: true };
        }

    }; // end Astron.handlers.motion

}());
