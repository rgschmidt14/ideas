<!DOCTYPE html>
<html lang="en">
<?php $currentFilename = ucwords(str_replace("_"," ", pathinfo(basename(__FILE__), PATHINFO_FILENAME)));?>
<head>
    <!-- Meta Tags -->
    <?php require_once $_SERVER['DOCUMENT_ROOT'] . '/snippets/html/meta_tags.php' ?>
    <!-- Descriptions -->
    <?php require_once $_SERVER['DOCUMENT_ROOT'] . '/snippets/html/title.php' ?>
    <?php require_once $_SERVER['DOCUMENT_ROOT'] . '/snippets/html/icon_link.php' ?>
    <!-- Fonts -->
    <?php require_once $_SERVER['DOCUMENT_ROOT'] . '/snippets/html/fonts.php' ?>
    <!-- CSS -->
    <style><?php require_once $_SERVER['DOCUMENT_ROOT'] . '/styles/every_page.css'; ?>'</style>
    <style>
    
    /* Main container */
    .graph-container {
        display: flex;
        align-items: stretch;
        width: 100%;
        max-width: 100vw;
        margin: 0 auto;
    }
    
        /* Results section */
    .results {
        display: block;
        align-items: center;
        border-bottom: 1px solid #e0e0e0;
    }
    .equation, .accuracy {
        width: 80vw;
        max-width: 1200px;
        min-width: 100px;
        display: block;
    }
    /* Settings section */
    .settings {
        display: flex;
        max-width: 400px;
        flex-wrap: wrap;  /* Allow for wrapping */
        justify-content: center; /* Center items */
    }
    
    /* X and Y range settings */
    .axis-settings {
        display: flex;
        justify-content: space-between;
        margin: 10px 0;
    }
    
    /* Input fields and labels */
    label, input, select {
        margin: 5px;
    }
    
    /* Graph block placeholder */
    .graph-block {
        width: 100%; /* Adjust as needed */
        max-width: 1200px;
        min-width: 100px;
        height: 100%; /* New addition */
        background-color: #f5f5f5;
    }
    
    /* Remove the media query, as we're no longer using it */
    
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/simple-statistics/7.7.0/simple-statistics.min.js"></script>


