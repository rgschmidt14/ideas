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
        tokensInLibrary: [],
        tokensOnMap: [],
        selectedTokenInstanceId: null,
        draggingTokenInstanceId: null,
        dragOffset: { u: 0, v: 0 },
    };
    let nextTokenInstanceId = 0;

    // --- Main Render Function ---
    const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawTokens();
        drawSelectionOutline();
    };

    // --- Drawing Functions ---
    const drawGrid = () => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;

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
            for (let i = 1; i < mapWidth; i++) {
                const u = i / mapWidth;
                const p1 = gridToCanvasCoords(u, 0);
                const p2 = gridToCanvasCoords(u, 1);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
            for (let i = 1; i < mapLength; i++) {
                const v = i / mapLength;
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
            if (!token.img) continue;

            const logicalWidth = token.width / state.mapWidth;
            const logicalLength = token.length / state.mapLength;
            const altitude = token.altitude || 0;

            if (state.viewMode === 'top-down') {
                const p = gridToCanvasCoords(token.u, token.v);
                const w = (canvas.width / state.mapWidth) * token.width;
                const h = (canvas.height / state.mapLength) * token.length;
                ctx.drawImage(token.img, p.x, p.y, w, h);
            } else { // Perspective
                // 1. Draw shadow
                const p1 = gridToCanvasCoords(token.u, token.v);
                const p2 = gridToCanvasCoords(token.u + logicalWidth, token.v);
                const p3 = gridToCanvasCoords(token.u + logicalWidth, token.v + logicalLength);
                const p4 = gridToCanvasCoords(token.u, token.v + logicalLength);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.lineTo(p4.x, p4.y);
                ctx.closePath();
                ctx.fill();

                // 2. Draw token image
                const pBottomCenter = gridToCanvasCoords(token.u + logicalWidth / 2, token.v + logicalLength);
                const pTopCenter = gridToCanvasCoords(token.u + logicalWidth / 2, token.v);

                const perspectiveHeight = pBottomCenter.y - pTopCenter.y;
                const scaleFactor = perspectiveHeight / logicalLength / canvas.height;

                const imgHeight = (token.height / state.mapLength) * canvas.height * scaleFactor;
                const imgWidth = (imgHeight / token.img.height) * token.img.width;

                const altitudeOffset = (token.altitude / state.mapLength) * canvas.height * scaleFactor;

                ctx.drawImage(
                    token.img,
                    pBottomCenter.x - imgWidth / 2,
                    pBottomCenter.y - imgHeight - altitudeOffset,
                    imgWidth,
                    imgHeight
                );
            }
        }
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

    // Inverse of the above. Not a perfect inverse, but a good approximation.
    const canvasToGridCoords = (x, y) => {
        const { handleTLPos, handleTRPos } = state;
        const bl = { x: 0, y: canvas.height };
        const br = { x: canvas.width, y: canvas.height };

        // Approximate v (vertical position)
        const leftY = handleTLPos.y + (bl.y - handleTLPos.y - (handleTLPos.y - handleTRPos.y) * (x / canvas.width));
        const rightY = handleTRPos.y + (br.y - handleTRPos.y);
        const yAtX = leftY + (rightY - leftY) * (x / canvas.width);
        const v = y / yAtX;

        // Approximate u (horizontal position)
        const topX = handleTLPos.x + (handleTRPos.x - handleTLPos.x) * v;
        const botX = bl.x + (br.x - bl.x) * v;
        const u = (x - topX) / (botX - topX);

        return { u: Math.max(0, Math.min(1, u)), v: Math.max(0, Math.min(1, v)) };
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
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Clamp coordinates to stay within canvas bounds
            const clampedX = Math.max(0, Math.min(x, rect.width));
            const clampedY = Math.max(0, Math.min(y, rect.height));

            if (state.draggingHandle.id === 'handle-tl') {
                state.handleTLPos.x = clampedX;
                state.handleTLPos.y = clampedY;
            } else {
                state.handleTRPos.x = clampedX;
                state.handleTRPos.y = clampedY;
            }

            checkViewMode();
            updateHandles();
            drawGrid();
        } else if (state.draggingTokenInstanceId) {
            const token = state.tokensOnMap.find(t => t.instanceId === state.draggingTokenInstanceId);
            if (!token) return;

            const rect = mapContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const { u, v } = canvasToGridCoords(x, y);
            token.u = u - state.dragOffset.u;
            token.v = v - state.dragOffset.v;

            render();
        }
    });

    document.addEventListener('mouseup', () => {
        if (state.draggingHandle) {
            state.draggingHandle = null;
            mapContainer.style.cursor = 'default';
        } else if (state.draggingTokenInstanceId) {
            const token = state.tokensOnMap.find(t => t.instanceId === state.draggingTokenInstanceId);
            if (token) {
                snapTokenToGrid(token);
            }
            state.draggingTokenInstanceId = null;
            mapContainer.style.cursor = 'default';
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

    // --- Functions ---
    const updateSelectedTokenUI = () => {
        const token = state.tokensOnMap.find(t => t.instanceId === state.selectedTokenInstanceId);
        if (token && state.viewMode === 'perspective') {
            selectedTokenControls.style.display = 'block';
            const currentAltitude = token.altitude || 0;
            tokenAltitudeSlider.value = currentAltitude;
            altitudeValueSpan.textContent = currentAltitude;
        } else {
            selectedTokenControls.style.display = 'none';
        }
    };

    // --- Event Listeners ---
    const snapTokenToGrid = (token) => {
        const snappedU = Math.round(token.u * state.mapWidth) / state.mapWidth;
        const snappedV = Math.round(token.v * state.mapLength) / state.mapLength;
        token.u = snappedU;
        token.v = snappedV;
    };

    canvas.addEventListener('mousedown', (e) => {
        const rect = mapContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const { u, v } = canvasToGridCoords(x, y);

        const clickedToken = [...state.tokensOnMap]
            .reverse()
            .find(token => {
                const logicalWidth = token.width / state.mapWidth;
                const logicalLength = token.length / state.mapLength;
                return u >= token.u && u <= token.u + logicalWidth &&
                       v >= token.v && v <= token.v + logicalLength;
            });

        if (clickedToken) {
            state.draggingTokenInstanceId = clickedToken.instanceId;
            state.selectedTokenInstanceId = clickedToken.instanceId;
            state.dragOffset = {
                u: u - clickedToken.u,
                v: v - clickedToken.v
            };
            mapContainer.style.cursor = 'grabbing';
        } else {
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
});