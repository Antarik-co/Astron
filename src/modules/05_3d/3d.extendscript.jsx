(function () {
    if (!Astron.handlers) {
        Astron.handlers = {};
    }

    function getParam(params, name, fallback) {
        if (params && params[name] !== undefined && params[name] !== null) {
            return params[name];
        }
        return fallback;
    }

    function setPositionKeys(layer, t1, v1, t2, v2) {
        var position = layer.property("ADBE Transform Group").property("ADBE Position");
        position.setValueAtTime(t1, v1);
        position.setValueAtTime(t2, v2);
    }

    function setLightIntensity(lightLayer, intensity) {
        var options = lightLayer.property("ADBE Light Options Group");
        if (options) {
            var prop = options.property("ADBE Light Intensity");
            if (prop) {
                prop.setValue(intensity);
            }
        }
    }

    function addLight(comp, name, type, position, intensity) {
        var lightLayer = comp.layers.addLight(name, [comp.width / 2, comp.height / 2]);
        lightLayer.lightType = type;
        lightLayer.property("ADBE Transform Group").property("ADBE Position").setValue(position);
        setLightIntensity(lightLayer, intensity);
        return lightLayer;
    }

    Astron.handlers["3d"] = {
        addCamera: function (params) {
            Astron.utils.beginUndo("Astron Add Camera");
            var movement = getParam(params, "movement", "push-in");
            var comp = Astron.utils.getActiveComp();
            var camera = comp.layers.addCamera("Astron Camera", [comp.width / 2, comp.height / 2]);
            var duration = comp.duration;
            var endTime = Math.min(3, duration);
            var pos;
            var rotY;

            try {
                if (movement === "push-in") {
                    setPositionKeys(camera, 0, [comp.width / 2, comp.height / 2, 1000], endTime, [comp.width / 2, comp.height / 2, 500]);
                } else if (movement === "pull-out") {
                    setPositionKeys(camera, 0, [comp.width / 2, comp.height / 2, 500], endTime, [comp.width / 2, comp.height / 2, 1000]);
                } else if (movement === "orbit") {
                    rotY = camera.property("ADBE Transform Group").property("ADBE Rotate Y");
                    rotY.setValueAtTime(0, 0);
                    rotY.setValueAtTime(duration, 360);
                } else if (movement === "ken-burns") {
                    setPositionKeys(camera, 0, [comp.width / 2 - 40, comp.height / 2 - 25, 1200], duration, [comp.width / 2 + 40, comp.height / 2 + 25, 700]);
                } else if (movement === "truck-left") {
                    setPositionKeys(camera, 0, [comp.width, comp.height / 2, 1000], endTime, [0, comp.height / 2, 1000]);
                } else if (movement === "truck-right") {
                    setPositionKeys(camera, 0, [0, comp.height / 2, 1000], endTime, [comp.width, comp.height / 2, 1000]);
                } else if (movement === "crane-up") {
                    setPositionKeys(camera, 0, [comp.width / 2, comp.height, 1000], endTime, [comp.width / 2, 0, 1000]);
                } else if (movement === "crane-down") {
                    setPositionKeys(camera, 0, [comp.width / 2, 0, 1000], endTime, [comp.width / 2, comp.height, 1000]);
                } else {
                    pos = camera.property("ADBE Transform Group").property("ADBE Position");
                    pos.setValue([comp.width / 2, comp.height / 2, 1000]);
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { camera: true, name: "Astron Camera", movement: movement };
        },

        add3DLights: function (params) {
            Astron.utils.beginUndo("Astron Add 3D Lights");
            var type = getParam(params, "type", "studio");
            var comp = Astron.utils.getActiveComp();
            var count = 0;

            try {
                if (type === "studio") {
                    addLight(comp, "Astron Key Light", LightType.AREA, [300, 200, -500], 100);
                    addLight(comp, "Astron Fill Light", LightType.AREA, [-300, 200, -200], 50);
                    addLight(comp, "Astron Rim Light", LightType.AREA, [0, -300, -200], 30);
                    count = 3;
                } else if (type === "dramatic") {
                    addLight(comp, "Astron Dramatic Key", LightType.SPOT, [400, 100, -600], 100);
                    count = 1;
                } else if (type === "back") {
                    addLight(comp, "Astron Back Light", LightType.POINT, [0, -200, 500], 80);
                    count = 1;
                } else if (type === "3pt") {
                    addLight(comp, "Astron Key Light", LightType.POINT, [300, 200, -500], 100);
                    addLight(comp, "Astron Fill Light", LightType.POINT, [-300, 200, -200], 50);
                    addLight(comp, "Astron Back Light", LightType.POINT, [0, -200, 500], 80);
                    count = 3;
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { lights: count, type: type };
        },

        convert2Dto3D: function (params) {
            Astron.utils.beginUndo("Astron Convert 2D To 3D");
            var layers = Astron.utils.requireSelectedLayers();
            var i;

            try {
                for (i = 0; i < layers.length; i += 1) {
                    if (layers[i] instanceof AVLayer) {
                        layers[i].threeDLayer = true;
                    }
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { converted: layers.length };
        }
    };
}());
