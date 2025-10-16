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
    const handleTL = document.getElementById('handle-tl');
    const handleTR = document.getElementById('handle-tr');

    // --- Application State ---
    const state = {
        viewMode: 'top-down', // 'top-down' or 'perspective'
        mapWidth: 30,
        mapLength: 20,
        handleTLPos: { x: 0, y: 0 },
        handleTRPos: { x: 0, y: 0 }, // x will be updated to canvas width on resize
        draggingHandle: null,
        draggingToken: null,
        tokensInLibrary: [],
        tokensOnMap: [],
        selectedTokenInstanceId: null,
    };
    window.state = state; // Expose for debugging/testing
    let nextTokenInstanceId = 0;

    // --- Main Render Function ---
    const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawTokens();
        drawSelectionOutline();
    };
    window.render = render; // Expose for debugging/testing

    // --- Drawing Functions ---
    const drawGrid = () => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.shadowColor = 'transparent'; // Reset shadow for grid lines
        ctx.shadowBlur = 0;

        if (state.viewMode === 'top-down') {
            const cellWidth = canvas.width / state.mapWidth;
            const cellHeight = canvas.height / state.mapLength;
            for (let i = 1; i < state.mapWidth; i++) {
                ctx.beginPath();
                ctx.moveTo(i * cellWidth, 0);
                ctx.lineTo(i * cellWidth, canvas.height);
                ctx.stroke();
            }
            for (let i = 1; i < state.mapLength; i++) {
                ctx.beginPath();
                ctx.moveTo(0, i * cellHeight);
                ctx.lineTo(canvas.width, i * cellHeight);
                ctx.stroke();
            }
        } else { // Perspective
            const { mapWidth, mapLength } = state;
            // Draw vertical grid lines
            for (let i = 1; i < mapWidth; i++) {
                const u = i / mapWidth;
                const p1 = gridToCanvasCoords(u, 0);
                const p2 = gridToCanvasCoords(u, 1);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
            // Draw horizontal grid lines
            for (let i = 1; i < mapLength; i++) {
                const v = i / mapLength;
                const p1 = gridToCanvasCoords(0, v);
                const p2 = gridToCanvasCoords(1, v);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }

            // Draw Horizon Line
            // The horizon is determined by the vertical position of the top handles.
            const horizonY = state.handleTLPos.y;
            if (horizonY > 0 && horizonY < canvas.height) { // Only draw if on-screen
                ctx.save();
                ctx.strokeStyle = 'cyan';
                ctx.lineWidth = 1;
                ctx.shadowColor = 'cyan';
                ctx.shadowBlur = 5;
                ctx.beginPath();
                ctx.moveTo(0, horizonY);
                ctx.lineTo(canvas.width, horizonY);
                ctx.stroke();
                ctx.restore();
            }
        }
    };

    const drawTokens = () => {
        state.tokensOnMap.sort((a, b) => a.v - b.v).forEach(token => {
            if (!token.img) return;

            const logicalWidth = token.width / state.mapWidth;
            const logicalLength = token.length / state.mapLength;
            const altitude = token.altitude || 0;

            if (state.viewMode === 'top-down') {
                const p = gridToCanvasCoords(token.u, token.v);
                const w = (canvas.width / state.mapWidth) * token.width;
                const h = (canvas.height / state.mapLength) * token.length;
                ctx.drawImage(token.img, p.x, p.y, w, h);
            } else { // Perspective
                // 1. Calculate corners for shadow and token base
                const p1 = gridToCanvasCoords(token.u, token.v);
                const p2 = gridToCanvasCoords(token.u + logicalWidth, token.v);
                const p3 = gridToCanvasCoords(token.u + logicalWidth, token.v + logicalLength);
                const p4 = gridToCanvasCoords(token.u, token.v + logicalLength);

                // 2. Draw shadow on the ground plane
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.lineTo(p4.x, p4.y);
                ctx.closePath();
                ctx.fill();

                // 3. Draw token image, potentially elevated
                const canvasTokenWidth = p2.x - p1.x;

                // Determine the scaling factor based on the token's depth (v coordinate).
                // A token's visual height on screen is dependent on its logical 'length'
                // and its position in the perspective grid.
                const p_v_start = gridToCanvasCoords(token.u, token.v);
                const p_v_end = gridToCanvasCoords(token.u, token.v + logicalLength);
                const perspectiveCellHeight = p_v_end.y - p_v_start.y;

                // The base height of a cell in the front row.
                const logicalPixelHeight = canvas.height / state.mapLength;

                // The scale is the ratio of the cell's perspective height to its base height.
                const scale = perspectiveCellHeight / (logicalPixelHeight * token.length);

                // The final image height is its logical height, adjusted by the perspective scale.
                const imgHeight = token.height * logicalPixelHeight * scale;
                const imgWidth = canvasTokenWidth;

                // Altitude is also scaled to ensure it looks correct in perspective.
                const verticalOffset = token.altitude * logicalPixelHeight * scale;

                // Draw the image anchored to its base, adjusted for altitude.
                ctx.drawImage(
                    token.img,
                    p1.x,
                    p4.y - imgHeight - verticalOffset,
                    imgWidth,
                    imgHeight
                );
            }
        });
    };

    const drawSelectionOutline = () => {
        if (!state.selectedTokenInstanceId) return;
        const token = state.tokensOnMap.find(t => t.instanceId === state.selectedTokenInstanceId);
        if (!token) return;

        const logicalWidth = token.width / state.mapWidth;
        const logicalLength = token.length / state.mapLength;

        const p1 = gridToCanvasCoords(token.u, token.v);
        const p2 = gridToCanvasCoords(token.u + logicalWidth, token.v);
        const p3 = gridToCanvasCoords(token.u + logicalWidth, token.v + logicalLength);
        const p4 = gridToCanvasCoords(token.u, token.v + logicalLength);

        ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.stroke();
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
        render();
    };

    const resizeCanvas = () => {
        const { width, height } = mapContainer.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;
        resetHandles();
        render();
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
        const botY = bl.y + (br.y - bl.y) * u;

        const x = topX + (botX - topX) * v;
        const y = topY + (botY - topY) * v;

        return { x, y };
    };

    // Inverse of gridToCanvasCoords. Approximates the logical (u, v) coordinates
    // from a pixel position on the canvas. This is key for interactivity.
    const canvasToGridCoords = (x, y) => {
        const { handleTLPos, handleTRPos } = state;
        const bl = { x: 0, y: canvas.height };
        const br = { x: canvas.width, y: canvas.height };

        // This is a simplified inverse transformation (bilinear interpolation).
        // It's not perfect, but works well for this application.

        // Approximate v (depth) by finding the proportional distance between the
        // top and bottom edges of the grid at the given canvas x-coordinate.
        const leftY = handleTLPos.y + (bl.y - handleTLPos.y - (handleTLPos.y - handleTRPos.y) * (x / canvas.width));
        const rightY = handleTRPos.y + (br.y - handleTRPos.y);
        const yAtX = leftY + (rightY - leftY) * (x / canvas.width);
        const v = y / yAtX;

        // Approximate u (horizontal) by finding the proportional distance between the
        // left and right edges of the grid at the calculated canvas y-coordinate (via v).
        const topX = handleTLPos.x + (handleTRPos.x - handleTLPos.x) * v;
        const botX = bl.x + (br.x - bl.x) * v;
        const u = (x - topX) / (botX - topX);

        // Allow dragging beyond the grid by not clamping the values
        return { u, v };
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

    document.addEventListener('mouseup', () => {
        // If we were dragging a handle, finalize the state and redraw
        if (state.draggingHandle) {
            state.draggingHandle = null;
            mapContainer.style.cursor = 'default';
            checkViewMode();
            render(); // Redraw the entire canvas once the drag is complete
        }
        // If we were dragging a token, release it
        if (state.draggingToken) {
            state.draggingToken = null;
            render();
        }
    });

    document.addEventListener('mousemove', (e) => {
        // Handle grid handle dragging
        if (state.draggingHandle) {
            const rect = mapContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const clampedX = Math.max(0, Math.min(x, rect.width));
            const clampedY = Math.max(0, Math.min(y, rect.height));

            if (state.draggingHandle.id === 'handle-tl') {
                state.handleTLPos.x = clampedX;
            } else {
                state.handleTRPos.x = clampedX;
            }
            state.handleTLPos.y = clampedY;
            state.handleTRPos.y = clampedY;
            updateHandles();
        }

        // Handle token dragging
        if (state.draggingToken) {
            const rect = mapContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const { u, v } = canvasToGridCoords(x, y);
            state.draggingToken.u = u;
            state.draggingToken.v = v;
            render(); // Re-render the scene as the token moves
        }
    });

    const resetTokenBtn = document.getElementById('reset-token-btn');
    resetTokenBtn.addEventListener('click', () => {
        if (!state.selectedTokenInstanceId) return;
        const token = state.tokensOnMap.find(t => t.instanceId === state.selectedTokenInstanceId);
        if (token) {
            // Reset position to the center of the front row
            token.u = 0.5 - (token.width / state.mapWidth / 2);
            token.v = 1.0 - (token.length / state.mapLength);
            token.altitude = 0;
            updateSelectedTokenUI();
            render();
        }
    });

    bgImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
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
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    [mapWidthInput, mapLengthInput, mapUnitsSelect].forEach(el => {
        el.addEventListener('change', updateGridSettings);
    });

    const tokenImageInput = document.getElementById('token-image-input');
    const tokenWidthInput = document.getElementById('token-width');
    const tokenLengthInput = document.getElementById('token-length');
    const tokenHeightInput = document.getElementById('token-height');
    const addTokenBtn = document.getElementById('add-token-btn');
    const tokenLibrary = document.getElementById('token-library');
    const tokenUnitsSpan = document.getElementById('token-units');
    let selectedTokenImage = null;
    let nextTokenId = 0;

    const addTokenToLibrary = () => {
        if (!selectedTokenImage) {
            alert('Please select a token image first.');
            return;
        }

        const newId = `lib-token-${nextTokenId++}`;
        const newToken = {
            id: newId,
            imgSrc: selectedTokenImage.src,
            width: parseInt(tokenWidthInput.value, 10) || 1,
            length: parseInt(tokenLengthInput.value, 10) || 1,
            height: parseInt(tokenHeightInput.value, 10) || 0,
        };

        state.tokensInLibrary.push(newToken);

        const tokenElement = document.createElement('div');
        tokenElement.id = newId;
        tokenElement.className = 'token-in-library';
        tokenElement.style.backgroundImage = `url(${newToken.imgSrc})`;
        tokenElement.draggable = true;
        tokenElement.dataset.tokenId = newId;

        tokenLibrary.appendChild(tokenElement);

        tokenImageInput.value = '';
        selectedTokenImage = null;
    };

    tokenImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedTokenImage = { src: e.target.result };
            };
            reader.readAsDataURL(file);
        }
    });

    addTokenBtn.addEventListener('click', addTokenToLibrary);

    mapUnitsSelect.addEventListener('change', () => {
        tokenUnitsSpan.textContent = mapUnitsSelect.value;
    });

    tokenLibrary.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('token-in-library')) {
            e.dataTransfer.setData('text/plain', e.target.dataset.tokenId);
            e.dataTransfer.effectAllowed = 'copy';
        }
    });

    mapContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    mapContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const tokenId = e.dataTransfer.getData('text/plain');
        const originalToken = state.tokensInLibrary.find(t => t.id === tokenId);

        if (originalToken) {
            const rect = mapContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const { u, v } = canvasToGridCoords(x, y);

            const newMapToken = {
                ...originalToken,
                instanceId: `map-token-${nextTokenInstanceId++}`,
                u, // logical x (0-1)
                v, // logical y (0-1)
                img: null,
            };

            // Preload the image for rendering
            const img = new Image();
            img.onload = () => {
                newMapToken.img = img;
                render();
            };
            img.src = newMapToken.imgSrc;

            state.tokensOnMap.push(newMapToken);
            render();
        }
    });

    const selectedTokenControls = document.getElementById('selected-token-controls');
    const tokenAltitudeSlider = document.getElementById('token-altitude');
    const altitudeValueSpan = document.getElementById('altitude-value');
    const selectedTokenWidthInput = document.getElementById('selected-token-width');
    const selectedTokenLengthInput = document.getElementById('selected-token-length');
    const selectedTokenHeightInput = document.getElementById('selected-token-height');
    const selectedTokenUnitsSpan = document.getElementById('selected-token-units');


    // --- Functions ---
    const updateSelectedTokenUI = () => {
        const token = state.tokensOnMap.find(t => t.instanceId === state.selectedTokenInstanceId);
        if (token) {
            selectedTokenControls.style.display = 'block';
            const currentAltitude = token.altitude || 0;
            tokenAltitudeSlider.value = currentAltitude;
            altitudeValueSpan.textContent = currentAltitude;

            selectedTokenWidthInput.value = token.width;
            selectedTokenLengthInput.value = token.length;
            selectedTokenHeightInput.value = token.height;
            selectedTokenUnitsSpan.textContent = mapUnitsSelect.value;
        } else {
            selectedTokenControls.style.display = 'none';
        }
    };

    const setupSelectedTokenListeners = () => {
        const inputs = [selectedTokenWidthInput, selectedTokenLengthInput, selectedTokenHeightInput];
        const properties = ['width', 'length', 'height'];

        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (!state.selectedTokenInstanceId) return;
                const token = state.tokensOnMap.find(t => t.instanceId === state.selectedTokenInstanceId);
                if (token) {
                    token[properties[index]] = parseInt(e.target.value, 10) || 1;
                    render();
                }
            });
        });
    };

    // --- Event Listeners ---
    canvas.addEventListener('mousedown', (e) => {
        const rect = mapContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const { u, v } = canvasToGridCoords(x, y);

        // Find the topmost token at the clicked location to start dragging
        const clickedToken = [...state.tokensOnMap]
            .reverse() // search from top-most rendered token
            .find(token => {
                const logicalWidth = token.width / state.mapWidth;
                const logicalLength = token.length / state.mapLength;
                return u >= token.u && u <= token.u + logicalWidth &&
                       v >= token.v && v <= token.v + logicalLength;
            });

        if (clickedToken) {
            state.draggingToken = clickedToken;
            // Also select it
            state.selectedTokenInstanceId = clickedToken.instanceId;
        } else {
            // If no token is clicked, deselect any currently selected token
            state.selectedTokenInstanceId = null;
        }
        updateSelectedTokenUI();
        render();
    });

    tokenAltitudeSlider.addEventListener('input', (e) => {
        if (!state.selectedTokenInstanceId) return;
        const token = state.tokensOnMap.find(t => t.instanceId === state.selectedTokenInstanceId);
        if (token) {
            token.altitude = parseInt(e.target.value, 10);
            altitudeValueSpan.textContent = token.altitude;
            render();
        }
    });

    const sessionSelect = document.getElementById('session-select');
    const sessionNameInput = document.getElementById('session-name-input');
    const saveSessionBtn = document.getElementById('save-session-btn');
    const loadSessionBtn = document.getElementById('load-session-btn');
    const deleteSessionBtn = document.getElementById('delete-session-btn');
    const newSessionBtn = document.getElementById('new-session-btn');

    // --- Session Management Functions ---
    const getAppState = () => {
        // We can't save the actual `img` objects, so we just save their src
        const simplifiedTokensOnMap = state.tokensOnMap.map(t => ({...t, img: undefined, imgSrc: t.img.src}));

        return {
            mapWidth: state.mapWidth,
            mapLength: state.mapLength,
            mapUnits: mapUnitsSelect.value,
            handleTLPos: state.handleTLPos,
            handleTRPos: state.handleTRPos,
            tokensInLibrary: state.tokensInLibrary,
            tokensOnMap: simplifiedTokensOnMap,
            bgImage: mapContainer.style.backgroundImage,
        };
    };

    const loadAppState = (savedState) => {
        // Reset current state
        newSessionBtn.click();

        mapWidthInput.value = savedState.mapWidth;
        mapLengthInput.value = savedState.mapLength;
        mapUnitsSelect.value = savedState.mapUnits;
        state.handleTLPos = savedState.handleTLPos;
        state.handleTRPos = savedState.handleTRPos;
        state.tokensInLibrary = savedState.tokensInLibrary || [];

        mapContainer.style.backgroundImage = savedState.bgImage;

        // Re-populate library visuals
        tokenLibrary.innerHTML = '<h4>Token Library (Drag to Map)</h4>';
        state.tokensInLibrary.forEach(token => {
            const tokenElement = document.createElement('div');
            tokenElement.id = token.id;
            tokenElement.className = 'token-in-library';
            tokenElement.style.backgroundImage = `url(${token.imgSrc})`;
            tokenElement.draggable = true;
            tokenElement.dataset.tokenId = token.id;
            tokenLibrary.appendChild(tokenElement);
        });

        // Re-create tokens on map and preload their images
        state.tokensOnMap = savedState.tokensOnMap || [];
        state.tokensOnMap.forEach(token => {
            const img = new Image();
            img.onload = () => {
                token.img = img;
                render();
            };
            img.src = token.imgSrc;
        });

        updateHandles();
        updateGridSettings();
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
        localStorage.setItem(sessionKey, JSON.stringify(getAppState()));
        sessionNameInput.value = '';
        populateSessionSelector();
    });

    loadSessionBtn.addEventListener('click', () => {
        const sessionKey = sessionSelect.value;
        if (!sessionKey) {
            alert('Please select a session to load.');
            return;
        }
        const savedState = JSON.parse(localStorage.getItem(sessionKey));
        loadAppState(savedState);
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
        tokenLibrary.innerHTML = '<h4>Token Library (Drag to Map)</h4>';
        mapContainer.style.backgroundImage = '';
        sessionNameInput.value = '';
        resetHandles();
        updateGridSettings();
    });

    // --- Initial Setup ---
    resizeCanvas();
    updateGridSettings();
    tokenUnitsSpan.textContent = mapUnitsSelect.value;
    populateSessionSelector();
    setupSelectedTokenListeners();
});