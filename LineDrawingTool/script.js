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
        if (!lineDataObj) {
            document.querySelector('.equation span').innerText = '';
            document.querySelector('.accuracy span').innerText = '';
            return;
        }
        const slope = lineDataObj.slope;
        const intercept = lineDataObj.intercept;
        document.querySelector('.equation span').innerText = getLineEquation(slope, intercept);
        document.querySelector('.accuracy span').innerText = getRSquared(chartData, slope, intercept).toFixed(2);
    }

    function updateLineOfBestFit() {
        if (chartData.length < 2) {
            config.data.datasets[1].data = [];
            lineDataObj = null;
            myChart.update();
            return;
        }
        // Your existing logic for a straight line can go here as a special case
        if (numberOfBends === 1) {
            lineDataObj = calculateLineOfBestFit(chartData);
            if (lineDataObj) {
                config.data.datasets[1].data = lineDataObj.data;
            }
        } else {
            // Polynomial regression logic for lines with bends can be found in the calculatePolynomialLine() function
            const degree = numberOfBends - 1;
            if (chartData.length > degree) {
                config.data.datasets[1].data = calculatePolynomialLine(chartData, degree);
            } else {
                config.data.datasets[1].data = [];
            }
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
        if (n < 2) {
            return null;
        }

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
        saveToSessionStorage();  // Save the state
    });

    document.getElementById("graph-name").addEventListener("input", function() {
        config.options.plugins.title.text = this.value;
        myChart.update();
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
