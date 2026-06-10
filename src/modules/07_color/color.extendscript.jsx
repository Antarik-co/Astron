(function () {
    var Astron = $.global.Astron || {};
    Astron.handlers = Astron.handlers || {};

    function getAmount(params, fallback) {
        if (params && params.amount !== undefined && params.amount !== null) {
            return params.amount;
        }
        return fallback;
    }

    function addEffect(layer, matchName) {
        return layer.property("ADBE Effect Parade").addProperty(matchName);
    }

    function setFirstMatching(effect, names, value) {
        var i;
        var prop;
        for (i = 0; i < names.length; i += 1) {
            prop = effect.property(names[i]);
            if (prop) {
                prop.setValue(value);
                return true;
            }
        }
        return false;
    }

    function addHueSat(layer, saturation, hue) {
        var effect = addEffect(layer, "ADBE HUE SATURATION");
        if (saturation !== null) {
            setFirstMatching(effect, ["ADBE HUE SATURATION-0002", "Master Saturation"], saturation);
        }
        if (hue !== null) {
            setFirstMatching(effect, ["ADBE HUE SATURATION-0001", "Master Hue"], hue);
        }
        return effect;
    }

    function addBrightnessContrast(layer, brightness, contrast) {
        var effect = addEffect(layer, "ADBE Brightness & Contrast 2");
        if (brightness !== null) {
            setFirstMatching(effect, ["ADBE Brightness & Contrast 2-0001", "Brightness"], brightness);
        }
        if (contrast !== null) {
            setFirstMatching(effect, ["ADBE Brightness & Contrast 2-0002", "Contrast"], contrast);
        }
        return effect;
    }

    function addExposure(layer, exposure) {
        var effect = addEffect(layer, "ADBE Exposure2");
        setFirstMatching(effect, ["ADBE Exposure2-0001", "Exposure"], exposure);
        return effect;
    }

    function addCurves(layer, name) {
        var effect = addEffect(layer, "ADBE CurvesCustom");
        effect.name = name;
        return effect;
    }

    Astron.handlers.color = {
        applyGrade: function (params) {
            Astron.utils.beginUndo("Astron Apply Grade");
            var layers = Astron.utils.requireSelectedLayers();
            var preset = params && params.preset ? params.preset : "cinematic";
            var i;

            try {
                for (i = 0; i < layers.length; i += 1) {
                    if (preset === "cinematic") {
                        addCurves(layers[i], "Astron Cinematic Curves");
                        addHueSat(layers[i], -15, null);
                    } else if (preset === "film") {
                        addExposure(layers[i], 0.3);
                        addBrightnessContrast(layers[i], null, 10);
                    } else if (preset === "moody") {
                        addCurves(layers[i], "Astron Moody Curves");
                        addHueSat(layers[i], -25, null);
                    } else if (preset === "clean") {
                        addBrightnessContrast(layers[i], 5, 15);
                    } else if (preset === "warm") {
                        addHueSat(layers[i], null, 10);
                    } else if (preset === "cold") {
                        addHueSat(layers[i], null, -10);
                    } else if (preset === "social-pop") {
                        addHueSat(layers[i], 30, null);
                        addBrightnessContrast(layers[i], null, 20);
                    } else if (preset === "teal-orange") {
                        addHueSat(layers[i], -10, null);
                        addCurves(layers[i], "Astron Teal Orange Curves");
                    }
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { applied: layers.length, preset: preset };
        },

        quickSaturate: function (params) {
            Astron.utils.beginUndo("Astron Quick Saturate");
            var layers = Astron.utils.requireSelectedLayers();
            var amount = getAmount(params, 0);
            var i;

            try {
                for (i = 0; i < layers.length; i += 1) {
                    addHueSat(layers[i], amount, null);
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { adjusted: layers.length, amount: amount };
        },

        applyLUT: function (params) {
            Astron.utils.beginUndo("Astron Apply LUT");
            var layers = Astron.utils.requireSelectedLayers();
            var i;
            var effect;

            try {
                for (i = 0; i < layers.length; i += 1) {
                    effect = addEffect(layers[i], "ADBE Apply Color LUT 2");
                    effect.name = "Astron LUT - set file path manually";
                    effect.comment = "LUT: " + (params && params.lutName ? params.lutName : "") + ". Set LUT file path manually in effect controls.";
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { applied: layers.length, note: "Set LUT file path manually in effect controls" };
        },

        adjustTemperature: function (params) {
            Astron.utils.beginUndo("Astron Adjust Temperature");
            var layers = Astron.utils.requireSelectedLayers();
            var direction = params && params.direction ? params.direction : "warm";
            var amount = getAmount(params, 20);
            var hue = direction === "cool" ? -amount / 5 : amount / 5;
            var i;

            try {
                for (i = 0; i < layers.length; i += 1) {
                    addHueSat(layers[i], null, hue);
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { adjusted: layers.length };
        }
    };
}());
