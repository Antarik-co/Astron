(function () {
    var Astron = $.global.Astron || {};
    Astron.handlers = Astron.handlers || {};

    function isTextLayer(layer) {
        return layer instanceof TextLayer;
    }

    function getTextAnimators(layer) {
        return layer.property("ADBE Text Properties").property("ADBE Text Animators");
    }

    function addAnimator(layer, name) {
        var animator = getTextAnimators(layer).addProperty("ADBE Text Animator");
        animator.name = name;
        return animator;
    }

    function addSelector(animator) {
        return animator.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
    }

    function setSelectorStart(selector, t1, v1, t2, v2) {
        var start = selector.property("ADBE Text Percent Start");
        start.setValueAtTime(t1, v1);
        start.setValueAtTime(t2, v2);
    }

    function setWordsMode(selector) {
        var advanced = selector.property("ADBE Text Range Advanced");
        var basedOn;
        if (advanced) {
            basedOn = advanced.property("ADBE Text Range Type2");
            if (basedOn) {
                basedOn.setValue(3);
            }
        }
    }

    function addOpacity(animator, value) {
        var prop = animator.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity");
        prop.setValue(value);
        return prop;
    }

    function addPosition(animator, value) {
        var prop = animator.property("ADBE Text Animator Properties").addProperty("ADBE Text Position 3D");
        prop.setValue(value);
        return prop;
    }

    function addScale(animator, value) {
        var prop = animator.property("ADBE Text Animator Properties").addProperty("ADBE Text Scale 3D");
        prop.setValue(value);
        return prop;
    }

    function textLength(layer) {
        var doc = layer.property("ADBE Text Properties").property("ADBE Text Document").value;
        return doc.text.length;
    }

    Astron.handlers.text = {
        applyTextAnimation: function (params) {
            Astron.utils.beginUndo("Astron Apply Text Animation");
            var layers = Astron.utils.requireSelectedLayers();
            var animation = params && params.animation ? params.animation : "fade-up";
            var count = 0;
            var i;
            var animator;
            var selector;

            try {
                for (i = 0; i < layers.length; i += 1) {
                    if (!isTextLayer(layers[i])) {
                        continue;
                    }

                    animator = addAnimator(layers[i], "Astron " + animation);
                    selector = addSelector(animator);

                    if (animation === "fade-up") {
                        addOpacity(animator, 0);
                        addPosition(animator, [0, 30, 0]);
                        setSelectorStart(selector, 0, 0, 1, 100);
                    } else if (animation === "fade-down") {
                        addOpacity(animator, 0);
                        addPosition(animator, [0, -30, 0]);
                        setSelectorStart(selector, 0, 0, 1, 100);
                    } else if (animation === "slide-left") {
                        addPosition(animator, [50, 0, 0]);
                        setSelectorStart(selector, 0, 0, 1, 100);
                    } else if (animation === "slide-right") {
                        addPosition(animator, [-50, 0, 0]);
                        setSelectorStart(selector, 0, 0, 1, 100);
                    } else if (animation === "scale-in") {
                        addScale(animator, [0, 0, 100]);
                        setSelectorStart(selector, 0, 0, 1, 100);
                    } else if (animation === "typewriter") {
                        setSelectorStart(selector, 0, 0, 1, 100);
                    } else if (animation === "fade-in") {
                        addOpacity(animator, 0);
                        setSelectorStart(selector, 0, 0, 1, 100);
                    } else if (animation === "word-by-word") {
                        setWordsMode(selector);
                        setSelectorStart(selector, 0, 0, 1, 100);
                    }

                    count += 1;
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { applied: count, animation: animation };
        },

        swapFont: function (params) {
            Astron.utils.beginUndo("Astron Swap Font");
            var comp = Astron.utils.getActiveComp();
            var oldFont = params ? params.oldFont : "";
            var newFont = params ? params.newFont : "";
            var count = 0;
            var i;
            var layer;
            var textProp;
            var doc;

            try {
                for (i = 1; i <= comp.numLayers; i += 1) {
                    layer = comp.layer(i);
                    if (!isTextLayer(layer)) {
                        continue;
                    }
                    textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
                    doc = textProp.value;
                    if (doc.font === oldFont) {
                        doc.font = newFont;
                        textProp.setValue(doc);
                        count += 1;
                    }
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { swapped: count };
        },

        applyTypewriter: function (params) {
            Astron.utils.beginUndo("Astron Apply Typewriter");
            var layers = Astron.utils.requireSelectedLayers();
            var speed = params && params.speed ? params.speed : 20;
            var count = 0;
            var i;
            var animator;
            var selector;
            var chars;
            var duration;

            try {
                for (i = 0; i < layers.length; i += 1) {
                    if (!isTextLayer(layers[i])) {
                        continue;
                    }
                    chars = textLength(layers[i]);
                    duration = chars / speed;
                    animator = addAnimator(layers[i], "Astron Typewriter");
                    selector = addSelector(animator);
                    setSelectorStart(selector, 0, 0, duration, 100);
                    count += 1;
                }
            } finally {
                Astron.utils.endUndo();
            }

            return { applied: count };
        }
    };
}());
