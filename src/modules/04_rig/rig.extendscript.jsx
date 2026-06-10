// =============================================================================
// Astron — Module 04: RIG
// src/modules/04_rig/rig.extendscript.jsx
//
// Depends on: T011 (core.jsx — Astron global, Astron.utils)
// Registers:  Astron.handlers.rig
//
// Implements:
//   buildIK(params)
//   buildFK(params)
//   addRubberHose(params)
// =============================================================================

(function () {
    var Astron = $.global.Astron || {};
    Astron.utils = Astron.utils || {};
    Astron.handlers = Astron.handlers || {};

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Sort an array of layers ascending by their .index property (in-place).
     * ES3-safe bubble sort — Array.prototype.sort with a comparator is
     * technically ES3, but bubble sort avoids any engine quirks with
     * sort stability on short arrays.
     *
     * Lower index number = higher in the AE layer stack = the "root" of a chain.
     *
     * @param {Layer[]} arr
     * @returns {Layer[]}
     */
    function _sortByIndex(arr) {
        var len = arr.length;
        for (var i = 0; i < len - 1; i++) {
            for (var j = 0; j < len - 1 - i; j++) {
                if (arr[j].index > arr[j + 1].index) {
                    var tmp   = arr[j];
                    arr[j]    = arr[j + 1];
                    arr[j + 1] = tmp;
                }
            }
        }
        return arr;
    }

    /**
     * Return an array of .name strings from a layer array.
     * Replaces Array.prototype.map (not reliable in all AE ExtendScript hosts).
     *
     * @param {Layer[]} layers
     * @returns {string[]}
     */
    function _layerNames(layers) {
        var names = [];
        for (var i = 0; i < layers.length; i++) {
            names.push(layers[i].name);
        }
        return names;
    }

    /**
     * Escape a layer name for safe embedding inside an expression string.
     * Replaces backslashes then single-quotes.
     *
     * @param {string} name
     * @returns {string}
     */
    function _escapeLayerName(name) {
        return name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    }

    /**
     * Safely read the 2D/3D position value of a layer's transform.
     * Returns a two-element array [x, y] in all cases.
     *
     * @param {Layer} layer
     * @returns {number[]}
     */
    function _getLayerPosition(layer) {
        try {
            var pos = layer.transform.position.value;
            if (pos && pos.length >= 2) {
                return [pos[0], pos[1]];
            }
        } catch (e) { /* fall through */ }
        return [0, 0];
    }

    /**
     * Determine whether a layer has its threeDLayer flag enabled.
     *
     * @param {Layer} layer
     * @returns {boolean}
     */
    function _is3D(layer) {
        try {
            return layer.threeDLayer === true;
        } catch (e) {
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // Handler: buildIK
    // -------------------------------------------------------------------------

    /**
     * buildIK(params)
     *
     * Builds a simple 2-layer IK rig:
     *   1. Requires exactly 2 selected layers (upper limb, lower limb).
     *   2. Creates a Null controller positioned at the lower limb's current position.
     *   3. Parents the upper limb to the null (goal-driven).
     *   4. Adds a rotation expression to the lower limb that aims at the goal null.
     *
     * Expression uses atan2 to compute the angle from the upper limb's position
     * to the goal null's position, driving the lower limb's Z-rotation.
     *
     * Returns: { ik: true, goalLayer: string, upperLimb: string, lowerLimb: string }
     */
    function buildIK(params) {
        Astron.utils.beginUndo("Build IK");

        var result = { ik: false };

        try {
            var layers = Astron.utils.requireSelectedLayers();

            if (!layers || layers.length !== 2) {
                throw new Error(
                    "IK requires exactly 2 selected layers: upper limb and lower limb."
                );
            }

            var upperLimb = layers[0];
            var lowerLimb = layers[1];
            var comp      = Astron.utils.getActiveComp();

            // ------------------------------------------------------------------
            // 1. Create the IK Goal null
            // ------------------------------------------------------------------
            var nullLayer  = comp.layers.addNull();
            var nullName   = "IK_Goal_" + upperLimb.name;
            nullLayer.name = nullName;

            // Mirror 3D state of the limbs
            if (_is3D(upperLimb) || _is3D(lowerLimb)) {
                nullLayer.threeDLayer = true;
            }

            // Position null at lower limb's current world position
            var lowerPos = _getLayerPosition(lowerLimb);
            if (nullLayer.threeDLayer) {
                // In 3D mode position is [x, y, z]
                var lowerPos3D = [0, 0, 0];
                try {
                    var raw = lowerLimb.transform.position.value;
                    lowerPos3D = [raw[0] || 0, raw[1] || 0, raw[2] || 0];
                } catch (e3) { /* keep zeros */ }
                nullLayer.transform.position.setValue(lowerPos3D);
            } else {
                nullLayer.transform.position.setValue(lowerPos);
            }

            // Move the null to the top of the layer stack for organisation
            nullLayer.moveToBeginning();

            // ------------------------------------------------------------------
            // 2. Parent upper limb to the IK goal null
            // ------------------------------------------------------------------
            upperLimb.parent = nullLayer;

            // ------------------------------------------------------------------
            // 3. Add rotation expression to the lower limb
            //
            // The expression reads the goal null's position and the upper limb's
            // position, then drives this layer's Z rotation to "point" the limb
            // at the goal.  Written as a multi-line string using concatenation
            // (ES3 — no template literals).
            // ------------------------------------------------------------------
            var safeNull  = _escapeLayerName(nullName);
            var safeUpper = _escapeLayerName(upperLimb.name);
            var safeLower = _escapeLayerName(lowerLimb.name);

            var exprLines = [
                "var goal  = thisComp.layer('" + safeNull  + "').transform.position;",
                "var upper = thisComp.layer('" + safeUpper + "').transform.position;",
                "var lower = thisComp.layer('" + safeLower + "').transform.position;",
                "var dx    = goal[0] - upper[0];",
                "var dy    = goal[1] - upper[1];",
                "var angle = Math.atan2(dy, dx) * (180 / Math.PI);",
                "angle;"
            ];

            var expr = exprLines.join("\n");

            // Apply to the lower limb's Z Rotation property
            lowerLimb.transform.zRotation.expression = expr;

            // ------------------------------------------------------------------
            // 4. Build return value
            // ------------------------------------------------------------------
            result.ik        = true;
            result.goalLayer  = nullName;
            result.upperLimb  = upperLimb.name;
            result.lowerLimb  = lowerLimb.name;

        } catch (e) {
            result.error = e.message || String(e);
        }

        Astron.utils.endUndo();
        return result;
    }

    // -------------------------------------------------------------------------
    // Handler: buildFK
    // -------------------------------------------------------------------------

    /**
     * buildFK(params)
     *
     * Builds a sequential FK parent chain from the selected layers.
     *
     * Layers are sorted ascending by their AE layer index so that the topmost
     * layer in the stack (lowest index number, first in comp) becomes the chain
     * root.  Each subsequent layer is parented to the one before it.
     *
     * Requires at least 2 selected layers.
     *
     * Returns: { fk: true, chain: string[] }
     */
    function buildFK(params) {
        Astron.utils.beginUndo("Build FK");

        var result = { fk: false };

        try {
            var layers = Astron.utils.requireSelectedLayers();

            if (!layers || layers.length < 2) {
                throw new Error("FK chain requires at least 2 selected layers.");
            }

            // Sort layers by AE index (ascending = top of stack first = root)
            var sorted = _sortByIndex(layers.slice(0)); // non-destructive copy

            // Build parent chain: sorted[i] becomes child of sorted[i-1]
            for (var i = 1; i < sorted.length; i++) {
                sorted[i].parent = sorted[i - 1];
            }

            result.fk    = true;
            result.chain = _layerNames(sorted);

        } catch (e) {
            result.error = e.message || String(e);
        }

        Astron.utils.endUndo();
        return result;
    }

    // -------------------------------------------------------------------------
    // Handler: addRubberHose
    // -------------------------------------------------------------------------

    /**
     * addRubberHose(params)
     *
     * Creates a stretchy rubber-hose limb Shape Layer connecting two selected layers.
     *
     * Architecture:
     *   - A Shape Layer is created at the comp level.
     *   - A single Shape Group contains:
     *       • A Path (cubic bezier driven by an expression)
     *       • A Stroke (white, round cap/join)
     *       • A Fill  (no fill — stroke-only hose)
     *   - The path expression reads both endpoint layer positions each frame,
     *     computes a perpendicular bend offset proportional to the distance,
     *     and outputs a 4-vertex open cubic bezier (two tangent handles per end).
     *
     * The bend magnitude is 25% of the limb length, directed perpendicularly
     * to the limb vector.  This mimics the classic rubber-hose "always round"
     * look without requiring a third-party plugin.
     *
     * params.bendAmount {number}  — optional, 0–1 factor for bend intensity (default 0.25)
     * params.strokeWidth {number} — optional, stroke width in pixels (default 20)
     * params.strokeColor {number[]} — optional [r,g,b] 0-1 (default white)
     *
     * Returns: { hose: true, layer: string }
     */
    function addRubberHose(params) {
        Astron.utils.beginUndo("Rubber Hose");

        var result = { hose: false };

        try {
            var layers = Astron.utils.requireSelectedLayers();

            if (!layers || layers.length !== 2) {
                throw new Error(
                    "Rubber hose requires exactly 2 selected layers (start and end joints)."
                );
            }

            var startLayer = layers[0];
            var endLayer   = layers[1];
            var comp       = Astron.utils.getActiveComp();

            // ------------------------------------------------------------------
            // Optional params with defaults
            // ------------------------------------------------------------------
            var bendAmount  = (params && typeof params.bendAmount  === "number") ? params.bendAmount  : 0.25;
            var strokeWidth = (params && typeof params.strokeWidth === "number") ? params.strokeWidth : 20;
            var strokeColor = (params && params.strokeColor instanceof Array && params.strokeColor.length === 3)
                                ? params.strokeColor
                                : [1, 1, 1];  // white default

            // ------------------------------------------------------------------
            // 1. Create the shape layer
            // ------------------------------------------------------------------
            var shapeLayer  = comp.layers.addShape();
            var shapeName   = "Hose_" + startLayer.name + "_" + endLayer.name;
            shapeLayer.name = shapeName;

            // Position at comp centre (the expression drives visible geometry,
            // not the layer transform)
            shapeLayer.transform.position.setValue([comp.width / 2, comp.height / 2]);

            // Place the hose layer directly below the lower-indexed (top) joint layer
            var topIndex = Math.min(startLayer.index, endLayer.index);
            shapeLayer.moveAfter(comp.layer(topIndex));

            // ------------------------------------------------------------------
            // 2. Build the shape group contents
            //
            // ExtendScript shape layer property tree:
            //   shapeLayer
            //     .property("Contents")                    ← ShapeGroup container
            //       .addProperty("ADBE Vector Group")      ← adds a group
            //         .property("Contents")
            //           .addProperty("ADBE Vector Shape")  ← path
            //           .addProperty("ADBE Vector Graphic - Stroke")
            //           .addProperty("ADBE Vector Graphic - Fill")
            // ------------------------------------------------------------------
            var contents   = shapeLayer.property("Contents");
            var shapeGroup = contents.addProperty("ADBE Vector Group");
            shapeGroup.name = "Hose";

            var groupContents = shapeGroup.property("Contents");

            // ---- Path --------------------------------------------------------
            var pathProp = groupContents.addProperty("ADBE Vector Shape - Group");
            pathProp.name = "Hose Path";

            var pathShape = pathProp.property("ADBE Vector Shape");

            // Seed the path with a 4-vertex open bezier so AE knows the shape type
            // before the expression takes over.
            var startPos = _getLayerPosition(startLayer);
            var endPos   = _getLayerPosition(endLayer);
            var midX     = (startPos[0] + endPos[0]) / 2;
            var midY     = (startPos[1] + endPos[1]) / 2;

            var seedShape = new Shape();
            seedShape.closed   = false;
            seedShape.vertices = [
                [startPos[0] - comp.width / 2,  startPos[1] - comp.height / 2],
                [midX        - comp.width / 2,  midY        - comp.height / 2],
                [midX        - comp.width / 2,  midY        - comp.height / 2],
                [endPos[0]   - comp.width / 2,  endPos[1]   - comp.height / 2]
            ];
            // Flat tangents for the seed; the expression drives the real shape.
            seedShape.inTangents  = [[0, 0], [0, 0], [0, 0], [0, 0]];
            seedShape.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
            pathShape.setValue(seedShape);

            // ---- Rubber Hose path expression ---------------------------------
            //
            // The expression runs at each frame:
            //   1. Reads world positions of start/end layers, converts to layer space.
            //   2. Computes perpendicular offset = bendAmount * limb length.
            //   3. Outputs a cubic bezier: start → ctrl1 → ctrl2 → end,
            //      with handles that produce a smooth, rounded hose shape.
            //
            // All lines concatenated with "\n" — ES3 safe.
            // ------------------------------------------------------------------
            var safeStart = _escapeLayerName(startLayer.name);
            var safeEnd   = _escapeLayerName(endLayer.name);
            var bendStr   = String(bendAmount);

            var exprParts = [
                "// Rubber Hose path expression — Astron Module 04",
                "var compW   = thisComp.width;",
                "var compH   = thisComp.height;",
                "",
                "// World positions of the two joint layers",
                "var pA = thisComp.layer('" + safeStart + "').toComp([0,0,0]);",
                "var pB = thisComp.layer('" + safeEnd   + "').toComp([0,0,0]);",
                "",
                "// Convert world → shape-layer-local space",
                "// The shape layer sits at comp centre, so subtract half comp size.",
                "var lA = [pA[0] - compW/2, pA[1] - compH/2];",
                "var lB = [pB[0] - compW/2, pB[1] - compH/2];",
                "",
                "// Limb vector and length",
                "var dx  = lB[0] - lA[0];",
                "var dy  = lB[1] - lA[1];",
                "var len = Math.sqrt(dx*dx + dy*dy);",
                "",
                "// Perpendicular unit vector (rotated 90 degrees clockwise)",
                "var px = 0;",
                "var py = 0;",
                "if (len > 0.001) {",
                "    px =  dy / len;",
                "    py = -dx / len;",
                "}",
                "",
                "// Bend offset magnitude — scales with limb length",
                "var bendFactor = " + bendStr + ";",
                "var bx = px * len * bendFactor;",
                "var by = py * len * bendFactor;",
                "",
                "// Mid-point displaced perpendicularly",
                "var midX = (lA[0] + lB[0]) / 2 + bx;",
                "var midY = (lA[1] + lB[1]) / 2 + by;",
                "",
                "// Tangent handle length: ~40% of half the limb length",
                "var hLen = len * 0.4;",
                "var hx   = (dx / (len > 0.001 ? len : 1)) * hLen;",
                "var hy   = (dy / (len > 0.001 ? len : 1)) * hLen;",
                "",
                "// Build the 4-vertex cubic bezier path",
                "// Vertices:  [start, ctrl1, ctrl2, end]",
                "// (ctrl1 and ctrl2 are phantom anchor vertices; real bend is in tangents)",
                "var verts = [",
                "    [lA[0],  lA[1]],",
                "    [midX,   midY],",
                "    [midX,   midY],",
                "    [lB[0],  lB[1]]",
                "];",
                "",
                "// Tangent handles: nudge start/end outward, pinch mid inward",
                "var inTan  = [[ 0,   0], [-hx, -hy], [ hx,  hy], [ 0,  0]];",
                "var outTan = [[ hx,  hy], [-hx, -hy], [ hx,  hy], [-hx, -hy]];",
                "",
                "createPath(verts, inTan, outTan, false);"
            ];

            var hoseExpr = exprParts.join("\n");
            pathShape.expression = hoseExpr;

            // ---- Stroke ------------------------------------------------------
            var stroke = groupContents.addProperty("ADBE Vector Graphic - Stroke");
            stroke.property("ADBE Vector Stroke Color").setValue(strokeColor);
            stroke.property("ADBE Vector Stroke Width").setValue(strokeWidth);

            // Round caps and joins for the classic rubber-hose look
            // Line Cap:  1=Butt, 2=Round, 3=Projecting
            // Line Join: 1=Miter, 2=Round, 3=Bevel
            stroke.property("ADBE Vector Stroke Line Cap").setValue(2);
            stroke.property("ADBE Vector Stroke Line Join").setValue(2);

            // ---- Fill --------------------------------------------------------
            // Transparent fill — hose is stroke-only by default.
            // A fill property is still added so users can enable it from the UI.
            var fill = groupContents.addProperty("ADBE Vector Graphic - Fill");
            fill.property("ADBE Vector Fill Color").setValue([1, 1, 1]);
            // Opacity 0 = off; accessible in the panel for the user to enable
            fill.property("ADBE Vector Fill Opacity").setValue(0);

            // ------------------------------------------------------------------
            // 3. Return result
            // ------------------------------------------------------------------
            result.hose  = true;
            result.layer = shapeName;

        } catch (e) {
            result.error = e.message || String(e);
        }

        Astron.utils.endUndo();
        return result;
    }

    // -------------------------------------------------------------------------
    // Register handlers
    // -------------------------------------------------------------------------
    Astron.handlers.rig = {
        buildIK:       buildIK,
        buildFK:       buildFK,
        addRubberHose: addRubberHose
    };

}());
