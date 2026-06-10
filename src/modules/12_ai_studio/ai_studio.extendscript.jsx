(function () {
    var Astron = $.global.Astron || {};
    Astron.handlers = Astron.handlers || {};

    function countEffects(comp) {
        var count = 0;
        var i;
        var effects;
        for (i = 1; i <= comp.numLayers; i += 1) {
            effects = comp.layer(i).property("ADBE Effect Parade");
            if (effects) {
                count += effects.numProperties;
            }
        }
        return count;
    }

    function countMissingAssets() {
        var count = 0;
        var i;
        var item;
        for (i = 1; i <= app.project.numItems; i += 1) {
            item = app.project.item(i);
            if (item instanceof FootageItem && item.mainSource && item.mainSource.isMissing) {
                count += 1;
            }
        }
        return count;
    }

    function selectedLayerInfos(layers) {
        var infos = [];
        var i;
        for (i = 0; i < layers.length; i += 1) {
            infos.push(Astron.utils.layerInfo(layers[i]));
        }
        return infos;
    }

    function sourceBaseName(layer) {
        var name;
        if (layer instanceof AVLayer && layer.source && layer.source.file) {
            name = layer.source.file.name;
            return name.replace(/\.[^\.]+$/, "");
        }
        return null;
    }

    function smartNameForLayer(layer) {
        var sourceName = sourceBaseName(layer);
        if (layer.adjustmentLayer) {
            return "GRADE_" + layer.index;
        }
        if (layer.nullLayer) {
            return "CTRL_" + layer.index;
        }
        if (layer instanceof ShapeLayer) {
            return "SHAPE_" + layer.index;
        }
        if (layer instanceof TextLayer) {
            return "TEXT_" + layer.index;
        }
        if (sourceName) {
            return sourceName;
        }
        return "LAYER_" + layer.index;
    }

    Astron.handlers.ai_studio = {
        getProjectState: function (params) {
            Astron.utils.beginUndo("Astron Get Project State");
            var comp = Astron.utils.getActiveComp();
            var layers;
            var selectedLayers;
            var totalEffects;
            var missingAssets;

            try {
                layers = Astron.utils.requireSelectedLayers();
                selectedLayers = selectedLayerInfos(layers);
                totalEffects = countEffects(comp);
                missingAssets = countMissingAssets();
            } finally {
                Astron.utils.endUndo();
            }

            return {
                compName: comp.name,
                fps: comp.frameRate,
                duration: comp.duration,
                width: comp.width,
                height: comp.height,
                layerCount: comp.numLayers,
                selectedLayers: selectedLayers,
                totalEffects: totalEffects,
                missingAssets: missingAssets
            };
        },

        executeCommandSequence: function (params) {
            Astron.utils.beginUndo("Astron AI Execute Command Sequence");
            var commands = params && params.commands && params.commands.constructor === Array ? params.commands : [];
            var results = [];
            var i;

            try {
                for (i = 0; i < commands.length; i += 1) {
                    results.push(Astron.handle(Astron.utils.safeJSONStringify(commands[i])));
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { executed: commands.length, results: results };
        },

        smartRename: function (params) {
            Astron.utils.beginUndo("Astron Smart Rename");
            var layers = Astron.utils.requireSelectedLayers();
            var changes = [];
            var i;
            var oldName;
            var newName;

            try {
                for (i = 0; i < layers.length; i += 1) {
                    oldName = layers[i].name;
                    newName = smartNameForLayer(layers[i]);
                    layers[i].name = newName;
                    changes.push({ old: oldName, "new": newName });
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { renamed: layers.length, changes: changes };
        }
    };
}());
