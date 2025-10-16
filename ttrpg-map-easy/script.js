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
        renderTokenList();
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
            if (!token.img || !token.img.complete) continue;

            const logicalWidth = token.width / state.mapWidth;
            const logicalLength = token.length / state.mapLength;

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

                // 2. Draw token image, standing straight up
                const pBottomCenter = gridToCanvasCoords(token.u + logicalWidth / 2, token.v + logicalLength);
                const pTopCenter = gridToCanvasCoords(token.u + logicalWidth / 2, token.v);

                const perspectiveHeight = pBottomCenter.y - pTopCenter.y;
                const vMid = token.v + logicalLength / 2;
                const scaleFactor = 1 / (1 - getVanishPoint().v_frac * vMid);

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
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
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
           const v = (y - vp.y) / (canvas.height - vp.y);
           return { u, v };
        }

        const v = (y - vp.y) / (canvas.height - vp.y);

        // Now find u. The horizontal line at y corresponds to a single v value.
        const p1 = gridToCanvasCoords(0, v);
        const p2 = gridToCanvasCoords(1, v);

        // Avoid division by zero if the line is vertical
        if (Math.abs(p2.x - p1.x) < 1) {
            return { u: 0.5, v }; // Best guess at the center
        }

        // u is the fractional distance of x between p1.x and p2.x
        const u = (x - p1.x) / (p2.x - p1.x);

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
                    render();
                    isThrottled = false;
                }, 1000 / 30); // throttle to 30fps
            }

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

    onMapTokenList.addEventListener('click', (e) => {
        const item = e.target.closest('.on-map-token-item');
        if (!item) return;

        const { instanceId } = item.dataset;
        state.selectedTokenInstanceId = instanceId;
        render(); // Re-render to show canvas selection outline immediately

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
            render(); // Final render after dragging handle
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

            const { u, v } = canvasToGridCoords(x, y);

            const newMapToken = {
                ...originalToken,
                instanceId: `map-token-${nextTokenInstanceId++}`,
                u, // logical x (0-1)
                v, // logical y (0-1)
                altitude: 0,
                img: null,
            };

            // Preload the image for rendering
            const img = new Image();
            img.onload = () => {
                newMapToken.img = img;
                render(); // Render only after image is loaded
            };
            img.src = newMapToken.imgSrc;

            state.tokensOnMap.push(newMapToken);
        }
    });

    const selectedTokenControls = document.getElementById('selected-token-controls');
    const tokenAltitudeSlider = document.getElementById('token-altitude');
    const altitudeValueSpan = document.getElementById('altitude-value');
    const onMapTokenList = document.getElementById('on-map-token-list');

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
            const pos = document.createElement('span');
            pos.textContent = `Pos: (${token.u.toFixed(2)}, ${token.v.toFixed(2)})`;
            const alt = document.createElement('span');
            alt.textContent = `Alt: ${token.altitude}`;
            info.appendChild(pos);
            info.appendChild(alt);
            item.appendChild(info);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = 0;
            slider.max = 100;
            slider.value = token.altitude;
            slider.dataset.instanceId = token.instanceId;
            slider.addEventListener('input', (e) => {
                const targetToken = state.tokensOnMap.find(t => t.instanceId === e.target.dataset.instanceId);
                if (targetToken) {
                    targetToken.altitude = parseInt(e.target.value, 10);
                    alt.textContent = `Alt: ${targetToken.altitude}`;
                    render();
                }
            });
            item.appendChild(slider);

            onMapTokenList.appendChild(item);
        });
    };

    const snapTokenToGrid = (token) => {
        // Snap the token's center to the nearest grid intersection
        const snappedU = (Math.round(token.u * state.mapWidth) / state.mapWidth);
        const snappedV = (Math.round(token.v * state.mapLength) / state.mapLength);
        token.u = snappedU;
        token.v = snappedV;
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
        let { u, v } = canvasToGridCoords(x, y);

        // Find the token that is visually "on top" (higher v value)
        const clickedToken = [...state.tokensOnMap]
            .sort((a, b) => b.v - a.v) // sort descending by v
            .find(token => {
                const logicalWidth = token.width / state.mapWidth;
                const logicalLength = token.length / state.mapLength;
                // Check if the click is within the token's bounding box in grid coordinates
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
        const simplifiedTokensOnMap = state.tokensOnMap.map(t => {
            const tokenCopy = {...t};
            if (tokenCopy.img) {
                tokenCopy.imgSrc = tokenCopy.img.src;
            }
            delete tokenCopy.img;
            return tokenCopy;
        });

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
        return new Promise((resolve) => {
            newSessionBtn.click();

            mapWidthInput.value = savedState.mapWidth || 30;
            mapLengthInput.value = savedState.mapLength || 20;
            mapUnitsSelect.value = savedState.mapUnits || 'ft';
            state.handleTLPos = savedState.handleTLPos;
            state.handleTRPos = savedState.handleTRPos;
            state.tokensInLibrary = savedState.tokensInLibrary || [];

            mapContainer.style.backgroundImage = savedState.bgImage || '';
            const bgUrlMatch = (savedState.bgImage || '').match(/url\("?(.*?)"?\)/);
            if (bgUrlMatch) {
                 const img = new Image();
                 img.onload = () => {
                    const containerMaxWidth = mapContainer.parentElement.clientWidth;
                    const scale = Math.min(1, containerMaxWidth / img.width);
                    mapContainer.style.width = `${img.width * scale}px`;
                    mapContainer.style.height = `${img.height * scale}px`;
                    resizeCanvas();
                 };
                 img.src = bgUrlMatch[1];
            } else {
                 resizeCanvas();
            }


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
                        imgResolve();
                    }
                });
            });

            Promise.all(imageLoadPromises).then(() => {
                updateHandles();
                updateGridSettings();
                checkViewMode();
                render();
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
        nextTokenInstanceId = 0;
        nextTokenId = 0;
        tokenLibrary.innerHTML = '<h4>Token Library (Drag to Map)</h4>';
        mapContainer.style.backgroundImage = '';
        sessionNameInput.value = '';
        resetHandles();
        checkViewMode();
        updateGridSettings();
    });

    // --- Initial Setup ---
    resizeCanvas();
    updateGridSettings();
    tokenUnitsSpan.textContent = mapUnitsSelect.value;
    populateSessionSelector();
});