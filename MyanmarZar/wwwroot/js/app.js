(() => {
    const completedKey = "myanmarzar.completed";
    const drawingStates = new Map();
    let activeDrawing = null;

    const stopStrokeGuide = () => {
        const stage = activeDrawing?.stage ?? document.querySelector(".drawing-stage");
        stage?.querySelector(".stroke-guide")?.classList.add("is-stopped");
        stage?.classList.add("is-writing");
    };

    const getDrawingState = (letterKey) => {
        if (!drawingStates.has(letterKey)) {
            drawingStates.set(letterKey, []);
        }

        return drawingStates.get(letterKey);
    };

    const getPoint = (canvas, event) => {
        const bounds = canvas.getBoundingClientRect();
        const pressure = event.pointerType === "pen"
            ? Math.max(event.pressure || 0, 0.12)
            : 0.55;

        return {
            x: (event.clientX - bounds.left) / bounds.width,
            y: (event.clientY - bounds.top) / bounds.height,
            pressure
        };
    };

    const buildRoadMask = (drawing, width, height) => {
        drawing.maskReady = false;
        drawing.maskCanvas.width = width;
        drawing.maskCanvas.height = height;

        if (drawing.roadPaths.length === 0) {
            return;
        }

        const maskContext = drawing.maskCanvas.getContext("2d");
        maskContext.setTransform(1, 0, 0, 1, 0, 0);
        maskContext.clearRect(0, 0, width, height);
        maskContext.scale(width / 108, height / 96);
        maskContext.strokeStyle = "#fff";
        maskContext.lineWidth = 14.4;
        maskContext.lineCap = "round";
        maskContext.lineJoin = "round";

        for (const road of drawing.roadPaths) {
            maskContext.save();

            if (!road.keepFullHeight) {
                maskContext.translate(54, 56);
                maskContext.scale(0.85, 0.78);
                maskContext.translate(-54, -56);
            }

            maskContext.stroke(new Path2D(road.path));
            maskContext.restore();
        }

        maskContext.setTransform(1, 0, 0, 1, 0, 0);
        const expandedMask = maskContext.getImageData(0, 0, width, height).data;
        drawing.maskPixels = new Uint8Array(width * height);
        drawing.maskWidth = width;
        drawing.maskHeight = height;

        for (let pixel = 0; pixel < drawing.maskPixels.length; pixel++) {
            drawing.maskPixels[pixel] = expandedMask[pixel * 4 + 3];
        }

        drawing.maskReady = true;
    };

    const isPointOnRoad = (drawing, point) => {
        if (!drawing.maskReady || !drawing.maskPixels) {
            return false;
        }

        const x = Math.min(drawing.maskWidth - 1, Math.max(0, Math.floor(point.x * drawing.maskWidth)));
        const y = Math.min(drawing.maskHeight - 1, Math.max(0, Math.floor(point.y * drawing.maskHeight)));
        return drawing.maskPixels[y * drawing.maskWidth + x] > 16;
    };

    const renderDrawing = (drawing) => {
        const { canvas, context, maskCanvas, pixelRatio, strokes } = drawing;
        const width = canvas.width / pixelRatio;
        const height = canvas.height / pixelRatio;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, width, height);

        if (!drawing.maskReady) {
            return;
        }

        context.strokeStyle = "#f45e50";
        context.fillStyle = "#f45e50";
        context.lineCap = "round";
        context.lineJoin = "round";

        const baseWidth = Math.max(16, width * 0.072);

        for (const stroke of strokes) {
            if (stroke.length === 1) {
                const point = stroke[0];
                const radius = baseWidth * (0.9 + point.pressure * 0.18) / 2;
                context.beginPath();
                context.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2);
                context.fill();
                continue;
            }

            for (let index = 1; index < stroke.length; index++) {
                const previous = stroke[index - 1];
                const current = stroke[index];
                context.beginPath();
                context.moveTo(previous.x * width, previous.y * height);
                context.lineTo(current.x * width, current.y * height);
                context.lineWidth = baseWidth * (0.9 + current.pressure * 0.18);
                context.stroke();
            }
        }

        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalCompositeOperation = "destination-in";
        context.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
        context.restore();
    };

    const resizeDrawing = (drawing, forceMask = false) => {
        const bounds = drawing.canvas.getBoundingClientRect();
        const pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 2);
        const logicalWidth = Math.max(1, Math.round(bounds.width));
        const logicalHeight = Math.max(1, Math.round(bounds.height));
        const width = Math.max(1, Math.round(logicalWidth * pixelRatio));
        const height = Math.max(1, Math.round(logicalHeight * pixelRatio));

        drawing.pixelRatio = pixelRatio;
        const canvasChanged = drawing.canvas.width !== width || drawing.canvas.height !== height;
        if (canvasChanged) {
            drawing.canvas.width = width;
            drawing.canvas.height = height;
        }

        const maskChanged = drawing.maskCanvas.width !== logicalWidth || drawing.maskCanvas.height !== logicalHeight;
        if (forceMask || canvasChanged || maskChanged || !drawing.maskReady) {
            buildRoadMask(drawing, logicalWidth, logicalHeight);
        }

        renderDrawing(drawing);
    };

    const finishStroke = (drawing, event) => {
        if (drawing.pointerId !== event.pointerId) {
            return;
        }

        drawing.pointerId = null;
        drawing.currentStroke = null;
        drawing.previousPoint = null;
        drawing.strokeAccepted = false;

        if (drawing.canvas.hasPointerCapture(event.pointerId)) {
            drawing.canvas.releasePointerCapture(event.pointerId);
        }
    };

    const setupDrawing = (canvasId, letterKey) => {
        activeDrawing?.cleanup();

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            return;
        }

        const context = canvas.getContext("2d", { alpha: true });
        const stage = canvas.closest(".drawing-stage");
        const roadPaths = [...(stage?.querySelectorAll("[data-road-path]") ?? [])]
            .map((path) => ({
                path: path.getAttribute("d"),
                keepFullHeight: path.dataset.fullHeight === "true"
            }))
            .filter((road) => road.path);
        const drawing = {
            canvas,
            context,
            stage,
            roadPaths,
            maskCanvas: document.createElement("canvas"),
            maskReady: false,
            maskPixels: null,
            maskWidth: 0,
            maskHeight: 0,
            strokes: getDrawingState(letterKey),
            pointerId: null,
            currentStroke: null,
            previousPoint: null,
            strokeAccepted: false,
            pixelRatio: 1,
            cleanup: () => { }
        };

        const pointerDown = (event) => {
            if (drawing.pointerId !== null || (event.pointerType === "mouse" && event.button !== 0)) {
                return;
            }

            stopStrokeGuide();
            event.preventDefault();
            drawing.pointerId = event.pointerId;
            drawing.currentStroke = [];
            drawing.previousPoint = getPoint(canvas, event);
            drawing.strokeAccepted = isPointOnRoad(drawing, drawing.previousPoint);

            if (drawing.strokeAccepted) {
                drawing.currentStroke.push(drawing.previousPoint);
                drawing.strokes.push(drawing.currentStroke);
            }

            canvas.setPointerCapture(event.pointerId);
            if (drawing.strokeAccepted) {
                renderDrawing(drawing);
            }
        };

        const pointerMove = (event) => {
            if (drawing.pointerId !== event.pointerId || !drawing.currentStroke) {
                return;
            }

            event.preventDefault();
            const events = typeof event.getCoalescedEvents === "function"
                ? event.getCoalescedEvents()
                : [event];

            for (const coalescedEvent of events) {
                const point = getPoint(canvas, coalescedEvent);

                if (!drawing.strokeAccepted && isPointOnRoad(drawing, point)) {
                    drawing.currentStroke.push(drawing.previousPoint ?? point, point);
                    drawing.strokes.push(drawing.currentStroke);
                    drawing.strokeAccepted = true;
                } else if (drawing.strokeAccepted) {
                    drawing.currentStroke.push(point);
                }

                drawing.previousPoint = point;
            }

            if (drawing.strokeAccepted) {
                renderDrawing(drawing);
            }
        };

        const pointerUp = (event) => finishStroke(drawing, event);
        const pointerCancel = (event) => finishStroke(drawing, event);
        const pointerCaptureLost = (event) => finishStroke(drawing, event);
        const resizeObserver = new ResizeObserver(() => resizeDrawing(drawing));

        canvas.addEventListener("pointerdown", pointerDown);
        canvas.addEventListener("pointermove", pointerMove);
        canvas.addEventListener("pointerup", pointerUp);
        canvas.addEventListener("pointercancel", pointerCancel);
        canvas.addEventListener("lostpointercapture", pointerCaptureLost);
        resizeObserver.observe(canvas);

        drawing.cleanup = () => {
            resizeObserver.disconnect();
            canvas.removeEventListener("pointerdown", pointerDown);
            canvas.removeEventListener("pointermove", pointerMove);
            canvas.removeEventListener("pointerup", pointerUp);
            canvas.removeEventListener("pointercancel", pointerCancel);
            canvas.removeEventListener("lostpointercapture", pointerCaptureLost);
        };

        activeDrawing = drawing;
        resizeDrawing(drawing);
    };

    globalThis.myanmarZar = {
        loadCompleted: () => {
            try {
                const saved = globalThis.localStorage.getItem(completedKey);
                return saved ? JSON.parse(saved) : [];
            } catch {
                return [];
            }
        },
        saveCompleted: (completed) => {
            try {
                globalThis.localStorage.setItem(completedKey, JSON.stringify(completed));
            } catch {
                // The lessons still work when private browsing blocks storage.
            }
        },
        drawing: {
            setup: setupDrawing,
            replayGuide: () => activeDrawing?.stage?.classList.remove("is-writing"),
            undo: () => {
                if (!activeDrawing || activeDrawing.strokes.length === 0) {
                    return;
                }

                activeDrawing.strokes.pop();
                renderDrawing(activeDrawing);
            },
            clear: () => {
                if (!activeDrawing) {
                    return;
                }

                activeDrawing.strokes.length = 0;
                renderDrawing(activeDrawing);
            }
        }
    };
})();
