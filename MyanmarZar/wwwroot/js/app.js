(() => {
    const completedKey = "myanmarzar.completed";
    const drawingStates = new Map();
    let activeDrawing = null;

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

        if (!drawing.image?.complete || drawing.image.naturalWidth === 0) {
            return;
        }

        const sampleCanvas = document.createElement("canvas");
        sampleCanvas.width = width;
        sampleCanvas.height = height;
        const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
        sampleContext.drawImage(drawing.image, 0, 0, width, height);

        const source = sampleContext.getImageData(0, 0, width, height);
        const pixelCount = width * height;
        const darkPixels = new Uint8Array(pixelCount);

        for (let pixel = 0; pixel < pixelCount; pixel++) {
            const offset = pixel * 4;
            const red = source.data[offset];
            const green = source.data[offset + 1];
            const blue = source.data[offset + 2];
            const brightness = red * 0.299 + green * 0.587 + blue * 0.114;
            const colorSpread = Math.max(red, green, blue) - Math.min(red, green, blue);

            // The source worksheets use neutral black for the letter road and
            // saturated green, red and blue for the surrounding guide lines.
            darkPixels[pixel] = brightness < 145 && colorSpread < 58 ? 1 : 0;
        }

        const labels = new Int32Array(pixelCount);
        const queue = new Int32Array(pixelCount);
        const componentSizes = [0];
        let label = 0;
        let largestComponent = 0;

        for (let start = 0; start < pixelCount; start++) {
            if (!darkPixels[start] || labels[start] !== 0) {
                continue;
            }

            label++;
            let head = 0;
            let tail = 0;
            let componentSize = 0;
            queue[tail++] = start;
            labels[start] = label;

            while (head < tail) {
                const pixel = queue[head++];
                const x = pixel % width;
                componentSize++;

                const neighbours = [
                    x > 0 ? pixel - 1 : -1,
                    x < width - 1 ? pixel + 1 : -1,
                    pixel >= width ? pixel - width : -1,
                    pixel < pixelCount - width ? pixel + width : -1
                ];

                for (const neighbour of neighbours) {
                    if (neighbour >= 0 && darkPixels[neighbour] && labels[neighbour] === 0) {
                        labels[neighbour] = label;
                        queue[tail++] = neighbour;
                    }
                }
            }

            componentSizes[label] = componentSize;
            largestComponent = Math.max(largestComponent, componentSize);
        }

        const minimumComponentSize = Math.max(pixelCount * 0.0007, largestComponent * 0.055);
        const maskData = sampleContext.createImageData(width, height);

        for (let pixel = 0; pixel < pixelCount; pixel++) {
            if (componentSizes[labels[pixel]] >= minimumComponentSize) {
                const offset = pixel * 4;
                maskData.data[offset] = 255;
                maskData.data[offset + 1] = 255;
                maskData.data[offset + 2] = 255;
                maskData.data[offset + 3] = 255;
            }
        }

        const baseMask = document.createElement("canvas");
        baseMask.width = width;
        baseMask.height = height;
        baseMask.getContext("2d").putImageData(maskData, 0, 0);

        drawing.guideCanvas.width = width;
        drawing.guideCanvas.height = height;
        const guideContext = drawing.guideCanvas.getContext("2d");
        guideContext.clearRect(0, 0, width, height);
        guideContext.fillStyle = "#ffcbd4";
        guideContext.fillRect(0, 0, width, height);
        guideContext.globalCompositeOperation = "destination-in";
        guideContext.drawImage(baseMask, 0, 0);
        guideContext.globalCompositeOperation = "source-over";

        const maskContext = drawing.maskCanvas.getContext("2d");
        const tolerance = Math.max(4, Math.round(width * 0.008));
        maskContext.clearRect(0, 0, width, height);
        maskContext.drawImage(baseMask, 0, 0);

        // Keep the worksheet's white centre line writable and give small hands
        // a little tolerance around the printed road.
        for (const radius of [tolerance * 0.5, tolerance]) {
            for (let step = 0; step < 24; step++) {
                const angle = step * Math.PI * 2 / 24;
                maskContext.drawImage(
                    baseMask,
                    Math.round(Math.cos(angle) * radius),
                    Math.round(Math.sin(angle) * radius)
                );
            }
        }

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
        const { canvas, context, guideCanvas, maskCanvas, pixelRatio, strokes } = drawing;
        const width = canvas.width / pixelRatio;
        const height = canvas.height / pixelRatio;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, width, height);

        if (!drawing.maskReady) {
            return;
        }

        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.drawImage(guideCanvas, 0, 0, canvas.width, canvas.height);
        context.restore();

        context.strokeStyle = "#f45e50";
        context.fillStyle = "#f45e50";
        context.lineCap = "round";
        context.lineJoin = "round";

        const baseWidth = Math.max(14, width * 0.04);

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

    const setupDrawing = async (canvasId, letterKey) => {
        activeDrawing?.cleanup();

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            return;
        }

        const context = canvas.getContext("2d", { alpha: true });
        const stage = canvas.closest(".drawing-stage");
        const image = stage?.querySelector("img");
        const drawing = {
            canvas,
            context,
            stage,
            image,
            guideCanvas: document.createElement("canvas"),
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

        if (!image?.complete || image.naturalWidth === 0) {
            try {
                await image?.decode();
            } catch {
                // If an image cannot be decoded, leave the drawing surface empty.
            }

            if (activeDrawing === drawing && image?.naturalWidth > 0) {
                resizeDrawing(drawing, true);
            }
        }
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
