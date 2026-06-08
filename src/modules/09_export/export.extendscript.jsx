(function () {
    if (!Astron.handlers) {
        Astron.handlers = {};
    }

    function getFormat(params) {
        if (params && params.format) {
            return params.format;
        }
        return "web";
    }

    function getExtension(format) {
        if (format === "lossless") {
            return ".mov";
        }
        return ".mp4";
    }

    function safeName(name) {
        return name.replace(/[\\\/\:\*\?\"\<\>\|]/g, "_");
    }

    function getOutputPath(comp, format) {
        var dir;
        if (app.project.file) {
            dir = app.project.file.parent.fsName;
        } else {
            dir = Folder.desktop.fsName;
        }
        return dir + "/" + safeName(comp.name) + "_" + format + getExtension(format);
    }

    function applyOutputTemplate(rqItem, format) {
        var outputModule = rqItem.outputModule(1);
        if (format === "lossless") {
            outputModule.applyTemplate("Lossless");
        } else {
            outputModule.applyTemplate("H.264 - Match Render Settings - 15 Mbps");
        }
        return outputModule;
    }

    Astron.handlers.export = {
        quickExport: function (params) {
            Astron.utils.beginUndo("Astron Quick Export");
            var comp = Astron.utils.getActiveComp();
            var format = getFormat(params);
            var rqItem;
            var outputModule;
            var path;

            try {
                app.project.renderQueue.items.add(comp);
                rqItem = app.project.renderQueue.item(app.project.renderQueue.numItems);
                outputModule = applyOutputTemplate(rqItem, format);
                path = getOutputPath(comp, format);
                outputModule.file = new File(path);
            } finally {
                Astron.utils.endUndo();
            }

            return { queued: true, format: format, compName: comp.name };
        },

        getProjectPath: function (params) {
            Astron.utils.beginUndo("Astron Get Project Path");
            var path = null;
            try {
                path = app.project.file ? app.project.file.fsName : null;
            } finally {
                Astron.utils.endUndo();
            }
            return { path: path };
        },

        saveVersionSnapshot: function (params) {
            Astron.utils.beginUndo("Astron Save Version Snapshot");
            var file;
            var dir;
            var base;
            var timestamp;
            var newPath;

            try {
                if (!app.project.file) {
                    throw new Error("Save your project first before creating a version snapshot.");
                }
                file = app.project.file;
                dir = file.parent.fsName;
                base = file.name.replace(".aep", "");
                timestamp = (new Date()).getTime();
                newPath = dir + "/" + base + "_v" + timestamp + ".aep";
                app.project.save(new File(newPath));
            } finally {
                Astron.utils.endUndo();
            }

            return { saved: true, path: newPath };
        },

        addToRenderQueue: function (params) {
            Astron.utils.beginUndo("Astron Add To Render Queue");
            var comp = Astron.utils.getActiveComp();
            try {
                app.project.renderQueue.items.add(comp);
            } finally {
                Astron.utils.endUndo();
            }
            return { added: true, compName: comp.name, queueCount: app.project.renderQueue.numItems };
        }
    };
}());
