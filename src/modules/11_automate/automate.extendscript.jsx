(function () {
    if (!Astron.handlers) {
        Astron.handlers = {};
    }

    function setLightIntensity(lightLayer, intensity) {
        var options = lightLayer.property("ADBE Light Options Group");
        var prop;
        if (options) {
            prop = options.property("ADBE Light Intensity");
            if (prop) {
                prop.setValue(intensity);
            }
        }
    }

    function createPointLight(comp, name, position, intensity) {
        var light = comp.layers.addLight(name, [comp.width / 2, comp.height / 2]);
        light.lightType = LightType.POINT;
        light.property("ADBE Transform Group").property("ADBE Position").setValue(position);
        setLightIntensity(light, intensity);
        return light;
    }

    Astron.handlers.automate = {
        createNull: function (params) {
            Astron.utils.beginUndo("Astron Create Null");
            var comp = Astron.utils.getActiveComp();
            var nullLayer;
            try {
                nullLayer = comp.layers.addNull();
                nullLayer.name = "Astron Null";
                nullLayer.transform.position.setValue([comp.width / 2, comp.height / 2]);
            } finally {
                Astron.utils.endUndo();
            }
            return { created: true, name: nullLayer.name };
        },

        createCamera: function (params) {
            Astron.utils.beginUndo("Astron Create Camera");
            var comp = Astron.utils.getActiveComp();
            var cam;
            try {
                cam = comp.layers.addCamera("Astron Camera", [comp.width / 2, comp.height / 2]);
            } finally {
                Astron.utils.endUndo();
            }
            return { created: true, name: cam.name };
        },

        create3PointLight: function (params) {
            Astron.utils.beginUndo("Astron Create 3 Point Light");
            var comp = Astron.utils.getActiveComp();
            try {
                createPointLight(comp, "Astron Key Light", [comp.width * 0.3, -comp.height * 0.3, -500], 100);
                createPointLight(comp, "Astron Fill Light", [-comp.width * 0.3, comp.height * 0.1, -300], 50);
                createPointLight(comp, "Astron Rim Light", [0, comp.height * 0.5, 300], 30);
            } finally {
                Astron.utils.endUndo();
            }
            return { created: 3 };
        },

        centerAnchorPoint: function (params) {
            Astron.utils.beginUndo("Astron Center Anchor Point");
            var layers = Astron.utils.requireSelectedLayers();
            var i;
            var layer;
            var source;
            var centered = 0;

            try {
                for (i = 0; i < layers.length; i += 1) {
                    layer = layers[i];
                    if (layer instanceof AVLayer && layer.source) {
                        source = layer.source;
                        layer.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([source.width / 2, source.height / 2]);
                        centered += 1;
                    }
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { centered: layers.length };
        },

        purgeMemory: function (params) {
            Astron.utils.beginUndo("Astron Purge Memory");
            try {
                app.purge(PurgeTarget.ALL_CACHES);
            } finally {
                Astron.utils.endUndo();
            }
            return { purged: true };
        },

        precompSelected: function (params) {
            Astron.utils.beginUndo("Astron Precomp Selected");
            var comp = Astron.utils.getActiveComp();
            var layers = Astron.utils.requireSelectedLayers();
            var indices = [];
            var name = params && params.name ? params.name : "Astron Precomp";
            var i;

            try {
                for (i = 0; i < layers.length; i += 1) {
                    indices.push(layers[i].index);
                }
                comp.layers.precompose(indices, name, true);
            } finally {
                Astron.utils.endUndo();
            }

            return { precomped: true, name: name };
        },

        executeCommandSequence: function (params) {
            Astron.utils.beginUndo("Astron Execute Command Sequence");
            var commands = params && params.commands && params.commands.constructor === Array ? params.commands : [];
            var i;

            try {
                for (i = 0; i < commands.length; i += 1) {
                    Astron.handle(JSON.stringify(commands[i]));
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { executed: commands.length };
        }
    };
}());
