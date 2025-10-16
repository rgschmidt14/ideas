// JavaScript for TTRPG Map Easy

document.addEventListener('DOMContentLoaded', () => {
    console.log("TTRPG Map Easy script loaded.");

    // --- DOM Elements ---
    const bgImageInput = document.getElementById('bg-image-input');
    const mapContainer = document.getElementById('map-container');
    const canvas = document.getElementById('grid-canvas');
    const ctx = canvas.getContext('2d');
    const mapWidthInput = document.getElementById('map-width');
    const mapLengthInput = document.getElementById('map-length');
    const mapUnitsSelect = document.getElementById('map-units');
    const mapIncrementInput = document.getElementById('map-increment');
    const handleTL = document.getElementById('handle-tl');
    const handleTR = document.getElementById('handle-tr');
    const tokenImageInput = document.getElementById('token-image-input');
    const tokenWidthInput = document.getElementById('token-width');
    const tokenLengthInput = document.getElementById('token-length');
    const tokenHeightInput = document.getElementById('token-height');
    const addTokenBtn = document.getElementById('add-token-btn');
    const tokenLibrary = document.getElementById('token-library');
    const tokenModeHeader = document.getElementById('token-mode-header');
    const tokenPreview = document.getElementById('token-preview');
    const updateTokenBtn = document.getElementById('update-token-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const tokenUnitsSpan = document.getElementById('token-units');
    const selectedTokenControls = document.getElementById('selected-token-controls');
    const tokenAltitudeSlider = document.getElementById('token-altitude');
    const altitudeValueSpan = document.getElementById('altitude-value');
    const onMapTokenList = document.getElementById('on-map-token-list');
    const sessionSelect = document.getElementById('session-select');
    const sessionNameInput = document.getElementById('session-name-input');
    const saveSessionBtn = document.getElementById('save-session-btn');
    const loadSessionBtn = document.getElementById('load-session-btn');
    const updateSessionBtn = document.getElementById('update-session-btn');
    const deleteSessionBtn = document.getElementById('delete-session-btn');
    const newSessionBtn = document.getElementById('new-session-btn');
    const gridOpacitySlider = document.getElementById('grid-opacity-slider');
    const gridOpacityValue = document.getElementById('grid-opacity-value');


    // --- Application State ---
    const state = {
        gridOpacity: 0.5,
        viewMode: 'top-down', // 'top-down' or 'perspective'
        mapWidth: 30,
        mapLength: 20,
        handleTLPos: { x: 0, y: 0 },
        handleTRPos: { x: 0, y: 0 }, // x will be updated to canvas width on resize
        draggingHandle: null,
        tokensInLibrary: [],
        tokensOnMap: [],
        selectedTokenInstanceId: null,
        draggingTokenInstanceId: null,
        dragOffset: { u: 0, v: 0 },
        pixelDragOffset: { x: 0, y: 0 }, // For new, more accurate dragging
        nextTokenInstanceId: 0,
        editingTokenId: null, // Can be library token ID or map token instance ID
        editingTokenType: null, // 'library' or 'map'
        bgImageIsAnimated: false,
        animationFrameId: null,
    };
    let isThrottled = false;
    // --- Main Render Function ---
    const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawTokens();
        drawSelectionOutline();
        if (state.viewMode === 'perspective') {
            drawHorizon();
        }
        // The token list only needs to be re-rendered on state changes, not every frame.
        // We'll call it from places where the state actually changes.
    };

    // --- Drawing Functions ---
    const drawGrid = () => {
        ctx.strokeStyle = `rgba(0, 0, 0, ${state.gridOpacity})`;
        ctx.lineWidth = 1;
        const increment = parseInt(mapIncrementInput.value, 10) || 1;

        if (state.viewMode === 'top-down') {
            const numWidthSteps = state.mapWidth / increment;
            for (let i = 1; i < numWidthSteps; i++) {
                const x = (i * increment / state.mapWidth) * canvas.width;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            const numLengthSteps = state.mapLength / increment;
            for (let i = 1; i < numLengthSteps; i++) {
                const y = (i * increment / state.mapLength) * canvas.height;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
        } else { // Perspective
            const { mapWidth, mapLength } = state;

            // Draw vertical lines (converging)
            const numWidthSteps = mapWidth / increment;
            for (let i = 1; i < numWidthSteps; i++) {
                const u = (i * increment) / mapWidth;
                const p1 = gridToCanvasCoords(u, 0);
                const p2 = gridToCanvasCoords(u, 1);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }

            // Draw horizontal lines (with perspective scaling)
            const numLengthSteps = mapLength / increment;
            // This factor determines the "curve" of the perspective.
            // A value of 1 is linear. Higher values bend the lines more towards the horizon.
            // It's based on how far down the handles are pulled.
            const perspectiveFactor = 1 + (state.handleTLPos.y / canvas.height) * 4; // Range of 1 to 5

            for (let i = 1; i < numLengthSteps; i++) {
                // 'd' is the true depth fraction (linear), from back (0) to front (1)
                const d = (i * increment) / mapLength;

                // 'v' is the on-screen depth fraction (curved using a power function)
                // It maps the linear depth to a perspective-correct position on screen.
                const v = Math.pow(d, perspectiveFactor);

                const p1 = gridToCanvasCoords(0, v);
                const p2 = gridToCanvasCoords(1, v);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    };

    const drawTokens = () => {
        state.tokensOnMap.sort((a, b) => a.v - b.v);

        for (const token of state.tokensOnMap) {
            if (!token.img || !token.img.complete) continue;

            const logicalWidth = token.width / state.mapWidth;
            const logicalLength = token.length / state.mapLength;

            // The `v` coordinate is "true" depth (0-1). We need to convert it to the
            // on-screen `v` for drawing, using the same perspective formula as the grid.
            const perspectiveFactor = 1 + (state.handleTLPos.y / canvas.height) * 4;
            const screenV = Math.pow(token.v, perspectiveFactor);
            const screenVEnd = Math.pow(Math.min(1, token.v + logicalLength), perspectiveFactor);


            if (state.viewMode === 'top-down') {
                const p = gridToCanvasCoords(token.u, token.v);
                const w = (canvas.width / state.mapWidth) * token.width;
                const h = (canvas.height / state.mapLength) * token.length;
                ctx.drawImage(token.img, p.x - w/2, p.y - h/2, w, h);
            } else { // Perspective
                // 1. Draw shadow
                // We use the screen-space V values to get the correct perspective shape
                const p1 = gridToCanvasCoords(token.u, screenV);
                const p2 = gridToCanvasCoords(token.u + logicalWidth, screenV);
                const p3 = gridToCanvasCoords(token.u + logicalWidth, screenVEnd);
                const p4 = gridToCanvasCoords(token.u, screenVEnd);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.lineTo(p4.x, p4.y);
                ctx.closePath();
                ctx.fill();

                // 2. Draw token image, standing straight up
                const pBottomCenter = { x: (p3.x + p4.x) / 2, y: (p3.y + p4.y) / 2 };
                const pTopCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

                // The token's visual width is the width of its base on screen
                const perspectiveWidth = p2.x - p1.x;

                // The token's visual "length" on screen is the distance between the
                // front and back of its base. This is our basis for height.
                const perspectiveLength = pBottomCenter.y - pTopCenter.y;

                const finalWidth = perspectiveWidth;

                // The final height is its aspect ratio (height/width) times the visual width on screen.
                // This preserves the token's appearance regardless of perspective depth.
                let finalHeight = finalWidth; // Default to a square aspect ratio
                if (token.width > 0) {
                    finalHeight = finalWidth * (token.height / token.width);
                }

                // Altitude offset must also be scaled by perspective.
                // We calculate the on-screen size of a single map unit of length at the token's depth.
                let onScreenUnitLength = 0;
                if (token.length > 0) {
                    onScreenUnitLength = perspectiveLength / token.length;
                }
                const altitudeOffset = token.altitude * onScreenUnitLength;


                ctx.drawImage(
                    token.img,
                    pBottomCenter.x - finalWidth / 2,
                    pBottomCenter.y - finalHeight - altitudeOffset,
                    finalWidth,
                    finalHeight
                );

                // 3. Add overlay if token is "underground"
                if (token.altitude < 0) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // Same as shadow color
                    ctx.fillRect(
                        pBottomCenter.x - finalWidth / 2,
                        pBottomCenter.y - finalHeight - altitudeOffset,
                        finalWidth,
                        finalHeight
                    );
                }
            }
        }
    };
    const getVanishPoint = () => {
        const { handleTLPos, handleTRPos } = state;
        const bl = { x: 0, y: canvas.height };
        const br = { x: canvas.width, y: canvas.height };

        // Line 1: (bl.x, bl.y) to (handleTLPos.x, handleTLPos.y)
        const A1 = handleTLPos.y - bl.y;
        const B1 = bl.x - handleTLPos.x;
        const C1 = A1 * bl.x + B1 * bl.y;

        // Line 2: (br.x, br.y) to (handleTRPos.x, handleTRPos.y)
        const A2 = handleTRPos.y - br.y;
        const B2 = br.x - handleTRPos.x;
        const C2 = A2 * br.x + B2 * br.y;

        const det = A1 * B2 - A2 * B1;
        if (det === 0) {
            return { x: canvas.width / 2, y: -canvas.height, v_frac: -1 }; // Parallel lines, effectively infinite vanishing point
        } else {
            const x = (B2 * C1 - B1 * C2) / det;
            const y = (A1 * C2 - A2 * C1) / det;
            const v_frac = y / (y - canvas.height);
            return { x, y, v_frac };
        }
    };
    const drawHorizon = () => {
        const vp = getVanishPoint();
        if (vp.y > 0 && vp.y < canvas.height) {
            ctx.strokeStyle = `rgba(0, 255, 255, ${state.gridOpacity * 1.6})`; // Make horizon slightly more visible
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, vp.y);
            ctx.lineTo(canvas.width, vp.y);
            ctx.stroke();
        }
    };
    const drawSelectionOutline = () => {
        if (!state.selectedTokenInstanceId) return;
        const token = state.tokensOnMap.find(t => t.instanceId === state.selectedTokenInstanceId);
        if (!token) return;

        const logicalWidth = token.width / state.mapWidth;
        const logicalLength = token.length / state.mapLength;

        if (state.viewMode === 'top-down') {
            const p = gridToCanvasCoords(token.u, token.v);
            const w = (canvas.width / state.mapWidth) * token.width;
            const h = (canvas.height / state.mapLength) * token.length;
            ctx.strokeRect(p.x - w/2, p.y - h/2, w, h);
        } else {
            // Use the same perspective logic as drawTokens to get the base shape
            const perspectiveFactor = 1 + (state.handleTLPos.y / canvas.height) * 4;
            const screenV = Math.pow(token.v, perspectiveFactor);
            const screenVEnd = Math.pow(Math.min(1, token.v + logicalLength), perspectiveFactor);

            const p1 = gridToCanvasCoords(token.u, screenV);
            const p2 = gridToCanvasCoords(token.u + logicalWidth, screenV);
            const p3 = gridToCanvasCoords(token.u + logicalWidth, screenVEnd);
            const p4 = gridToCanvasCoords(token.u, screenVEnd);

            ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
            ctx.closePath();
            ctx.stroke();
        }
    };

    const updateHandles = () => {
        handleTL.style.left = `${state.handleTLPos.x}px`;
        handleTL.style.top = `${state.handleTLPos.y}px`;
        handleTR.style.left = `${state.handleTRPos.x}px`;
        handleTR.style.top = `${state.handleTRPos.y}px`;
    };

    const resetHandles = () => {
        state.handleTLPos = { x: 0, y: 0 };
        state.handleTRPos = { x: canvas.width, y: 0 };
        updateHandles();
    };

    const updateGridSettings = () => {
        state.mapWidth = parseInt(mapWidthInput.value, 10) || 1;
        state.mapLength = parseInt(mapLengthInput.value, 10) || 1;
        requestRender();
    };

    const resizeCanvas = () => {
        const { width, height } = mapContainer.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;
        resetHandles();
        requestRender();
    };

    // --- Coordinate Transformation ---
    // Converts a point from the logical grid (0-1) to canvas pixels.
    const gridToCanvasCoords = (u, v) => {
        const { handleTLPos, handleTRPos } = state;
        const bl = { x: 0, y: canvas.height };
        const br = { x: canvas.width, y: canvas.height };

        const topX = handleTLPos.x + (handleTRPos.x - handleTLPos.x) * u;
        const topY = handleTLPos.y + (handleTRPos.y - handleTLPos.y) * u;
        const botX = bl.x + (br.x - bl.x) * u;

        const x = topX + (botX - topX) * v;
        const y = topY + (canvas.height - topY) * v;

        return { x, y };
    };

    // New, more accurate inverse function
    const canvasToGridCoords = (x, y) => {
        if (state.viewMode === 'top-down') {
            return {
                u: x / canvas.width,
                v: y / canvas.height
            };
        }

        // --- Perspective Mode Calculation ---
        const { handleTLPos, handleTRPos } = state;
        const vp = getVanishPoint();

        // Avoid division by zero if click is on the horizon
        if (Math.abs(y - vp.y) < 1) {
           const u = x / canvas.width; // Best guess on the horizon
           let v_screen = (y - vp.y) / (canvas.height - vp.y);
           v_screen = Math.max(0, Math.min(1, v_screen));
           const perspectiveFactor = 1 + (state.handleTLPos.y / canvas.height) * 4;
           const v_true = Math.pow(v_screen, 1 / perspectiveFactor);
           return { u, v: v_true };
        }

        let v_screen = (y - vp.y) / (canvas.height - vp.y);
        v_screen = Math.max(0, Math.min(1, v_screen)); // Clamp v_screen between 0 and 1

        // Now find u. The horizontal line at y corresponds to a single v value on screen.
        const p1 = gridToCanvasCoords(0, v_screen);
        const p2 = gridToCanvasCoords(1, v_screen);

        // Avoid division by zero if the line is vertical
        if (Math.abs(p2.x - p1.x) < 1) {
             return { u: 0.5, v: v_screen }; // Best guess at the center
        }

        // u is the fractional distance of x between p1.x and p2.x
        const u = (x - p1.x) / (p2.x - p1.x);

        // Now, convert the on-screen v (v_screen) to the true depth v (v_true)
        const perspectiveFactor = 1 + (state.handleTLPos.y / canvas.height) * 4;
        const v_true = Math.pow(v_screen, 1 / perspectiveFactor);


        return { u: u, v: v_true }; // Allow dragging outside the 0-1 range
    };


    // --- New Helper: Get a token's on-screen bounding box ---
    const getTokenScreenRect = (token) => {
        if (!token.img || !token.img.complete) return null;

        const logicalWidth = token.width / state.mapWidth;
        const logicalLength = token.length / state.mapLength;

        if (state.viewMode === 'top-down') {
            const p = gridToCanvasCoords(token.u, token.v);
            const w = (canvas.width / state.mapWidth) * token.width;
            const h = (canvas.height / state.mapLength) * token.length;
            return { x: p.x - w/2, y: p.y - h/2, width: w, height: h };
        } else { // Perspective
            const perspectiveFactor = 1 + (state.handleTLPos.y / canvas.height) * 4;
            const screenV = Math.pow(token.v, perspectiveFactor);
            const screenVEnd = Math.pow(Math.min(1, token.v + logicalLength), perspectiveFactor);

            const p1 = gridToCanvasCoords(token.u, screenV);
            const p2 = gridToCanvasCoords(token.u + logicalWidth, screenV);
            const p3 = gridToCanvasCoords(token.u + logicalWidth, screenVEnd);
            const p4 = gridToCanvasCoords(token.u, screenVEnd);

            const pBottomCenter = { x: (p3.x + p4.x) / 2, y: (p3.y + p4.y) / 2 };
            const pTopCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

            const perspectiveWidth = p2.x - p1.x;
            const perspectiveLength = pBottomCenter.y - pTopCenter.y;

            const finalWidth = perspectiveWidth;
            let finalHeight = finalWidth;
            if (token.width > 0) {
                finalHeight = finalWidth * (token.height / token.width);
            }

            let onScreenUnitLength = 0;
            if (token.length > 0) {
                onScreenUnitLength = perspectiveLength / token.length;
            }
            const altitudeOffset = token.altitude * onScreenUnitLength;

            const x = pBottomCenter.x - finalWidth / 2;
            const y = pBottomCenter.y - finalHeight - altitudeOffset;

            return { x, y, width: finalWidth, height: finalHeight };
        }
    };


    const checkViewMode = () => {
        const isTopDown = state.handleTLPos.x === 0 && state.handleTLPos.y === 0 &&
                          state.handleTRPos.x === canvas.width && state.handleTRPos.y === 0;
        const newMode = isTopDown ? 'top-down' : 'perspective';
        if (state.viewMode !== newMode) {
            state.viewMode = newMode;
            console.log("View mode changed to:", newMode);
        }
    };

    // --- Event Listeners ---

    [handleTL, handleTR].forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            state.draggingHandle = handle;
            mapContainer.style.cursor = 'grabbing';
            e.stopPropagation();
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (state.draggingHandle) {
            const rect = mapContainer.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;

            // Clamp coordinates to stay within canvas bounds for handles
            x = Math.max(0, Math.min(x, rect.width));
            y = Math.max(0, Math.min(y, rect.height));

            if (state.draggingHandle.id === 'handle-tl') {
                state.handleTLPos.x = x;
                state.handleTLPos.y = y;
                state.handleTRPos.y = y; // Constrain vertical movement
            } else {
                state.handleTRPos.x = x;
                state.handleTRPos.y = y;
                state.handleTLPos.y = y; // Constrain vertical movement
            }

            checkViewMode();
            updateHandles();
            if (!isThrottled) {
                isThrottled = true;
                setTimeout(() => {
                    requestRender();
                    isThrottled = false;
                }, 1000 / 30); // throttle to 30fps
            }

        } else if (state.draggingTokenInstanceId) {
            const token = state.tokensOnMap.find(t => t.instanceId === state.draggingTokenInstanceId);
            if (!token) return;

            const rect = mapContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // The new center of the token's base should be at the mouse position minus the pixel offset.
            const newCenterBaseX = x - state.pixelDragOffset.x;
            const newCenterBaseY = y - state.pixelDragOffset.y;

            // Convert this target canvas point for the base center into logical (u, v) for the base center.
            const { u: center_u, v: center_v_true } = canvasToGridCoords(newCenterBaseX, newCenterBaseY);

            // The token's stored position is its top-left corner, so adjust from the center.
            const logicalWidth = token.width / state.mapWidth;
            const logicalLength = token.length / state.mapLength;
            token.u = center_u - (logicalWidth / 2);
            token.v = center_v_true - (logicalLength / 2);


            requestRender();
        }
    });

    onMapTokenList.addEventListener('click', (e) => {
        const item = e.target.closest('.on-map-token-item');
        if (!item) return;

        const { instanceId } = item.dataset;
        state.selectedTokenInstanceId = instanceId;
        updateSelectedTokenUI(); // Update the slider controls
        requestRender(); // Re-render to show canvas selection outline immediately

        // Temporary visual highlight on the list item
        item.classList.add('highlight');
        setTimeout(() => {
            item.classList.remove('highlight');
            // Optionally, clear selection after highlight if desired
            // state.selectedTokenInstanceId = null;
            // render();
        }, 500); // Highlight for 500ms
    });

    document.addEventListener('mouseup', () => {
        if (state.draggingHandle) {
            state.draggingHandle = null;
            mapContainer.style.cursor = 'default';
            requestRender(); // Final render after dragging handle
        } else if (state.draggingTokenInstanceId) {
            const token = state.tokensOnMap.find(t => t.instanceId === state.draggingTokenInstanceId);
            if (token) {
                snapTokenToGrid(token);
            }
            state.draggingTokenInstanceId = null;
            mapContainer.style.cursor = 'default';
            requestRender();
        }
    });

    bgImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            state.bgImageIsAnimated = file.type === 'image/gif';
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    mapContainer.style.backgroundImage = `url(${e.target.result})`;
                    const containerMaxWidth = mapContainer.parentElement.clientWidth;
                    const scale = Math.min(1, containerMaxWidth / img.width);
                    mapContainer.style.width = `${img.width * scale}px`;
                    mapContainer.style.height = `${img.height * scale}px`;
                    resizeCanvas();
                    requestRender(); // Use the new render loop
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    [mapWidthInput, mapLengthInput, mapUnitsSelect].forEach(el => {
        el.addEventListener('change', updateGridSettings);
    });

    let selectedTokenImage = null;
    let nextTokenId = 0;

    const renderLibrary = () => {
        const libraryHeader = tokenLibrary.querySelector('h4');
        // Clear existing tokens except the header
        while (libraryHeader.nextSibling) {
            libraryHeader.nextSibling.remove();
        }

        state.tokensInLibrary.forEach(token => {
            const tokenElement = document.createElement('div');
            tokenElement.id = token.id;
            tokenElement.className = 'token-in-library';
            tokenElement.style.backgroundImage = `url(${token.imgSrc})`;
            tokenElement.draggable = true;
            tokenElement.dataset.tokenId = token.id;
            tokenLibrary.appendChild(tokenElement);
        });
    };

    const enterEditMode = (token, type) => {
        state.editingTokenId = token.id || token.instanceId;
        state.editingTokenType = type;

        tokenModeHeader.textContent = "Edit Token";
        tokenPreview.src = token.imgSrc;
        tokenPreview.style.display = 'block';
        tokenWidthInput.value = token.width;
        tokenLengthInput.value = token.length;
        tokenHeightInput.value = token.height;

        tokenImageInput.style.display = 'none'; // Hide file input in edit mode
        addTokenBtn.style.display = 'none';
        updateTokenBtn.style.display = 'inline-block';
        cancelEditBtn.style.display = 'inline-block';
    };

    const exitEditMode = () => {
        state.editingTokenId = null;
        state.editingTokenType = null;

        tokenModeHeader.textContent = "3. Add Token";
        tokenPreview.style.display = 'none';
        tokenImageInput.value = '';
        selectedTokenImage = null;
        tokenWidthInput.value = 1;
        tokenLengthInput.value = 1;
        tokenHeightInput.value = 1;

        tokenImageInput.style.display = 'block';
        addTokenBtn.style.display = 'inline-block';
        updateTokenBtn.style.display = 'none';
        cancelEditBtn.style.display = 'none';
    };


    const addTokenToLibrary = () => {
        if (!selectedTokenImage || !selectedTokenImage.src) {
            alert('Please select a token image first.');
            return;
        }

        const newId = `lib-token-${nextTokenId++}`;
        const newToken = {
            id: newId,
            imgSrc: selectedTokenImage.src,
            isAnimated: selectedTokenImage.isAnimated,
            width: parseInt(tokenWidthInput.value, 10) || 1,
            length: parseInt(tokenLengthInput.value, 10) || 1,
            height: parseInt(tokenHeightInput.value, 10) || 0,
        };

        state.tokensInLibrary.push(newToken);
        renderLibrary();
        requestRender(); // A new animated token in the library could require the loop

        // Reset for next token
        tokenImageInput.value = '';
        selectedTokenImage = null;
        tokenPreview.style.display = 'none';
    };

    tokenImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedTokenImage = {
                    src: e.target.result,
                    isAnimated: file.type === 'image/gif'
                };
                tokenPreview.src = e.target.result;
                tokenPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    addTokenBtn.addEventListener('click', addTokenToLibrary);

    mapUnitsSelect.addEventListener('change', () => {
        tokenUnitsSpan.textContent = mapUnitsSelect.value;
        renderTokenList(); // Update dimensions in list
    });

    tokenLibrary.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('token-in-library')) {
            e.dataTransfer.setData('text/plain', e.target.dataset.tokenId);
            e.dataTransfer.effectAllowed = 'copy';
        }
    });

    tokenLibrary.addEventListener('click', (e) => {
        if (e.target.classList.contains('token-in-library')) {
            const tokenId = e.target.dataset.tokenId;
            const token = state.tokensInLibrary.find(t => t.id === tokenId);
            if (token) {
                enterEditMode(token, 'library');
            }
        }
    });

    updateTokenBtn.addEventListener('click', () => {
        if (!state.editingTokenId) return;

        const newWidth = parseInt(tokenWidthInput.value, 10) || 1;
        const newLength = parseInt(tokenLengthInput.value, 10) || 1;
        const newHeight = parseInt(tokenHeightInput.value, 10) || 0;

        if (state.editingTokenType === 'library') {
            const token = state.tokensInLibrary.find(t => t.id === state.editingTokenId);
            if (token) {
                token.width = newWidth;
                token.length = newLength;
                token.height = newHeight;
                // NEW: Update all instances of this token on the map
                state.tokensOnMap.forEach(mapToken => {
                    if (mapToken.id === state.editingTokenId) {
                        mapToken.width = newWidth;
                        mapToken.length = newLength;
                        mapToken.height = newHeight;
                    }
                });
            }
        } else if (state.editingTokenType === 'map') {
            const token = state.tokensOnMap.find(t => t.instanceId === state.editingTokenId);
            if (token) {
                token.width = newWidth;
                token.length = newLength;
                token.height = newHeight;
            }
        }
        requestRender();
        renderTokenList(); // Re-render the list to show all changes
        exitEditMode();
    });

    cancelEditBtn.addEventListener('click', exitEditMode);

    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const tokenId = e.dataTransfer.getData('text/plain');
        const originalToken = state.tokensInLibrary.find(t => t.id === tokenId);

        if (originalToken) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            let { u, v } = canvasToGridCoords(x, y);

            // Adjust position to center the token on the cursor
            const logicalWidth = originalToken.width / state.mapWidth;
            const logicalLength = originalToken.length / state.mapLength;
            u -= logicalWidth / 2;
            v -= logicalLength / 2;


            const newMapToken = {
                ...originalToken,
                instanceId: `map-token-${state.nextTokenInstanceId++}`,
                u, // logical x (0-1)
                v, // logical y (0-1)
                altitude: 0,
                img: null,
                isAnimated: originalToken.isAnimated || false,
            };

            // Preload the image for rendering
            const img = new Image();
            img.onload = () => {
                newMapToken.img = img;
                state.tokensOnMap.push(newMapToken); // Add to state only when loaded
                renderTokenList(); // Update the list now that the token is added
                requestRender(); // Use the new render loop
            };
            img.src = newMapToken.imgSrc;
        }
    });

    // --- Functions ---

    const renderTokenList = () => {
        onMapTokenList.innerHTML = '<h4>Tokens on Map</h4>'; // Clear existing list but keep header

        state.tokensOnMap.forEach(token => {
            const item = document.createElement('div');
            item.className = 'on-map-token-item';
            item.dataset.instanceId = token.instanceId;

            const img = document.createElement('img');
            img.src = token.imgSrc;
            item.appendChild(img);

            const info = document.createElement('div');
            info.className = 'info';
            const posLabel = document.createElement('span');
            posLabel.textContent = 'Pos: ';
            const uInput = document.createElement('input');
            uInput.type = 'number';
            uInput.value = token.u.toFixed(2);
            uInput.step = 0.01;
            uInput.style.width = "50px";
            uInput.addEventListener('input', (e) => {
                const targetToken = state.tokensOnMap.find(t => t.instanceId === token.instanceId);
                if (targetToken) {
                    targetToken.u = parseFloat(e.target.value);
                    requestRender();
                }
            });
            const vInput = document.createElement('input');
            vInput.type = 'number';
            vInput.value = token.v.toFixed(2);
            vInput.step = 0.01;
            vInput.style.width = "50px";
            vInput.addEventListener('input', (e) => {
                const targetToken = state.tokensOnMap.find(t => t.instanceId === token.instanceId);
                if (targetToken) {
                    targetToken.v = parseFloat(e.target.value);
                    requestRender();
                }
            });

            const posContainer = document.createElement('div');
            posContainer.appendChild(posLabel);
            posContainer.appendChild(uInput);
            posContainer.appendChild(vInput);

             const dims = document.createElement('span');
            dims.textContent = `Size: ${token.width}x${token.length}x${token.height}`;
            const alt = document.createElement('span');
            alt.textContent = `Ele:`;
            const altInput = document.createElement('input');
            altInput.type = 'number';
            altInput.value = token.altitude;
            altInput.style.width = "50px";
            altInput.title = "Elevation";
            altInput.dataset.instanceId = token.instanceId;
            altInput.addEventListener('input', (e) => {
                 const targetToken = state.tokensOnMap.find(t => t.instanceId === e.target.dataset.instanceId);
                 if (targetToken) {
                    targetToken.altitude = parseInt(e.target.value, 10);
                    requestRender();
                 }
            });

            info.appendChild(posContainer);
            info.appendChild(dims);
            const altContainer = document.createElement('div');
            altContainer.style.display = 'flex';
            altContainer.style.alignItems = 'center';
            altContainer.appendChild(alt);
            altContainer.appendChild(altInput);
            info.appendChild(altContainer);
            item.appendChild(info);

             const controls = document.createElement('div');
             controls.className = 'on-map-token-controls';

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.dataset.instanceId = token.instanceId;
            editButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the item click event
                const instanceId = e.target.dataset.instanceId;
                const tokenToEdit = state.tokensOnMap.find(t => t.instanceId === instanceId);
                if (tokenToEdit) {
                    enterEditMode(tokenToEdit, 'map');
                }
            });
            controls.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.dataset.instanceId = token.instanceId;
            deleteButton.style.backgroundColor = '#ff6b6b';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the item click event
                const instanceId = e.target.dataset.instanceId;
                state.tokensOnMap = state.tokensOnMap.filter(t => t.instanceId !== instanceId);
                if (state.selectedTokenInstanceId === instanceId) {
                    state.selectedTokenInstanceId = null;
                    updateSelectedTokenUI();
                }
                requestRender();
                renderTokenList(); // Re-render the list itself
            });
            controls.appendChild(deleteButton);


            item.appendChild(controls);


            onMapTokenList.appendChild(item);
        });
    };

    const snapTokenToGrid = (token) => {
        const increment = parseInt(mapIncrementInput.value, 10) || 1;

        // The token's position (u, v) is its top-left corner.
        // We want to snap its center.
        const logicalWidth = token.width / state.mapWidth;
        const logicalLength = token.length / state.mapLength;
        const centerX = token.u + logicalWidth / 2;
        const centerY = token.v + logicalLength / 2;

        // Calculate how many 'increments' fit into the total map dimension
        const numWidthSteps = state.mapWidth / increment;
        const numLengthSteps = state.mapLength / increment;

        // Find the nearest grid line for the center
        const snappedCenterX = (Math.round(centerX * numWidthSteps) / numWidthSteps);
        const snappedCenterY = (Math.round(centerY * numLengthSteps) / numLengthSteps);

        // Convert the snapped center back to a top-left position
        token.u = snappedCenterX - logicalWidth / 2;
        token.v = snappedCenterY - logicalLength / 2;
    };

    const updateSelectedTokenUI = () => {
        const token = state.tokensOnMap.find(t => t.instanceId === state.selectedTokenInstanceId);
        if (token) {
            selectedTokenControls.style.display = 'block';
            const currentAltitude = token.altitude || 0;
            tokenAltitudeSlider.value = currentAltitude;
            altitudeValueSpan.textContent = currentAltitude;
        } else {
            selectedTokenControls.style.display = 'none';
        }
    };

    canvas.addEventListener('mousedown', (e) => {
        const rect = mapContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find the token that is visually "on top" (higher v value)
        const clickedToken = [...state.tokensOnMap]
            .sort((a, b) => b.v - a.v) // sort descending by v (front-most)
            .find(token => {
                const bounds = getTokenScreenRect(token);
                if (!bounds) return false;
                // Check if the click is within the token's VISIBLE bounding box
                return x >= bounds.x && x <= bounds.x + bounds.width &&
                       y >= bounds.y && y <= bounds.y + bounds.height;
            });

        if (clickedToken) {
            state.draggingTokenInstanceId = clickedToken.instanceId;
            state.selectedTokenInstanceId = clickedToken.instanceId;

            // Calculate the token's base center in canvas coordinates.
            const logicalWidth = clickedToken.width / state.mapWidth;
            const logicalLength = clickedToken.length / state.mapLength;
            const perspectiveFactor = 1 + (state.handleTLPos.y / canvas.height) * 4;
            // To get the v for the center, we need to convert from true v to screen v
            const true_v_center = clickedToken.v + logicalLength / 2;
            const screen_v_center = Math.pow(true_v_center, perspectiveFactor);
            const u_center = clickedToken.u + logicalWidth / 2;
            const centerBasePoint = gridToCanvasCoords(u_center, screen_v_center);

            // Calculate and store the pixel offset from the click to the base center.
            state.pixelDragOffset = {
                x: x - centerBasePoint.x,
                y: y - centerBasePoint.y
            };

            mapContainer.style.cursor = 'grabbing';
        } else {
            state.selectedTokenInstanceId = null;
        }
        updateSelectedTokenUI();
        requestRender();
    });

    tokenAltitudeSlider.addEventListener('input', (e) => {
        if (!state.selectedTokenInstanceId) return;
        const token = state.tokensOnMap.find(t => t.instanceId === state.selectedTokenInstanceId);
        if (token) {
            token.altitude = parseInt(e.target.value, 10);
            altitudeValueSpan.textContent = token.altitude;
            requestRender();
        }
    });

    // --- Session Management Functions ---
    const getAppState = () => {
        // We can't save the actual `img` objects, so we just save their src
        const simplifiedTokensOnMap = state.tokensOnMap.map(t => {
            const { img, ...rest } = t; // Exclude the img object
            return rest;
        });

        return {
            bgImageIsAnimated: state.bgImageIsAnimated,
            gridOpacity: state.gridOpacity,
            mapWidth: state.mapWidth,
            mapLength: state.mapLength,
            mapUnits: mapUnitsSelect.value,
            handleTLPos: state.handleTLPos,
            handleTRPos: state.handleTRPos,
            tokensInLibrary: state.tokensInLibrary,
            tokensOnMap: simplifiedTokensOnMap,
            bgImage: mapContainer.style.backgroundImage,
            nextTokenId: nextTokenId,
            nextTokenInstanceId: state.nextTokenInstanceId,
        };
    };

    const loadAppState = (savedState) => {
        return new Promise((resolve) => {
            newSessionBtn.click(); // Reset current state

            // Immediately load non-async data
            mapWidthInput.value = savedState.mapWidth || 30;
            mapLengthInput.value = savedState.mapLength || 20;
            mapUnitsSelect.value = savedState.mapUnits || 'ft';
            state.gridOpacity = savedState.gridOpacity || 0.5;
            gridOpacitySlider.value = state.gridOpacity;
            gridOpacityValue.textContent = state.gridOpacity;
            state.tokensInLibrary = savedState.tokensInLibrary || [];
            nextTokenId = savedState.nextTokenId || 0;
            state.nextTokenInstanceId = savedState.nextTokenInstanceId || 0;
            renderLibrary();

            // --- Promise-based Loading ---

            // 1. Promise for background image loading and canvas resizing
            const bgPromise = new Promise(bgResolve => {
                mapContainer.style.backgroundImage = savedState.bgImage || '';
                state.bgImageIsAnimated = savedState.bgImageIsAnimated || false;
                const bgUrlMatch = (savedState.bgImage || '').match(/url\("?(.*?)"?\)/);
                if (bgUrlMatch) {
                    const img = new Image();
                    img.onload = () => {
                        const containerMaxWidth = mapContainer.parentElement.clientWidth;
                        const scale = Math.min(1, containerMaxWidth / img.width);
                        mapContainer.style.width = `${img.width * scale}px`;
                        mapContainer.style.height = `${img.height * scale}px`;
                        resizeCanvas(); // This calls resetHandles(), which is why we apply loaded handles later
                        bgResolve();
                    };
                    img.onerror = () => {
                        console.error("Failed to load background image:", bgUrlMatch[1]);
                        resizeCanvas(); // Still resize canvas to default
                        bgResolve();
                    };
                    img.src = bgUrlMatch[1];
                } else {
                    resizeCanvas(); // Resize even if there's no background image
                    bgResolve();
                }
            });

            // 2. Promises for loading token images
            state.tokensOnMap = savedState.tokensOnMap || [];
            const imageLoadPromises = state.tokensOnMap.map(token => {
                return new Promise((imgResolve) => {
                    if (token.imgSrc) {
                        const img = new Image();
                        img.onload = () => {
                            token.img = img;
                            imgResolve();
                        };
                        img.onerror = () => {
                            console.error("Failed to load token image:", token.imgSrc);
                            imgResolve(); // Resolve anyway to not block rendering
                        };
                        img.src = token.imgSrc;
                    } else {
                        imgResolve(); // Resolve if there's no image src
                    }
                });
            });

            // 3. Wait for all assets to load, then apply final state
            Promise.all([bgPromise, ...imageLoadPromises]).then(() => {
                // Now that canvas is sized correctly, apply the handle positions
                state.handleTLPos = savedState.handleTLPos || { x: 0, y: 0 };
                // Default to the *current* canvas width if not in save state
                state.handleTRPos = savedState.handleTRPos || { x: canvas.width, y: 0 };

                updateHandles();
                updateGridSettings();
                checkViewMode();
                renderTokenList(); // Render the list once after loading
                requestRender();   // Start the render loop
                resolve();
            });
        });
    };

    const populateSessionSelector = () => {
        sessionSelect.innerHTML = '';
        const sessions = Object.keys(localStorage).filter(k => k.startsWith('ttrpg-map-session-'));
        sessions.forEach(sessionKey => {
            const option = document.createElement('option');
            option.value = sessionKey;
            option.textContent = sessionKey.replace('ttrpg-map-session-', '');
            sessionSelect.appendChild(option);
        });
    };

    // --- Session Event Listeners ---
    saveSessionBtn.addEventListener('click', () => {
        const name = sessionNameInput.value.trim();
        if (!name) {
            alert('Please enter a name for the session.');
            return;
        }
        const sessionKey = `ttrpg-map-session-${name}`;
        if (localStorage.getItem(sessionKey)) {
            if (!confirm(`A session named "${name}" already exists. Overwrite it?`)) {
                return;
            }
        }
        localStorage.setItem(sessionKey, JSON.stringify(getAppState()));
        sessionNameInput.value = '';
        populateSessionSelector();
        // Select the newly saved session
        sessionSelect.value = sessionKey;
    });

    updateSessionBtn.addEventListener('click', () => {
        const sessionKey = sessionSelect.value;
        if (!sessionKey) {
            alert('Please select a session to update.');
            return;
        }
        const name = sessionKey.replace('ttrpg-map-session-', '');
        if (!confirm(`Are you sure you want to overwrite the session "${name}" with the current state?`)) {
            return;
        }
        localStorage.setItem(sessionKey, JSON.stringify(getAppState()));
        alert(`Session "${name}" updated successfully.`);
    });

    loadSessionBtn.addEventListener('click', () => {
        const sessionKey = sessionSelect.value;
        if (!sessionKey) {
            alert('Please select a session to load.');
            return;
        }
        try {
            const savedState = JSON.parse(localStorage.getItem(sessionKey));
            if (savedState) {
                loadAppState(savedState);
            } else {
                alert('Error: Could not load session data.');
            }
        } catch (e) {
            alert('Error: Failed to parse session data. It might be corrupted.');
            console.error(e);
        }
    });

    deleteSessionBtn.addEventListener('click', () => {
        const sessionKey = sessionSelect.value;
        if (!sessionKey || !confirm(`Are you sure you want to delete the session "${sessionKey.replace('ttrpg-map-session-', '')}"?`)) {
            return;
        }
        localStorage.removeItem(sessionKey);
        populateSessionSelector();
    });

    newSessionBtn.addEventListener('click', () => {
        state.tokensOnMap = [];
        state.tokensInLibrary = [];
        state.selectedTokenInstanceId = null;
        state.nextTokenInstanceId = 0;
        nextTokenId = 0;
        renderLibrary();
        renderTokenList();
        exitEditMode();
        mapContainer.style.backgroundImage = '';
        state.bgImageIsAnimated = false;
        sessionNameInput.value = '';
        gridOpacitySlider.value = 0.5;
        gridOpacityValue.textContent = '0.5';
        state.gridOpacity = 0.5;
        resetHandles();
        checkViewMode();
        updateGridSettings();
        requestRender();
    });

    gridOpacitySlider.addEventListener('input', (e) => {
        const opacity = parseFloat(e.target.value);
        state.gridOpacity = opacity;
        gridOpacityValue.textContent = opacity.toFixed(2);
        requestRender();
    });

    // --- Animation Loop ---
    const hasAnimatedElements = () => {
        if (state.bgImageIsAnimated) return true;
        return state.tokensOnMap.some(t => t.isAnimated);
    };

    const animationLoop = () => {
        render();
        // Keep the loop going only if there are animated elements to draw
        if (hasAnimatedElements()) {
            state.animationFrameId = requestAnimationFrame(animationLoop);
        } else {
            state.animationFrameId = null; // Stop the loop
        }
    };

    const requestRender = () => {
        // If the animation loop isn't running, start it.
        // Otherwise, it will just continue on its own.
        if (!state.animationFrameId) {
            state.animationFrameId = requestAnimationFrame(animationLoop);
        }
    };


    // --- Initial Setup ---
    resizeCanvas();
    updateGridSettings();
    tokenUnitsSpan.textContent = mapUnitsSelect.value;
    gridOpacityValue.textContent = gridOpacitySlider.value;
    state.gridOpacity = parseFloat(gridOpacitySlider.value);
    populateSessionSelector();
    renderTokenList();
    requestRender(); // Initial render

    // Expose for debugging/testing
    window.state = state;
    window.render = requestRender; // Expose the new render request function
});