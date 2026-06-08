(function () {
    if (!Astron.handlers) {
        Astron.handlers = {};
    }

    function isArray(value) {
        return value && value.constructor === Array;
    }

    function addBeatMarker(comp, time) {
        var marker = new MarkerValue("Beat");
        marker.duration = 0.1;
        comp.markerProperty.setValueAtTime(time, marker);
    }

    function getMarkerTimes(comp) {
        var markers = comp.markerProperty;
        var times = [];
        var i;
        for (i = 1; i <= markers.numKeys; i += 1) {
            times.push(markers.keyTime(i));
        }
        return times;
    }

    function nearestStandardFrameRate(raw) {
        var standards = [24, 25, 30, 60];
        var best = standards[0];
        var bestDiff = Math.abs(raw - best);
        var i;
        var diff;
        for (i = 1; i < standards.length; i += 1) {
            diff = Math.abs(raw - standards[i]);
            if (diff < bestDiff) {
                best = standards[i];
                bestDiff = diff;
            }
        }
        return best;
    }

    Astron.handlers.audio = {
        detectBeats: function (params) {
            Astron.utils.beginUndo("Astron Detect Beats");
            var comp = Astron.utils.getActiveComp();
            var times = [];
            var interval;
            var t;
            var i;
            var method = "bpm";

            try {
                if (params && isArray(params.times)) {
                    times = params.times;
                    method = "times-array";
                } else if (params && params.bpm) {
                    interval = 60 / params.bpm;
                    for (t = 0; t <= comp.duration; t += interval) {
                        times.push(t);
                    }
                } else {
                    return { error: "Provide bpm or times array" };
                }

                for (i = 0; i < times.length; i += 1) {
                    if (times[i] >= 0 && times[i] <= comp.duration) {
                        addBeatMarker(comp, times[i]);
                    }
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { markers: times.length, method: method };
        },

        placeMarkersAtTimes: function (params) {
            Astron.utils.beginUndo("Astron Place Audio Markers");
            var comp = Astron.utils.getActiveComp();
            var times = params && isArray(params.times) ? params.times : [];
            var count = 0;
            var i;

            try {
                for (i = 0; i < times.length; i += 1) {
                    if (times[i] >= 0 && times[i] <= comp.duration) {
                        addBeatMarker(comp, times[i]);
                        count += 1;
                    }
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { placed: count };
        },

        syncLayerToMarkers: function (params) {
            Astron.utils.beginUndo("Astron Sync Layer To Markers");
            var comp = Astron.utils.getActiveComp();
            var layers = Astron.utils.requireSelectedLayers();
            var layer = layers[0];
            var scale = layer.property("ADBE Transform Group").property("ADBE Scale");
            var times = getMarkerTimes(comp);
            var i;

            try {
                for (i = 0; i < times.length; i += 1) {
                    scale.setValueAtTime(times[i], [90, 90]);
                    scale.setValueAtTime(Math.min(times[i] + 0.1, comp.duration), [100, 100]);
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { keyframes: times.length, layer: layer.name };
        },

        setTempo: function (params) {
            Astron.utils.beginUndo("Astron Set Tempo");
            var comp = Astron.utils.getActiveComp();
            var bpm = params ? params.bpm : 120;
            var raw = bpm / 60;
            var fps = nearestStandardFrameRate(raw);

            try {
                comp.frameRate = fps;
            } finally {
                Astron.utils.endUndo();
            }

            return { bpm: bpm, fps: comp.frameRate };
        }
    };
}());