</head>
<body>
    <header>
        <?php require_once $_SERVER['DOCUMENT_ROOT'] . '/snippets/html/header.php'; ?>
    </header>
    <!-- Main Content -->
    <main class="main-content">
    
        <!-- Graph -->
        <div class="graph graph-block graphContainer">
            <!-- Graph rendering library will operate here -->
        </div>
    
        <!-- Points Table -->
        <table class="points-table">
            <thead>
                <tr>
                    <th>X-Coordinate</th>
                    <th>Y-Coordinate</th>
                    <th>Action</th> <!-- For delete action -->
                </tr>
            </thead>
            <tbody>
                <!-- Points will be dynamically added here with the delete button -->
            </tbody>
        </table>
        <button id="add-point">Add Point</button>
    
        <!-- Results -->
        <div class="results">
            <h2>Results</h2>
            <p class="equation">Equation: <span></span></p>
            <p class="accuracy">Accuracy: <span></span></p>
            <button id="undo-action">Undo</button> <!-- Undo action -->
            <button id="redo-action">Redo</button>
            <button id="sort-x-coordinates">Sort X</button> <!-- Sorting points based on x-coordinate -->
        </div>
    
        <!-- Graph Settings -->
        <div class="settings">
            <h2>Settings</h2>
            
            <!-- Name the graph data -->
            <label for="graph-name">Graph Name:
            <input type="text" id="graph-name">
            </label> 
            
    
            <div class="axis-settings">
                <label for="x-axis-min">X-Axis Min:
                <input type="number" id="x-axis-min">
                </label>
            
                <label for="x-axis-max">X-Axis Max:
                <input type="number" id="x-axis-max">
                </label>
            </div>
            
            <div class="axis-settings">
                <label for="y-axis-min">Y-Axis Min:
                <input type="number" id="y-axis-min">
                </label>
            
                <label for="y-axis-max">Y-Axis Max:
                <input type="number" id="y-axis-max">
                </label>
            </div>

            
    
            <label for="xInterval">X-Interval:
            <input type="text" id="xInterval" placeholder="X-Interval">
            </label>
            
            <label for="yInterval">Y-Interval:
            <input type="text" id="yInterval" placeholder="Y-Interval">
            </label>
            
            <label for="bend-count">Number of Bends:
            <input type="range" id="bend-count" min="1" max="5" step="1" value="1">
            </label>
    
            <label for="point-color">Point Color:</label>
            <input type="color" id="point-color">
    
            <label for="line-color">Line Color:</label>
            <input type="color" id="line-color">
    
            <!-- UI Element Size -->
            <label for="ui-size">UI Element Size:</label>
            <select id="ui-size">
                <option value="tiny">Tiny</option>
                <option value="small" selected>Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
            </select>
    
            <label for="line-thickness">Line Thickness:</label>
            <input type="range" id="line-thickness" min="1" max="5" step="1" value="3"> <!-- Adjustable as per needs -->
    
            <button id="save-csv">Save as CSV</button> <!-- Button to save graph data as CSV -->
    
        </div>
    
    </main>
    <footer>
        <?php require_once $_SERVER['DOCUMENT_ROOT'] . '/snippets/html/footer.php'; ?>
    </footer>
    <script><?php require_once $_SERVER['DOCUMENT_ROOT'] . '/scripts/every_page.js' ?></script>
    <script>
        let lineDataObj = null;
        let numberOfBends = 1; // Default to a straight line
        let lineThickness = 2; // Default line thickness
        let isDragging = false;
        // Function to update canvas size
        function updateCanvasSize(ctx) {
            const maxWidth = 1200; // Max width in pixels
            const minWidth = 100; // Min width in pixels
        
            let newWidth = window.innerWidth * 0.8;  // 80% of window width
            let newHeight = window.innerWidth * 0.6; // 60% of window width for 4 to 3 ratio
        
            // Apply max and min width
            newWidth = Math.min(newWidth, maxWidth);
            newWidth = Math.max(newWidth, minWidth);
        
            ctx.width = newWidth;
            ctx.height = newHeight;
        }
        
        document.addEventListener("DOMContentLoaded", function() {
            let pointColor = 'rgba(0, 123, 255, 0.5)'; // Default point color
            let lineColor = 'rgba(255, 0, 0, 1)'; // Default line color
        
            // Set default colors in the options menu
            document.getElementById("point-color").value = "#007BFF"; // Convert rgba(0, 123, 255, 0.5) to hex
            document.getElementById("line-color").value = "#FF0000"; // Convert rgba(255, 0, 0, 1) to hex

            // Initialize Chart.js
            const ctx = document.createElement('canvas');
            // Initialize canvas dimensions
            updateCanvasSize(ctx);
            document.querySelector('.graph').appendChild(ctx);
            let chartData = [];
            const config = {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: 'Scatter Dataset',
                        data: chartData,
                        backgroundColor: pointColor
                    },
                    {
                        label: 'Line of Best Fit',
                        data: [], // This will be updated
                        type: 'line',
                        fill: false,
                        borderColor: lineColor,
                        borderWidth: lineThickness
                    }]
                },
                options: {
                    responsive: true,
                    responsiveAnimationDuration: 0,  // 0 milliseconds for instant resize
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom'
                        }
                    },
                    onHover: (event, chartElement) => {
                        if (chartElement.length > 0) {
                            const index = chartElement[0].index;
                            const point = chartData[index];
                            if (point) {
                                // Your code to handle the hover event
                            }
                        }
                    },
                    onClick: (event, chartElement) => {
                        if (isDragging) {
                            isDragging = false;
                            return;
                          }
                        if (chartElement.length > 0) return;  // Skip if clicking on an existing point
                    
                        const rect = canvas.getBoundingClientRect();
                        const x = event.x;
                        const y = event.y;
                        const newX = parseFloat(myChart.scales.x.getValueForPixel(x).toFixed(2));
                        const newY = parseFloat(myChart.scales.y.getValueForPixel(y).toFixed(2));
                        
                        addPoint(newX, newY);
                    }
                }
            };
            const myChart = new Chart(ctx, config);
            
            // Initialize table
            const tableBody = document.querySelector('.points-table tbody');
        
            // Stack for undo actions
            let undoStack = [];
            // Stack for redo actions
            let redoStack = [];
            
            // Function to save current state to session storage
            function saveToSessionStorage() {
                const state = {};
                
                if (typeof chartData !== 'undefined') {
                    state.chartData = chartData;
                }
                
                if (typeof numberOfBends !== 'undefined') {
                    state.numberOfBends = numberOfBends;
                }
                

                if (config && config.options && config.options.scales) {
                    state.xMin = config.options.scales.x.min;
                    state.xMax = config.options.scales.x.max;
                    state.yMin = config.options.scales.y.min;
                    state.yMax = config.options.scales.y.max;
                }
                
                
                sessionStorage.setItem('graphState', JSON.stringify(state));
            }
    
            
            // Function to load state from session storage
            function loadFromSessionStorage() {
                const savedState = sessionStorage.getItem('graphState');
                if (savedState) {
                    const state = JSON.parse(savedState);
                    
                    if (state.chartData) {
                        chartData = state.chartData;
                    }
                    
                    if (state.numberOfBends) {
                        numberOfBends = state.numberOfBends;
                        document.getElementById("bend-count").value = numberOfBends;
                    }
                    
                    
                    if (state.xMin || state.xMax || state.yMin || state.yMax) {
                        config.options.scales.x.min = state.xMin;
                        config.options.scales.x.max = state.xMax;
                        config.options.scales.y.min = state.yMin;
                        config.options.scales.y.max = state.yMax;
                    }
                    
                    
                    // Update the chart and table
                    myChart.update();
                    updateTable();
                }
            }
            loadFromSessionStorage();  // Load the state
            
            function updateAxis() {
                let xMinInput = document.getElementById("x-axis-min").value;
                let xMaxInput = document.getElementById("x-axis-max").value;
                let yMinInput = document.getElementById("y-axis-min").value;
                let yMaxInput = document.getElementById("y-axis-max").value;
            
                // The ternary operator checks if xMinInput is null or an empty string.
                // If it is, it sets xMin to -10. Otherwise, it parses xMinInput as a float.
                let xMin = (xMinInput !== null && xMinInput !== "") ? parseFloat(xMinInput) : -10;
                
                // The same logic applies to xMax, yMin, and yMax.
                let xMax = (xMaxInput !== null && xMaxInput !== "") ? parseFloat(xMaxInput) : 10;
                let yMin = (yMinInput !== null && yMinInput !== "") ? parseFloat(yMinInput) : -10;
                let yMax = (yMaxInput !== null && yMaxInput !== "") ? parseFloat(yMaxInput) : 10;

            
                let xInterval = parseInt(document.getElementById("xInterval").value) || 1;
                let yInterval = parseInt(document.getElementById("yInterval").value) || 1;
            
                config.options.scales = {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        min: xMin,
                        max: xMax,
                        ticks: {
                            stepSize: xInterval
                        }
                    },
                    y: {
                        type: 'linear',
                        min: yMin,
                        max: yMax,
                        ticks: {
                            stepSize: yInterval
                        }
                    }
                };
                
                myChart.update();
                saveToSessionStorage();
            }

            // Call it initially
            updateAxis();
        
            // Listen for changes to settings
            document.getElementById("x-axis-min").addEventListener("input", updateAxis);
            document.getElementById("x-axis-max").addEventListener("input", updateAxis);
            document.getElementById("y-axis-min").addEventListener("input", updateAxis);
            document.getElementById("y-axis-max").addEventListener("input", updateAxis);
            document.getElementById("xInterval").addEventListener("input", updateAxis);
            document.getElementById("yInterval").addEventListener("input", updateAxis);
    
        
            // Function to add point both to graph and to table
            function addPoint(x, y) {
                chartData.push({x, y});
                config.data.datasets[0].backgroundColor = Array(chartData.length).fill(pointColor); // Update background color for all points
                updateLineOfBestFit();
                myChart.update();
                // Update equation and accuracy
                if(lineDataObj) {
                    updateLineOfBestFitVariablesAndHTML(lineDataObj);
                }
                undoStack.push({ type: 'add', data: {x, y} });
                updateTable();
                saveToSessionStorage();  // Save the state
            }

            
            document.getElementById("add-point").addEventListener("click", function() {
                // Calculate the middle point based on the current axis settings
                const xMin = config.options.scales.x.min;
                const xMax = config.options.scales.x.max;
                const yMin = config.options.scales.y.min;
                const yMax = config.options.scales.y.max;
            
                const xMid = (xMin + xMax) / 2;
                const yMid = (yMin + yMax) / 2;
            
                // Add the point to the graph
                addPoint(xMid, yMid);
            });
            
            document.addEventListener("input", function(event) {
                if (event.target.classList.contains("coordinate-input")) {
                    const index = parseInt(event.target.getAttribute("data-index"));
                    const value = parseFloat(event.target.value);
                    const oldValue = chartData[index][event.target.classList.contains("x-coordinate") ? 'x' : 'y'];
                    // Push the old value to the undo stack
                    undoStack.push({ type: 'edit', data: { index, field: event.target.classList.contains("x-coordinate") ? 'x' : 'y', oldValue } });

                    if (event.target.classList.contains("x-coordinate")) {
                        chartData[index].x = value;
                    } else if (event.target.classList.contains("y-coordinate")) {
                        chartData[index].y = value;
                    }
            
                    // Recalculate line of best fit
                    updateLineOfBestFit();
            
                    // Update equation and accuracy
                    if(lineDataObj) {
                        updateLineOfBestFitVariablesAndHTML(lineDataObj);
                    }
                    myChart.update();
                }
            });
            
            document.getElementById("bend-count").addEventListener("input", function() {
                numberOfBends = parseInt(this.value);
                updateLineOfBestFit();
                saveToSessionStorage();  // Save the state
            });

            function updateLineOfBestFitVariablesAndHTML(lineDataObj) {
                const slope = lineDataObj.slope;
                const intercept = lineDataObj.intercept;
                document.querySelector('.equation span').innerText = getLineEquation(slope, intercept);
                document.querySelector('.accuracy span').innerText = getRSquared(chartData, slope, intercept).toFixed(2);
            }
            
            function updateLineOfBestFit() {
                // Your existing logic for a straight line can go here as a special case
                if (numberOfBends === 1) {
                    lineDataObj = calculateLineOfBestFit(chartData);
                    config.data.datasets[1].data = lineDataObj.data;
                } else {
                    // Polynomial regression logic for lines with bends can be found in the calculatePolynomialLine() function
                    config.data.datasets[1].data = calculatePolynomialLine(chartData, numberOfBends - 1);

                }
                
                myChart.update();
            }
            
            function calculatePolynomialLine(data, degree) {
                const xValues = data.map(point => point.x);
                const yValues = data.map(point => point.y);
            
                // Perform polynomial regression
                const coefficients = simpleStatistics.polynomial(xValues, yValues, degree);
            
                // Generate points for the polynomial line
                const xMin = config.options.scales.x.min;
                const xMax = config.options.scales.x.max;
                const step = (xMax - xMin) / 100; // Number of points to generate
                const lineData = [];
            
                for (let x = xMin; x <= xMax; x += step) {
                    let y = 0;
                    for (let i = 0; i <= degree; i++) {
                        y += coefficients[i] * Math.pow(x, i);
                    }
                    lineData.push({ x, y });
                }
            
                return lineData;
            }
        
            // Function to update the points table
            function updateTable() {
                tableBody.innerHTML = '';
                chartData.forEach((point, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><input type="number" id="xCor${index}" class="coordinate-input x-coordinate" data-index="${index}" value="${point.x}"></td>
                        <td><input type="number" id="yCor${index}" class="coordinate-input y-coordinate" data-index="${index}" value="${point.y}"></td>
                        <td><button onclick="deletePoint(${index})">Delete</button></td>
                    `;
                    tableBody.appendChild(row);
                });
            }


            
        
            // Function to delete a point
            window.deletePoint = function(index) {
                const point = chartData[index];
                undoStack.push({ type: 'delete', data: point });
            
                // Remove point from chartData
                chartData.splice(index, 1);
                
                updateLineOfBestFit();
                myChart.update();
                
                // Update equation and accuracy
                if(lineDataObj) {
                    updateLineOfBestFitVariablesAndHTML(lineDataObj);
                }
                
                updateTable();
                saveToSessionStorage();  // Save the state
            };

            
            function calculateLineOfBestFit(data) {
                let sumX = 0, sumY = 0, sumX2 = 0, sumXY = 0, n = data.length;
            
                for(let i = 0; i < n; i++) {
                    sumX += data[i].x;
                    sumY += data[i].y;
                    sumX2 += data[i].x * data[i].x;
                    sumXY += data[i].x * data[i].y;
                }
            
                let slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                let intercept = (sumY - slope * sumX) / n;
            
                // Get the minimum and maximum x-values from the graph settings
                const xMin = config.options.scales.x.min;
                const xMax = config.options.scales.x.max;
            
                // Calculate the y-values for the line of best fit at xMin and xMax
                const yMin = slope * xMin + intercept;
                const yMax = slope * xMax + intercept;
            
                // Create the line data to include these two points
                let lineData = [
                    { x: xMin, y: yMin },
                    { x: xMax, y: yMax }
                ];
            
                return {
                    data: lineData,
                    slope: slope,
                    intercept: intercept
                };
            }


            
            function getLineEquation(slope, intercept) {
                return `y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}`;
            }
            
            function getRSquared(data, slope, intercept) {
                let sumY = 0, sumYSquared = 0, sumResidualsSquared = 0;
                for (let i = 0; i < data.length; i++) {
                    const predictedY = slope * data[i].x + intercept;
                    const residual = data[i].y - predictedY;
                    
                    sumY += data[i].y;
                    sumYSquared += data[i].y * data[i].y;
                    sumResidualsSquared += residual * residual;
                }
                const meanY = sumY / data.length;
                const totalVariance = sumYSquared - sumY * meanY;
                return 1 - (sumResidualsSquared / totalVariance);
            }
        
            // Listen for Save CSV button click
            document.getElementById("save-csv").addEventListener("click", function() {
                const csv = chartData.map(point => `${point.x},${point.y}`).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", "data.csv");
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        
            // Listen for Sort X button click
            document.getElementById("sort-x-coordinates").addEventListener("click", function() {
                chartData.sort((a, b) => a.x - b.x);
                myChart.update();
                updateTable();
            });
        
            // Listen for Undo button click
            document.getElementById("undo-action").addEventListener("click", function() {
                const lastAction = undoStack.pop();
                if (lastAction) {
                    if (lastAction.type === 'add') {
                        const index = chartData.findIndex(point => point.x === lastAction.data.x && point.y === lastAction.data.y);
                        if(index > -1) {
                            chartData.splice(index, 1);
                        }
                    } else if (lastAction.type === 'delete') {
                        chartData.push(lastAction.data);
                    } else if (lastAction.type === 'edit') {
                        chartData[lastAction.data.index][lastAction.data.field] = lastAction.data.oldValue;
                    } else if (lastAction.type === 'move') {
                        const point = chartData[lastAction.data.index];
                        point.x = lastAction.data.oldX;
                        point.y = lastAction.data.oldY;
                    }
                    
                    // Recalculate line of best fit
                    updateLineOfBestFit();
                    
                    // Update equation and accuracy
                    if(lineDataObj) {
                        updateLineOfBestFitVariablesAndHTML(lineDataObj);
                    }
                    
                    myChart.update();
                    updateTable();
                    // Push the undone action to the redo stack
                    redoStack.push(lastAction);
                }
                saveToSessionStorage();  // Save the state
            });
            
            // Listen for Redo button click
            document.getElementById("redo-action").addEventListener("click", function() {
                const lastAction = redoStack.pop();
                if (lastAction) {
                    if (lastAction.type === 'add') {
                        addPoint(lastAction.data.x, lastAction.data.y);
                    } else if (lastAction.type === 'delete') {
                        const index = chartData.findIndex(point => point.x === lastAction.data.x && point.y === lastAction.data.y);
                        if(index > -1) {
                            chartData.splice(index, 1);
                        }
                    } else if (lastAction.type === 'edit') {
                        chartData[lastAction.data.index][lastAction.data.field] = lastAction.data.oldValue;
                    } else if (lastAction.type === 'move') {
                        const point = chartData[lastAction.data.index];
                        point.x = lastAction.data.oldX;
                        point.y = lastAction.data.oldY;
                    }
                    
                    // Recalculate line of best fit
                    updateLineOfBestFit();
                    
                    // Update equation and accuracy
                    if(lineDataObj) {
                        updateLineOfBestFitVariablesAndHTML(lineDataObj);
                    }
                    
                    myChart.update();
                    updateTable();
                    
                    // Push the redone action back to the undo stack
                    undoStack.push(lastAction);
                }
                saveToSessionStorage();  // Save the state
            });


        
            // Initialize the table
            updateTable();
            
            // Add an ID to the canvas so you can add an event listener to it
            ctx.id = "myCanvas";
            
            let selectedPoint = null;
            
            function isPointNearMouse(pointX, pointY, mouseX, mouseY, radius = 5) {
              return Math.sqrt((pointX - mouseX) ** 2 + (pointY - mouseY) ** 2) < radius;
            }
            
            // Retrieve the canvas DOM element using the assigned ID
            const canvas = document.getElementById("myCanvas");
            
            canvas.addEventListener('mousedown', function(event) {
              const rect = canvas.getBoundingClientRect();
              const mouseX = event.clientX - rect.left;
              const mouseY = event.clientY - rect.top;
            
              chartData.forEach((point, index) => {
                // Convert from data coordinates to pixel coordinates
                const pointX = myChart.scales.x.getPixelForValue(point.x);
                const pointY = myChart.scales.y.getPixelForValue(point.y);
            
                if (isPointNearMouse(pointX, pointY, mouseX, mouseY)) {
                  selectedPoint = { ...point, index };
                  isDragging = true;  // set the flag
                }
              });
            });
            
            canvas.addEventListener('mousemove', function(event) {
                if (selectedPoint) {
                    const oldX = chartData[selectedPoint.index].x;
                    const oldY = chartData[selectedPoint.index].y;
                    const rect = canvas.getBoundingClientRect();
                    const mouseX = event.clientX - rect.left;
                    const mouseY = event.clientY - rect.top;
            
                    // Convert from pixel coordinates back to data coordinates
                    const newX = parseFloat(myChart.scales.x.getValueForPixel(mouseX).toFixed(2));
                    const newY = parseFloat(myChart.scales.y.getValueForPixel(mouseY).toFixed(2));
            
                    chartData[selectedPoint.index] = { x: newX, y: newY };
                    
                    // Recalculate line of best fit
                    updateLineOfBestFit();
                    
                    // Update equation and accuracy
                    if(lineDataObj) {
                        updateLineOfBestFitVariablesAndHTML(lineDataObj);
                    }
                    
                    myChart.update();
                    updateTable();
                    // undoStack.push({ type: 'move', data: { index: selectedPoint.index, oldX, oldY, newX, newY } });
                }
            });

            
            canvas.addEventListener('mouseup', function(event) {
                if (selectedPoint) {
                    const newX = chartData[selectedPoint.index].x;
                    const newY = chartData[selectedPoint.index].y;
                    undoStack.push({ type: 'move', data: { index: selectedPoint.index, newX, newY } });
                    selectedPoint = null;
                }
            });
            document.getElementById("point-color").addEventListener("input", function() {
                pointColor = this.value;
                config.data.datasets[0].backgroundColor = pointColor;
                myChart.update();
                saveToSessionStorage();  // Save the state
            });
            
            document.getElementById("line-color").addEventListener("input", function() {
                lineColor = this.value;
                config.data.datasets[1].borderColor = lineColor;
                myChart.update();
                saveToSessionStorage();  // Save the state
            });
            
            document.getElementById("line-thickness").addEventListener("input", function() {
                lineThickness = parseFloat(this.value);
                config.data.datasets[1].borderWidth = lineThickness;
                myChart.update();
                saveToSessionStorage();  // Save the state
            });
            
            // Listen for window resize
            window.addEventListener('resize', function() {
                // Update canvas dimensions
                updateCanvasSize(ctx);
                myChart.resize(); // Chart.js method to resize the chart
            });
            
            
        });
</script>
</body>
</html>