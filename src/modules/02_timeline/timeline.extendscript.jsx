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

    function hasFileExtension(layer, pattern) {
        var src, mainSource, fileName;
        if (!(layer instanceof AVLayer)) { return false; }
        src = layer.source;
        if (!src) { return false; }
        mainSource = src.mainSource;
        if (!(mainSource instanceof FileSource)) { return false; }
        if (!mainSource.file) { return false; }
        fileName = mainSource.file.fsName || mainSource.file.name || "";
        return pattern.test(fileName);
    }

    function isVideoFootage(layer) {
        var src;
        if (!(layer instanceof AVLayer)) { return false; }
        if (layer.adjustmentLayer || layer.nullLayer) { return false; }
        if (!layer.hasVideo) { return false; }
        if (!layer.source) { return false; }
        src = layer.source;
        if (!(src instanceof FootageItem)) { return false; }
        if (src.mainSource instanceof SolidSource) { return false; }
        return true;
    }

    function getLayerSnapPoint(snapshot, mode, cursorTime) {
        var distIn, distOut;
        if (mode === "earliest-end" || mode === "latest-end") {
            return snapshot.op;
        }
        if (mode === "closest" || mode === "closest-edge") {
            distIn = Math.abs(snapshot.ip - cursorTime);
            distOut = Math.abs(snapshot.op - cursorTime);
            return distIn <= distOut ? snapshot.ip : snapshot.op;
        }
        return snapshot.ip;
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
                if (!layer.locked && layer.inPoint >= currentTime) {
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
                if (!layer.locked && layer.outPoint <= currentTime) {
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
                if (!layer.locked && layer.inPoint <= currentTime && layer.outPoint >= currentTime) {
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
        // params.layerType: 'adj'|'null'|'video'|'audio'|'shape'|'shy'|'guide'|'psd'|'ai'|'precomp'|'comp'
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

                } else if (layerType === "video") {
                    match = isVideoFootage(layer);

                } else if (layerType === "shape") {
                    match = (layer instanceof ShapeLayer);

                } else if (layerType === "shy") {
                    match = (layer.shy === true);

                } else if (layerType === "guide") {
                    match = (layer.guideLayer === true);

                } else if (layerType === "precomp") {
                    match = (layer instanceof AVLayer) &&
                            (layer.source instanceof CompItem);

                } else if (layerType === "comp") {
                    match = (layer instanceof AVLayer) &&
                            (layer.source instanceof CompItem);

                } else if (layerType === "psd") {
                    match = hasFileExtension(layer, /\.psd$/i);

                } else if (layerType === "ai") {
                    match = hasFileExtension(layer, /\.ai$/i);
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
            var rawLayers   = Astron.utils.requireSelectedLayers();
            var currentTime = snapToFrame(comp.time, comp.frameDuration);
            var mode        = params.mode    || "closest";
            var ripple      = params.ripple  || false;
            var preserveGaps = (typeof params.preserveGaps === "boolean") ? params.preserveGaps : true;
            var layers      = [];
            var i, layer, offset, anchor, point, snapshot;

            if (mode === "start_earliest") { mode = "earliest-start"; }
            if (mode === "start_latest") { mode = "latest-start"; }
            if (mode === "end_earliest") { mode = "earliest-end"; }
            if (mode === "end_latest") { mode = "latest-end"; }
            if (mode === "closest_edge") { mode = "closest"; }

            for (i = 0; i < rawLayers.length; i++) {
                layer = rawLayers[i];
                if (!layer.locked) {
                    layers.push({
                        ref: layer,
                        st: layer.startTime,
                        ip: layer.inPoint,
                        op: layer.outPoint
                    });
                }
            }

            if (layers.length === 0) {
                Astron.utils.endUndo();
                return { snapped: 0, mode: mode, error: "All selected layers are locked" };
            }

            if (!preserveGaps) {
                for (i = 0; i < layers.length; i++) {
                    snapshot = layers[i];
                    point = getLayerSnapPoint(snapshot, mode, currentTime);
                    offset = snapToFrame(currentTime - point, comp.frameDuration);
                    snapshot.ref.startTime = snapToFrame(snapshot.st + offset, comp.frameDuration);
                }

                Astron.utils.endUndo();
                return { snapped: layers.length, mode: mode, preserveGaps: false };
            }

            // ── Determine reference time from selected layers based on mode ──
            if (mode === "earliest-start") {
                var minIn = layers[0].ip;
                for (i = 1; i < layers.length; i++) {
                    if (layers[i].ip < minIn) { minIn = layers[i].ip; }
                }
                anchor = minIn;
                offset = currentTime - anchor;

            } else if (mode === "latest-start") {
                var maxIn = layers[0].ip;
                for (i = 1; i < layers.length; i++) {
                    if (layers[i].ip > maxIn) { maxIn = layers[i].ip; }
                }
                anchor = maxIn;
                offset = currentTime - anchor;

            } else if (mode === "earliest-end") {
                var minOut = layers[0].op;
                for (i = 1; i < layers.length; i++) {
                    if (layers[i].op < minOut) { minOut = layers[i].op; }
                }
                anchor = minOut;
                offset = currentTime - anchor;

            } else if (mode === "latest-end") {
                var maxOut = layers[0].op;
                for (i = 1; i < layers.length; i++) {
                    if (layers[i].op > maxOut) { maxOut = layers[i].op; }
                }
                anchor = maxOut;
                offset = currentTime - anchor;

            } else {
                // 'closest' — compare earliest inPoint distance vs latest outPoint distance
                var closestIn  = layers[0].ip;
                var closestOut = layers[0].op;
                for (i = 1; i < layers.length; i++) {
                    if (layers[i].ip < closestIn) { closestIn = layers[i].ip; }
                    if (layers[i].op > closestOut) { closestOut = layers[i].op; }
                }
                var distIn  = Math.abs(currentTime - closestIn);
                var distOut = Math.abs(currentTime - closestOut);
                if (distIn <= distOut) {
                    anchor = closestIn;
                    offset = currentTime - anchor;
                } else {
                    anchor = closestOut;
                    offset = currentTime - anchor;
                }
            }

            // Snap offset to frame grid
            offset = snapToFrame(offset, comp.frameDuration);

            // ── Move all selected layers by offset ──
            for (i = 0; i < layers.length; i++) {
                layers[i].ref.startTime = snapToFrame(layers[i].st + offset, comp.frameDuration);
            }

            // ── Ripple: move all downstream unselected layers by the same offset ──
            if (ripple) {
                for (i = 1; i <= comp.numLayers; i++) {
                    layer = comp.layer(i);
                    if (!layer.selected && !layer.locked) {
                        if (layer.inPoint >= anchor) {
                            layer.startTime = snapToFrame(layer.startTime + offset, comp.frameDuration);
                        }
                    }
                }
            }

            Astron.utils.endUndo();
            return { snapped: layers.length, mode: mode, offset: offset, preserveGaps: true, ripple: ripple };
        },

        // ─────────────────────────────────────────────────────────────────
        snapToPrevLayer: function (params) {
            Astron.utils.beginUndo("Astron: Snap To Previous Layer");

            var comp = Astron.utils.getActiveComp();
            var rawLayers = Astron.utils.requireSelectedLayers();
            var layers = [];
            var minIn, prevEnd, snapTo, offset;
            var i, layer;

            for (i = 0; i < rawLayers.length; i++) {
                layer = rawLayers[i];
                if (!layer.locked) {
                    layers.push({
                        ref: layer,
                        st: layer.startTime,
                        ip: layer.inPoint
                    });
                }
            }

            if (layers.length === 0) {
                Astron.utils.endUndo();
                return { snapped: 0, error: "All selected layers are locked" };
            }

            minIn = layers[0].ip;
            for (i = 1; i < layers.length; i++) {
                if (layers[i].ip < minIn) { minIn = layers[i].ip; }
            }

            prevEnd = -1;
            for (i = 1; i <= comp.numLayers; i++) {
                layer = comp.layer(i);
                if (!layer.selected && !layer.locked && layer.outPoint <= minIn + comp.frameDuration * 0.5) {
                    if (layer.outPoint > prevEnd) {
                        prevEnd = layer.outPoint;
                    }
                }
            }

            if (prevEnd < 0) {
                Astron.utils.endUndo();
                return { snapped: 0, error: "No previous layer found before the selection." };
            }

            snapTo = snapToFrame(prevEnd, comp.frameDuration);
            offset = snapToFrame(snapTo - minIn, comp.frameDuration);
            for (i = 0; i < layers.length; i++) {
                layers[i].ref.startTime = snapToFrame(layers[i].st + offset, comp.frameDuration);
            }

            Astron.utils.endUndo();
            return { snapped: layers.length, offset: offset };
        },

        fillGaps: function (params) {
            Astron.utils.beginUndo("Astron: Fill Gaps");

            var comp = Astron.utils.getActiveComp();
            var selected = Astron.utils.getSelectedLayers();
            var layers = [];
            var moved = 0;
            var i, layer, prev, curr, gap, offset;

            if (selected && selected.length > 1) {
                for (i = 0; i < selected.length; i++) {
                    if (!selected[i].locked) {
                        layers.push(selected[i]);
                    }
                }
            } else {
                for (i = 1; i <= comp.numLayers; i++) {
                    layer = comp.layer(i);
                    if (!layer.locked) {
                        layers.push(layer);
                    }
                }
            }

            if (layers.length < 2) {
                Astron.utils.endUndo();
                return { filled: 0, error: "Need at least two unlocked layers to fill gaps." };
            }

            layers.sort(function (a, b) {
                return a.inPoint - b.inPoint;
            });

            for (i = 1; i < layers.length; i++) {
                prev = layers[i - 1];
                curr = layers[i];
                gap = curr.inPoint - prev.outPoint;
                if (gap > comp.frameDuration * 0.5) {
                    offset = snapToFrame(prev.outPoint - curr.inPoint, comp.frameDuration);
                    curr.startTime = snapToFrame(curr.startTime + offset, comp.frameDuration);
                    moved++;
                }
            }

            Astron.utils.endUndo();
            return { filled: moved, processed: layers.length };
        },

        getStatus: function (params) {
            var comp = Astron.utils.getActiveComp();
            var fd = comp.frameDuration;
            var fps = 1 / fd;
            var t = comp.time;
            var hh = Math.floor(t / 3600);
            var mm = Math.floor((t % 3600) / 60);
            var ss = Math.floor(t % 60);
            var ff = Math.round((t - Math.floor(t)) * fps);

            if (ff >= Math.round(fps)) {
                ff = 0;
                ss++;
            }

            return {
                compName: comp.name,
                time: padTwo(hh) + ":" + padTwo(mm) + ":" + padTwo(ss) + ":" + padTwo(ff),
                frame: Math.floor(t / fd),
                layers: comp.numLayers,
                selected: comp.selectedLayers.length,
                fps: Math.round(fps * 100) / 100
            };
        },

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
