let lineDataObj = null;
let numberOfBends = 1; // Default to a straight line
let lineThickness = 2; // Default line thickness
let isDragging = false;
let drawMode = false;
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
    document.querySelector('.graph-container').appendChild(ctx);
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
            plugins: {
                title: {
                    display: true,
                    text: 'My Chart'
                }
            },
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

    // Function to save current state to local storage
    function saveState() {
        const state = {
            chartData: chartData,
            regressionType: document.getElementById("regression-type").value,
            polynomialDegree: document.getElementById("polynomial-degree").value,
            graphName: document.getElementById("graph-name").value,
            axis: {
                xMin: config.options.scales.x.min,
                xMax: config.options.scales.x.max,
                yMin: config.options.scales.y.min,
                yMax: config.options.scales.y.max,
                xInterval: document.getElementById("xInterval").value,
                yInterval: document.getElementById("yInterval").value
            },
            colors: {
                pointColor: document.getElementById("point-color").value,
                lineColor: document.getElementById("line-color").value
            },
            ui: {
                size: document.getElementById("ui-size").value,
                lineThickness: document.getElementById("line-thickness").value
            }
        };
        localStorage.setItem('lineTool', JSON.stringify(state));
    }

    // Function to load state from local storage
    function loadState() {
        const savedState = localStorage.getItem('lineTool');
        if (savedState) {
            const state = JSON.parse(savedState);

            chartData = state.chartData || [];

            if(state.regressionType) {
                document.getElementById("regression-type").value = state.regressionType;
                if(state.regressionType === 'polynomial') {
                    document.getElementById("polynomial-degree-label").style.display = 'block';
                }
            }
            if(state.polynomialDegree) {
                document.getElementById("polynomial-degree").value = state.polynomialDegree;
            }

            if (state.graphName) {
                document.getElementById("graph-name").value = state.graphName;
                config.options.plugins.title.text = state.graphName;
            }

            if (state.axis) {
                document.getElementById("x-axis-min").value = state.axis.xMin;
                document.getElementById("x-axis-max").value = state.axis.xMax;
                document.getElementById("y-axis-min").value = state.axis.yMin;
                document.getElementById("y-axis-max").value = state.axis.yMax;
                document.getElementById("xInterval").value = state.axis.xInterval;
                document.getElementById("yInterval").value = state.axis.yInterval;
                updateAxis(); // This will update the chart's scales
            }

            if (state.colors) {
                document.getElementById("point-color").value = state.colors.pointColor;
                document.getElementById("line-color").value = state.colors.lineColor;
                pointColor = state.colors.pointColor;
                lineColor = state.colors.lineColor;
                config.data.datasets[0].backgroundColor = pointColor;
                config.data.datasets[1].borderColor = lineColor;
            }

            if (state.ui) {
                document.getElementById("ui-size").value = state.ui.size;
                document.getElementById("line-thickness").value = state.ui.lineThickness;
                // Trigger the change event to apply the UI size
                document.getElementById("ui-size").dispatchEvent(new Event('change'));
                document.getElementById("line-thickness").dispatchEvent(new Event('input'));
            }


            // Update the chart and table
            updateTable();
            updateLineOfBestFit();
             if(lineDataObj) {
                updateLineOfBestFitVariablesAndHTML(lineDataObj);
            }
            myChart.update();
        }
    }
    loadState();  // Load the state

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
        saveState();
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
        saveState();  // Save the state
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
            saveState();
        }
    });

    document.getElementById("regression-type").addEventListener("change", function() {
        const polyDegreeLabel = document.getElementById("polynomial-degree-label");
        if (this.value === "polynomial") {
            polyDegreeLabel.style.display = "block";
        } else {
            polyDegreeLabel.style.display = "none";
        }
        updateLineOfBestFit();
        saveState();
    });

    document.getElementById("polynomial-degree").addEventListener("input", function() {
        updateLineOfBestFit();
        saveState();
    });

    function updateLineOfBestFitVariablesAndHTML(lineDataObj) {
        if (!lineDataObj || lineDataObj.rSquared === null || isNaN(lineDataObj.rSquared)) {
            document.querySelector('.equation span').innerText = '';
            document.querySelector('.accuracy span').innerText = '';
        } else {
            document.querySelector('.equation span').innerText = lineDataObj.equation;
            document.querySelector('.accuracy span').innerText = lineDataObj.rSquared.toFixed(4);
        }
    }

    function updateLineOfBestFit() {
        if (chartData.length < 2) {
            config.data.datasets[1].data = [];
            lineDataObj = null;
            myChart.update();
            updateLineOfBestFitVariablesAndHTML(null);
            return;
        }

        const regressionType = document.getElementById("regression-type").value;
        let points = chartData;
        lineDataObj = null; // Reset

        switch (regressionType) {
            case 'linear':
                lineDataObj = calculateLinearRegression(points);
                break;
            case 'polynomial':
                const degree = parseInt(document.getElementById('polynomial-degree').value);
                if (points.length > degree) {
                    lineDataObj = calculatePolynomialRegression(points, degree);
                }
                break;
            case 'logarithmic':
                points = chartData.filter(p => p.x > 0);
                if (points.length >= 2) {
                    lineDataObj = calculateLogarithmicRegression(points);
                }
                break;
            case 'power':
                points = chartData.filter(p => p.x > 0 && p.y > 0);
                if (points.length >= 2) {
                    lineDataObj = calculatePowerRegression(points);
                }
                break;
            case 'exponential':
                 points = chartData.filter(p => p.y > 0);
                 if (points.length >= 2) {
                    lineDataObj = calculateExponentialRegression(points);
                 }
                break;
        }

        if (lineDataObj) {
            config.data.datasets[1].data = lineDataObj.data;
            updateLineOfBestFitVariablesAndHTML(lineDataObj);
        } else {
            config.data.datasets[1].data = [];
            updateLineOfBestFitVariablesAndHTML(null);
        }

        myChart.update();
    }

    function calculateLinearRegression(data) {
        const points = data.map(p => [p.x, p.y]);
        if (points.length < 2) return null;

        const { m, b } = simpleStatistics.linearRegression(points);

        const xMin = config.options.scales.x.min;
        const xMax = config.options.scales.x.max;

        const lineData = [
            { x: xMin, y: m * xMin + b },
            { x: xMax, y: m * xMax + b }
        ];

        const equation = `y = ${m.toFixed(2)}x + ${b.toFixed(2)}`;
        const rSquared = simpleStatistics.rSquared(points, (x) => m * x + b);

        return { data: lineData, equation, rSquared };
    }

    function calculatePolynomialRegression(data, degree) {
        const points = data.map(p => [p.x, p.y]);
        if (points.length <= degree) return null;

        const regression = simpleStatistics.polynomialRegression(points, degree);
        const predict = (x) => regression.predict(x)[1];

        const xMin = config.options.scales.x.min;
        const xMax = config.options.scales.x.max;
        const step = (xMax - xMin) / 100;
        const lineData = [];

        for (let x = xMin; x <= xMax; x += step) {
            lineData.push({ x, y: predict(x) });
        }

        const equation = regression.string;
        const rSquared = simpleStatistics.rSquared(points, predict);

        return { data: lineData, equation, rSquared };
    }

    function calculateLogarithmicRegression(data) {
        const points = data.map(p => [Math.log(p.x), p.y]);
        if (points.length < 2) return null;

        const { m, b } = simpleStatistics.linearRegression(points);
        const predict = (x) => m * Math.log(x) + b;

        const xMin = Math.max(config.options.scales.x.min, 0.01); // Avoid log(0)
        const xMax = config.options.scales.x.max;
        const step = (xMax - xMin) / 100;
        const lineData = [];

        for (let x = xMin; x <= xMax; x += step) {
            if (x > 0) {
                lineData.push({ x, y: predict(x) });
            }
        }

        const equation = `y = ${m.toFixed(2)}ln(x) + ${b.toFixed(2)}`;
        const rSquared = simpleStatistics.rSquared(data.map(p => [p.x, p.y]), predict);

        return { data: lineData, equation, rSquared };
    }

    function calculatePowerRegression(data) {
        const points = data.map(p => [Math.log(p.x), Math.log(p.y)]);
        if (points.length < 2) return null;

        const { m, b } = simpleStatistics.linearRegression(points);
        const a = Math.exp(b);
        const predict = (x) => a * Math.pow(x, m);

        const xMin = Math.max(config.options.scales.x.min, 0.01);
        const xMax = config.options.scales.x.max;
        const step = (xMax - xMin) / 100;
        const lineData = [];

        for (let x = xMin; x <= xMax; x += step) {
            if (x > 0) {
                lineData.push({ x, y: predict(x) });
            }
        }

        const equation = `y = ${a.toFixed(2)}x^${m.toFixed(2)}`;
        const rSquared = simpleStatistics.rSquared(data.map(p => [p.x, p.y]), predict);

        return { data: lineData, equation, rSquared };
    }

    function calculateExponentialRegression(data) {
        const points = data.map(p => [p.x, Math.log(p.y)]);
        if (points.length < 2) return null;

        const { m, b } = simpleStatistics.linearRegression(points);
        const a = Math.exp(b);
        const predict = (x) => a * Math.exp(m * x);

        const xMin = config.options.scales.x.min;
        const xMax = config.options.scales.x.max;
        const step = (xMax - xMin) / 100;
        const lineData = [];

        for (let x = xMin; x <= xMax; x += step) {
            lineData.push({ x, y: predict(x) });
        }

        const equation = `y = ${a.toFixed(2)}e^(${m.toFixed(2)}x)`;
        const rSquared = simpleStatistics.rSquared(data.map(p => [p.x, p.y]), predict);

        return { data: lineData, equation, rSquared };
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
        saveState();  // Save the state
    };

    function autoSelectBestFit() {
        if (chartData.length < 2) return;

        const results = [];
        let points;

        // Linear
        points = chartData;
        const linearResult = calculateLinearRegression(points);
        if (linearResult && isFinite(linearResult.rSquared)) {
            results.push({ type: 'linear', rSquared: linearResult.rSquared });
        }

        // Polynomial
        for (let degree = 2; degree <= 5; degree++) {
            points = chartData;
            if (points.length > degree) {
                const polyResult = calculatePolynomialRegression(points, degree);
                if (polyResult && isFinite(polyResult.rSquared)) {
                    results.push({ type: 'polynomial', degree: degree, rSquared: polyResult.rSquared });
                }
            }
        }

        // Logarithmic
        points = chartData.filter(p => p.x > 0);
        if (points.length >= 2) {
            const logResult = calculateLogarithmicRegression(points);
            if (logResult && isFinite(logResult.rSquared)) {
                results.push({ type: 'logarithmic', rSquared: logResult.rSquared });
            }
        }

        // Power
        points = chartData.filter(p => p.x > 0 && p.y > 0);
        if (points.length >= 2) {
            const powerResult = calculatePowerRegression(points);
            if (powerResult && isFinite(powerResult.rSquared)) {
                results.push({ type: 'power', rSquared: powerResult.rSquared });
            }
        }

        // Exponential
        points = chartData.filter(p => p.y > 0);
        if (points.length >= 2) {
            const expResult = calculateExponentialRegression(points);
            if (expResult && isFinite(expResult.rSquared)) {
                results.push({ type: 'exponential', rSquared: expResult.rSquared });
            }
        }

        if (results.length === 0) return;

        const bestFit = results.reduce((best, current) => current.rSquared > best.rSquared ? current : best, { rSquared: -Infinity });

        const regressionTypeSelect = document.getElementById("regression-type");
        regressionTypeSelect.value = bestFit.type;
        regressionTypeSelect.dispatchEvent(new Event('change'));

        if (bestFit.type === 'polynomial') {
            document.getElementById('polynomial-degree').value = bestFit.degree;
        }

        updateLineOfBestFit();
        saveState();
    }

    document.getElementById("auto-select-best-fit").addEventListener("click", autoSelectBestFit);

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

    document.getElementById("reset-data").addEventListener("click", function() {
        chartData = [];
        lineDataObj = null;
        updateTable();
        updateLineOfBestFit();
        myChart.update();
        saveState();
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
        saveState();  // Save the state
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
        saveState();  // Save the state
    });



    // Initialize the table
    updateTable();

    // Add an ID to the canvas so you can add an event listener to it
    ctx.id = "myCanvas";
    // Retrieve the canvas DOM element using the assigned ID
    const canvas = document.getElementById("myCanvas");

    let selectedPoint = null;

    function isPointNearMouse(pointX, pointY, mouseX, mouseY, radius = 5) {
      return Math.sqrt((pointX - mouseX) ** 2 + (pointY - mouseY) ** 2) < radius;
    }

    document.getElementById("draw-mode").addEventListener("click", function() {
        drawMode = !drawMode;
        this.textContent = drawMode ? "Point Mode" : "Draw Mode";
    });

    canvas.addEventListener('mousedown', function(event) {
      if (drawMode) {
          isDragging = true;
          return;
      }
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
        if (drawMode && isDragging) {
            const rect = canvas.getBoundingClientRect();
            const x = event.x;
            const y = event.y;
            const newX = parseFloat(myChart.scales.x.getValueForPixel(x).toFixed(2));
            const newY = parseFloat(myChart.scales.y.getValueForPixel(y).toFixed(2));
            addPoint(newX, newY);
            return;
        }
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
        if (drawMode) {
            isDragging = false;
            return;
        }
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
        saveState();  // Save the state
    });

    document.getElementById("graph-name").addEventListener("input", function() {
        config.options.plugins.title.text = this.value;
        myChart.update();
        saveState();
    });

    document.getElementById("ui-size").addEventListener("change", function() {
        const size = this.value;
        let pointRadius = 3;
        let newThickness = 2;

        switch(size) {
            case 'tiny':
                pointRadius = 1;
                newThickness = 1;
                break;
            case 'small':
                pointRadius = 3;
                newThickness = 2;
                break;
            case 'medium':
                pointRadius = 5;
                newThickness = 3;
                break;
            case 'large':
                pointRadius = 7;
                newThickness = 4;
                break;
        }

        config.data.datasets[0].radius = pointRadius;
        config.data.datasets[1].borderWidth = newThickness;
        lineThickness = newThickness; // update global variable
        myChart.update();
        saveState();
    });

    document.getElementById("line-color").addEventListener("input", function() {
        lineColor = this.value;
        config.data.datasets[1].borderColor = lineColor;
        myChart.update();
        saveState();  // Save the state
    });

    document.getElementById("line-thickness").addEventListener("input", function() {
        lineThickness = parseFloat(this.value);
        config.data.datasets[1].borderWidth = lineThickness;
        myChart.update();
        saveState();  // Save the state
    });

    // Listen for window resize
    window.addEventListener('resize', function() {
        // Update canvas dimensions
        updateCanvasSize(ctx);
        myChart.resize(); // Chart.js method to resize the chart
    });


});