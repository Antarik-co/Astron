(function () {
    // ─────────────────────────────────────────────────────────────────────────
    // Astron — MODULE 02: TIMELINE
    // timeline.extendscript.jsx
    // ExtendScript ES3 — no const/let, no arrow functions, no template literals
    // Frame-accurate: all time operations use comp.frameDuration
    // Depends on: Astron global (core.jsx)
    // ─────────────────────────────────────────────────────────────────────────

    // ── Internal helper: deselect every layer in a comp
    function deselectAll(comp) {
        var i;
        for (i = 1; i <= comp.numLayers; i++) {
            comp.layer(i).selected = false;
        }
    }

    // ── Internal helper: snap a time value to the nearest frame boundary
    // Prevents sub-frame drift on repeated shift operations.
    function snapToFrame(time, frameDuration) {
        return Math.round(time / frameDuration) * frameDuration;
    }

    // ── Internal helper: build a two-digit zero-padded counter string
    function padTwo(n) {
        return n < 10 ? "0" + n : "" + n;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Register module handlers
    // ─────────────────────────────────────────────────────────────────────────
    Astron.handlers.timeline = {

        // ─────────────────────────────────────────────────────────────────
        // selectAfterCursor(params)
        // Selects all layers whose inPoint >= comp.time
        // ─────────────────────────────────────────────────────────────────
        selectAfterCursor: function (params) {
            Astron.utils.beginUndo("Astron: Select After Cursor");

            var comp        = Astron.utils.getActiveComp();
            var currentTime = comp.time;
            var count       = 0;
            var i, layer;

            deselectAll(comp);

            for (i = 1; i <= comp.numLayers; i++) {
                layer = comp.layer(i);
                if (layer.inPoint >= currentTime) {
                    layer.selected = true;
                    count++;
                }
            }

            Astron.utils.endUndo();
            return { selected: count, cursor: currentTime };
        },

        // ─────────────────────────────────────────────────────────────────
        // selectBeforeCursor(params)
        // Selects all layers whose outPoint <= comp.time
        // ─────────────────────────────────────────────────────────────────
        selectBeforeCursor: function (params) {
            Astron.utils.beginUndo("Astron: Select Before Cursor");

            var comp        = Astron.utils.getActiveComp();
            var currentTime = comp.time;
            var count       = 0;
            var i, layer;

            deselectAll(comp);

            for (i = 1; i <= comp.numLayers; i++) {
                layer = comp.layer(i);
                if (layer.outPoint <= currentTime) {
                    layer.selected = true;
                    count++;
                }
            }

            Astron.utils.endUndo();
            return { selected: count };
        },

        // ─────────────────────────────────────────────────────────────────
        // selectCrossing(params)
        // Selects layers that span (are active at) the current time
        // ─────────────────────────────────────────────────────────────────
        selectCrossing: function (params) {
            Astron.utils.beginUndo("Astron: Select Crossing Cursor");

            var comp        = Astron.utils.getActiveComp();
            var currentTime = comp.time;
            var count       = 0;
            var i, layer;

            deselectAll(comp);

            for (i = 1; i <= comp.numLayers; i++) {
                layer = comp.layer(i);
                if (layer.inPoint <= currentTime && layer.outPoint >= currentTime) {
                    layer.selected = true;
                    count++;
                }
            }

            Astron.utils.endUndo();
            return { selected: count };
        },

        selectStartingAfterCursor: function (params) {
            Astron.utils.beginUndo("Astron: Select Starting After Cursor");

            var comp        = Astron.utils.getActiveComp();
            var currentTime = comp.time;
            var count       = 0;
            var i, layer;

            deselectAll(comp);

            for (i = 1; i <= comp.numLayers; i++) {
                layer = comp.layer(i);
                if (!layer.locked && layer.startTime >= currentTime) {
                    layer.selected = true;
                    count++;
                }
            }

            Astron.utils.endUndo();
            return { selected: count, cursor: currentTime };
        },

        // ─────────────────────────────────────────────────────────────────
        // selectByType(params)
        // params.layerType: 'adj'|'null'|'audio'|'shape'|'shy'|'guide'|'precomp'
        // ─────────────────────────────────────────────────────────────────
        selectByType: function (params) {
            Astron.utils.beginUndo("Astron: Select By Type");

            var comp      = Astron.utils.getActiveComp();
            var layerType = params.layerType || "";
            var count     = 0;
            var i, layer, match;

            // Deselect all unlocked layers only
            for (i = 1; i <= comp.numLayers; i++) {
                layer = comp.layer(i);
                if (!layer.locked) {
                    layer.selected = false;
                }
            }

            for (i = 1; i <= comp.numLayers; i++) {
                layer = comp.layer(i);
                if (layer.locked) { continue; }

                match = false;

                if (layerType === "adj") {
                    match = (layer instanceof AVLayer) && (layer.adjustmentLayer === true);

                } else if (layerType === "null") {
                    match = (layer instanceof AVLayer) && (layer.nullLayer === true);

                } else if (layerType === "audio") {
                    match = (layer instanceof AVLayer) &&
                            (layer.hasVideo === false) &&
                            (layer.hasAudio === true);

                } else if (layerType === "shape") {
                    match = (layer instanceof ShapeLayer);

                } else if (layerType === "shy") {
                    match = (layer.shy === true);

                } else if (layerType === "guide") {
                    match = (layer.guideLayer === true);

                } else if (layerType === "precomp") {
                    match = (layer instanceof AVLayer) &&
                            (layer.source instanceof CompItem);
                }

                if (match) {
                    layer.selected = true;
                    count++;
                }
            }

            Astron.utils.endUndo();
            return { selected: count, type: layerType };
        },

        // ─────────────────────────────────────────────────────────────────
        // invertSelection(params)
        // Flips selected state of every unlocked layer
        // ─────────────────────────────────────────────────────────────────
        invertSelection: function (params) {
            Astron.utils.beginUndo("Astron: Invert Selection");

            var comp = Astron.utils.getActiveComp();
            var i, layer;

            for (i = 1; i <= comp.numLayers; i++) {
                layer = comp.layer(i);
                if (!layer.locked) {
                    layer.selected = !layer.selected;
                }
            }

            Astron.utils.endUndo();
            return { affected: comp.numLayers };
        },

        // ─────────────────────────────────────────────────────────────────
        // shiftFrames(params)
        // params.frames: positive or negative integer
        // Frame-accurate: offset is snapped to frameDuration grid
        // ─────────────────────────────────────────────────────────────────
        shiftFrames: function (params) {
            Astron.utils.beginUndo("Astron: Shift Frames");

            var comp     = Astron.utils.getActiveComp();
            var frames   = params.frames || 0;
            var shift    = snapToFrame(frames * comp.frameDuration, comp.frameDuration);
            var count    = 0;
            var i, layer;

            for (i = 1; i <= comp.numLayers; i++) {
                layer = comp.layer(i);
                if (layer.selected && !layer.locked) {
                    layer.startTime = snapToFrame(layer.startTime + shift, comp.frameDuration);
                    count++;
                }
            }

            Astron.utils.endUndo();
            return { shifted: count, frames: frames };
        },

        // ─────────────────────────────────────────────────────────────────
        // snapToCurrentTime(params)
        // params.mode: 'earliest-start'|'latest-start'|
        //              'earliest-end'|'latest-end'|'closest'
        // params.ripple: boolean
        // params.preserveGaps: boolean (reserved — handled by using single offset)
        // ─────────────────────────────────────────────────────────────────
        snapToCurrentTime: function (params) {
            Astron.utils.beginUndo("Astron: Snap To Current Time");

            var comp        = Astron.utils.getActiveComp();
            var layers      = Astron.utils.requireSelectedLayers();
            var currentTime = comp.time;
            var mode        = params.mode    || "closest";
            var ripple      = params.ripple  || false;
            var i, layer, offset;

            // ── Determine reference time from selected layers based on mode ──
            if (mode === "earliest-start") {
                var minIn = layers[0].inPoint;
                for (i = 1; i < layers.length; i++) {
                    if (layers[i].inPoint < minIn) { minIn = layers[i].inPoint; }
                }
                offset = currentTime - minIn;

            } else if (mode === "latest-start") {
                var maxIn = layers[0].inPoint;
                for (i = 1; i < layers.length; i++) {
                    if (layers[i].inPoint > maxIn) { maxIn = layers[i].inPoint; }
                }
                offset = currentTime - maxIn;

            } else if (mode === "earliest-end") {
                var minOut = layers[0].outPoint;
                for (i = 1; i < layers.length; i++) {
                    if (layers[i].outPoint < minOut) { minOut = layers[i].outPoint; }
                }
                offset = currentTime - minOut;

            } else if (mode === "latest-end") {
                var maxOut = layers[0].outPoint;
                for (i = 1; i < layers.length; i++) {
                    if (layers[i].outPoint > maxOut) { maxOut = layers[i].outPoint; }
                }
                offset = currentTime - maxOut;

            } else {
                // 'closest' — compare earliest inPoint distance vs latest outPoint distance
                var closestIn  = layers[0].inPoint;
                var closestOut = layers[0].outPoint;
                for (i = 1; i < layers.length; i++) {
                    if (layers[i].inPoint  < closestIn)  { closestIn  = layers[i].inPoint;  }
                    if (layers[i].outPoint > closestOut) { closestOut = layers[i].outPoint; }
                }
                var distIn  = Math.abs(currentTime - closestIn);
                var distOut = Math.abs(currentTime - closestOut);
                if (distIn <= distOut) {
                    offset = currentTime - closestIn;
                } else {
                    offset = currentTime - closestOut;
                }
            }

            // Snap offset to frame grid
            offset = snapToFrame(offset, comp.frameDuration);

            // ── Move all selected layers by offset ──
            for (i = 0; i < layers.length; i++) {
                if (!layers[i].locked) {
                    layers[i].startTime = snapToFrame(layers[i].startTime + offset, comp.frameDuration);
                }
            }

            // ── Ripple: move all downstream unselected layers by the same offset ──
            if (ripple) {
                // Reference point is the original cursor position minus offset
                // i.e. we ripple layers that start at or after the pre-snap cursor
                var rippleThreshold = currentTime - offset;
                for (i = 1; i <= comp.numLayers; i++) {
                    layer = comp.layer(i);
                    if (!layer.selected && !layer.locked) {
                        if (layer.inPoint >= rippleThreshold) {
                            layer.startTime = snapToFrame(layer.startTime + offset, comp.frameDuration);
                        }
                    }
                }
            }

            Astron.utils.endUndo();
            return { snapped: layers.length, mode: mode, offset: offset };
        },

        // ─────────────────────────────────────────────────────────────────
        // bulkRename(params)
        // params.pattern: string — supports '##' (counter) and '*' (original name)
        // ─────────────────────────────────────────────────────────────────
        bulkRename: function (params) {
            Astron.utils.beginUndo("Astron: Bulk Rename");

            var layers  = Astron.utils.requireSelectedLayers();
            var pattern = params.pattern || "Layer_##";
            var i, layer, originalName, newName;

            for (i = 0; i < layers.length; i++) {
                layer        = layers[i];
                originalName = layer.name;
                newName      = pattern;

                // Replace '##' with zero-padded counter (1-based)
                newName = newName.replace("##", padTwo(i + 1));

                // Replace '*' with the layer's original name
                newName = newName.replace("*", originalName);

                layer.name = newName;
            }

            Astron.utils.endUndo();
            return { renamed: layers.length, pattern: pattern };
        },

        // ─────────────────────────────────────────────────────────────────
        // sortTimeline(params)
        // params.by: 'name'|'in'|'out'|'duration'
        // Reorders all layers in the comp by moving them to their sorted
        // positions using moveToBeginning() and moveBefore().
        // ─────────────────────────────────────────────────────────────────
        sortTimeline: function (params) {
            Astron.utils.beginUndo("Astron: Sort Timeline");

            var comp = Astron.utils.getActiveComp();
            var by   = params.by || "in";
            var i, j, layer;

            // ── Snapshot current layers into a plain array (1-based → 0-based) ──
            var layerSnapshots = [];
            for (i = 1; i <= comp.numLayers; i++) {
                layer = comp.layer(i);
                layerSnapshots.push({
                    name:     layer.name,
                    inPoint:  layer.inPoint,
                    outPoint: layer.outPoint,
                    duration: layer.outPoint - layer.inPoint,
                    index:    i
                });
            }

            // ── Sort the snapshot array ──
            layerSnapshots.sort(function (a, b) {
                if (by === "name") {
                    // Case-insensitive alphabetical
                    var na = a.name.toLowerCase();
                    var nb = b.name.toLowerCase();
                    if (na < nb) { return -1; }
                    if (na > nb) { return  1; }
                    return 0;
                } else if (by === "in") {
                    return a.inPoint - b.inPoint;
                } else if (by === "out") {
                    return a.outPoint - b.outPoint;
                } else if (by === "duration") {
                    return a.duration - b.duration;
                }
                return 0;
            });

            // ── Reorder layers in AE to match sorted order ──
            // Strategy: move each layer to its target position from top to bottom.
            // AE layer indices shift as layers move, so we re-fetch by original index.
            //
            // To avoid index chasing, we use names to find each layer after moves.
            // We move from position 1 downward: pick the layer that should be at
            // position i, move it above whatever is currently at position i.

            for (i = 0; i < layerSnapshots.length; i++) {
                var targetName  = layerSnapshots[i].name;
                var targetIndex = layerSnapshots[i].index;

                // Find the layer in the CURRENT state of the comp that matches
                // our target (match by original stored index — reliable before it moves)
                // After it has moved once, update its tracked index.
                var foundLayer = null;
                for (j = 1; j <= comp.numLayers; j++) {
                    var candidate = comp.layer(j);
                    // Match by both name and original index to handle duplicate names
                    if (candidate.name === targetName && layerSnapshots[i].index === targetIndex) {
                        foundLayer = candidate;
                        break;
                    }
                }

                if (!foundLayer) {
                    // Fallback: find by name only (handles edge-case of pre-moved layers)
                    for (j = 1; j <= comp.numLayers; j++) {
                        if (comp.layer(j).name === targetName) {
                            foundLayer = comp.layer(j);
                            break;
                        }
                    }
                }

                if (foundLayer) {
                    var currentPos = foundLayer.index;
                    var wantedPos  = i + 1; // 1-based target position

                    if (currentPos !== wantedPos) {
                        if (wantedPos === 1) {
                            foundLayer.moveToBeginning();
                        } else {
                            // moveBefore(layer) places foundLayer directly above the reference
                            var referenceLayer = comp.layer(wantedPos);
                            if (referenceLayer && referenceLayer !== foundLayer) {
                                foundLayer.moveBefore(referenceLayer);
                            }
                        }
                    }

                    // Update tracked index to the new current position
                    layerSnapshots[i].index = foundLayer.index;
                }
            }

            Astron.utils.endUndo();
            return { sorted: comp.numLayers, by: by };
        }

    }; // end Astron.handlers.timeline

}());
