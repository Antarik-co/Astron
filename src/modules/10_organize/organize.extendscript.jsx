(function () {
    if (!Astron.handlers) {
        Astron.handlers = {};
    }

    function isMissingFootage(item) {
        return item instanceof FootageItem && item.mainSource && item.mainSource.isMissing;
    }

    function countUnusedItems(activeComp) {
        var count = 0;
        var i;
        var item;
        for (i = 1; i <= app.project.numItems; i += 1) {
            item = app.project.item(i);
            if (item !== activeComp && item.useCount === 0) {
                count += 1;
            }
        }
        return count;
    }

    function countMissingAssets() {
        var count = 0;
        var i;
        for (i = 1; i <= app.project.numItems; i += 1) {
            if (isMissingFootage(app.project.item(i))) {
                count += 1;
            }
        }
        return count;
    }

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

    function layerIsAudioOnly(layer) {
        return layer.hasAudio && !layer.hasVideo;
    }

    function applyLayerLabel(layer) {
        if (layer.adjustmentLayer) {
            layer.label = 4;
        } else if (layer.nullLayer) {
            layer.label = 2;
        } else if (layer instanceof ShapeLayer) {
            layer.label = 8;
        } else if (layer instanceof TextLayer) {
            layer.label = 6;
        } else if (layer instanceof AVLayer && layer.source instanceof CompItem) {
            layer.label = 5;
        } else if (layerIsAudioOnly(layer)) {
            layer.label = 12;
        } else {
            layer.label = 1;
        }
    }

    Astron.handlers.organize = {
        cleanUnused: function (params) {
            Astron.utils.beginUndo("Astron Clean Unused");
            var activeComp = Astron.utils.getActiveComp();
            var removeItems = [];
            var i;
            var item;
            var count = 0;

            try {
                for (i = 1; i <= app.project.numItems; i += 1) {
                    item = app.project.item(i);
                    if (item !== activeComp && item.useCount === 0) {
                        removeItems.push(item);
                    }
                }
                for (i = 0; i < removeItems.length; i += 1) {
                    removeItems[i].remove();
                    count += 1;
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { removed: count };
        },

        findMissing: function (params) {
            Astron.utils.beginUndo("Astron Find Missing");
            var missing = [];
            var i;
            var item;

            try {
                for (i = 1; i <= app.project.numItems; i += 1) {
                    item = app.project.item(i);
                    if (isMissingFootage(item)) {
                        missing.push({ name: item.name, type: "footage" });
                    }
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { missing: missing, count: missing.length };
        },

        applyColorCodes: function (params) {
            Astron.utils.beginUndo("Astron Apply Color Codes");
            var comp = Astron.utils.getActiveComp();
            var i;

            try {
                for (i = 1; i <= comp.numLayers; i += 1) {
                    applyLayerLabel(comp.layer(i));
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { colored: comp.numLayers };
        },

        healthCheck: function (params) {
            Astron.utils.beginUndo("Astron Health Check");
            var comp = Astron.utils.getActiveComp();
            var unusedItems;
            var missingAssets;
            var totalLayers;
            var totalEffects;
            var score;
            var recommendations = [];
            var effectOverage;

            try {
                unusedItems = countUnusedItems(comp);
                missingAssets = countMissingAssets();
                totalLayers = comp.numLayers;
                totalEffects = countEffects(comp);
                effectOverage = totalEffects > 30 ? totalEffects - 30 : 0;
                score = 100;
                score -= Math.floor(unusedItems / 10) * 5;
                score -= missingAssets * 10;
                score -= Math.floor(effectOverage / 3);
                if (score < 0) {
                    score = 0;
                }
                if (unusedItems > 0) {
                    recommendations.push("Run cleanUnused to remove unused project items.");
                }
                if (missingAssets > 0) {
                    recommendations.push("Relink missing footage before rendering.");
                }
                if (totalEffects > 30) {
                    recommendations.push("Review heavy effect stacks and pre-render where useful.");
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { score: score, unusedItems: unusedItems, missingAssets: missingAssets, totalLayers: totalLayers, totalEffects: totalEffects, recommendations: recommendations };
        }
    };
}());
