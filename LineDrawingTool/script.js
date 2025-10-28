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

            if (state.chartData) {
                // Clear the existing array while keeping the reference for the chart
                chartData.length = 0;
                // Push the loaded data into the array
                Array.prototype.push.apply(chartData, state.chartData);
            }

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
            const newValue = parseFloat(event.target.value);
            const field = event.target.classList.contains("x-coordinate") ? 'x' : 'y';
            const oldValue = chartData[index][field];
            // Push the old value to the undo stack
            undoStack.push({ type: 'edit', data: { index, field, oldValue, newValue } });

            if (field === 'x') {
                chartData[index].x = newValue;
            } else {
                chartData[index].y = newValue;
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

    document.getElementById("weighted-regression").addEventListener("change", function() {
        updateLineOfBestFit();
        saveState();
    });

    document.getElementById("polynomial-degree").addEventListener("input", function() {
        updateLineOfBestFit();
        saveState();
    });

    function calculateWeights(data) {
        if (data.length < 2) {
            return data.map(() => 1);
        }

        const indexedData = data.map((p, i) => ({ ...p, originalIndex: i }));
        indexedData.sort((a, b) => a.x - b.x);

        const weights = new Array(data.length);

        if (indexedData[indexedData.length - 1].x === indexedData[0].x) {
            return data.map(() => 1);
        }

        for (let i = 0; i < indexedData.length; i++) {
            const point = indexedData[i];
            let weight = 0;
            if (i === 0) {
                weight = (indexedData[1].x - point.x) / 2;
            } else if (i === indexedData.length - 1) {
                weight = (point.x - indexedData[i - 1].x) / 2;
            } else {
                const prevDist = (point.x - indexedData[i - 1].x) / 2;
                const nextDist = (indexedData[i + 1].x - point.x) / 2;
                weight = prevDist + nextDist;
            }
            weights[point.originalIndex] = weight;
        }
        return weights;
    }

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
        const isWeighted = document.getElementById("weighted-regression").checked;

        let points = chartData;
        if (isWeighted) {
            const weights = calculateWeights(chartData);
            points = chartData.map((p, i) => ({ ...p, weight: weights[i] }));
        }

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
            case 'theil-sen':
                lineDataObj = calculateTheilSenRegression(points);
                break;
            case 'sigmoidal':
                lineDataObj = calculateSigmoidalRegression(points);
                break;
        }

        if (lineDataObj) {
            config.data.datasets[1].data = lineDataObj.data;
            updateLineOfBestFitVariablesAndHTML(lineDataObj);
            lineDataObj.predict = lineDataObj.predict;
        } else {
            config.data.datasets[1].data = [];
            updateLineOfBestFitVariablesAndHTML(null);
        }

        myChart.update();
    }

    function calculateLinearRegression(data) {
        const isWeighted = data[0].weight !== undefined;
        if (data.length < 2) return null;

        let m, b, rSquared;

        if (isWeighted) {
            ({ m, b, rSquared } = calculateWeightedLinearRegression(data));
        } else {
            const points = data.map(p => [p.x, p.y]);
            ({ m, b } = ss.linearRegression(points));
            rSquared = ss.rSquared(points, (x) => m * x + b);
        }

        const xMin = config.options.scales.x.min;
        const xMax = config.options.scales.x.max;

        const lineData = [
            { x: xMin, y: m * xMin + b },
            { x: xMax, y: m * xMax + b }
        ];

        const predict = (x) => m * x + b;
        const equation = `y = ${m.toFixed(2)}x + ${b.toFixed(2)}`;

        return { data: lineData, equation, rSquared, predict };
    }

    function calculateWeightedLinearRegression(data, x_transform = (x) => x, y_transform = (y) => y) {
        let sum_w = 0, sum_wx = 0, sum_wy = 0, sum_wxy = 0, sum_wx2 = 0;
        for (const p of data) {
            const w = p.weight;
            const x = x_transform(p.x);
            const y = y_transform(p.y);
            sum_w += w;
            sum_wx += w * x;
            sum_wy += w * y;
            sum_wxy += w * x * y;
            sum_wx2 += w * x * x;
        }
        const m = (sum_w * sum_wxy - sum_wx * sum_wy) / (sum_w * sum_wx2 - sum_wx * sum_wx);
        const b = (sum_wy - m * sum_wx) / sum_w;

        const y_mean_weighted = data.reduce((sum, p) => sum + y_transform(p.y) * p.weight, 0) / data.reduce((sum, p) => sum + p.weight, 0);
        let ss_tot = 0;
        let ss_res = 0;
        for (const p of data) {
            ss_tot += p.weight * Math.pow(y_transform(p.y) - y_mean_weighted, 2);
            ss_res += p.weight * Math.pow(y_transform(p.y) - (m * x_transform(p.x) + b), 2);
        }
        const rSquared = 1 - ss_res / ss_tot;

        return { m, b, rSquared };
    }

    function calculatePolynomialRegression(data, degree) {
        const isWeighted = data[0].weight !== undefined;
        if (data.length <= degree) return null;

        let result, predict, rSquared;
        let points = data.map(p => [p.x, p.y]);

        if (isWeighted) {
            const X = [];
            const Y = [];
            for (let i = 0; i < data.length; i++) {
                const row = [];
                for (let j = 0; j <= degree; j++) {
                    row.push(Math.pow(data[i].x, j));
                }
                X.push(row);
                Y.push(data[i].y);
            }

            const XT = numeric.transpose(X);
            const W = numeric.diag(data.map(p => p.weight));
            const XTW = numeric.dot(XT, W);
            const XTWX = numeric.dot(XTW, X);
            const XTWY = numeric.dot(XTW, Y);
            const coeffs = numeric.solve(XTWX, XTWY);

            predict = (x) => {
                let y = 0;
                for (let i = 0; i < coeffs.length; i++) {
                    y += coeffs[i] * Math.pow(x, i);
                }
                return y;
            };

            const y_mean_weighted = data.reduce((sum, p) => sum + p.y * p.weight, 0) / data.reduce((sum, p) => sum + p.weight, 0);
            let ss_tot = 0;
            let ss_res = 0;
            for (const p of data) {
                ss_tot += p.weight * Math.pow(p.y - y_mean_weighted, 2);
                ss_res += p.weight * Math.pow(p.y - predict(p.x), 2);
            }
            rSquared = 1 - ss_res / ss_tot;

            let equation = 'y = ';
            for(let i = coeffs.length - 1; i >= 0; i--) {
                equation += `${coeffs[i].toFixed(2)}x^${i} + `;
            }
            equation = equation.slice(0, -3);
            result = { string: equation };

        } else {
            result = regression.polynomial(points, { order: degree });
            predict = (x) => result.predict(x)[1];
            rSquared = ss.rSquared(points, predict);
        }

        const xMin = config.options.scales.x.min;
        const xMax = config.options.scales.x.max;
        const step = (xMax - xMin) / 100;
        const lineData = [];

        for (let x = xMin; x <= xMax; x += step) {
            lineData.push({ x, y: predict(x) });
        }

        const equation = result.string;

        return { data: lineData, equation, rSquared, predict };
    }

    function calculateLogarithmicRegression(data) {
        const isWeighted = data[0].weight !== undefined;
        const filteredData = data.filter(p => p.x > 0);
        if (filteredData.length < 2) return null;

        let m, b, rSquared;

        if (isWeighted) {
            ({ m, b, rSquared } = calculateWeightedLinearRegression(filteredData, (x) => Math.log(x)));
        } else {
            const points = filteredData.map(p => [Math.log(p.x), p.y]);
            ({ m, b } = ss.linearRegression(points));
            rSquared = ss.rSquared(filteredData.map(p => [p.x, p.y]), (x) => m * Math.log(x) + b);
        }

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
        return { data: lineData, equation, rSquared, predict };
    }

    function calculatePowerRegression(data) {
        const isWeighted = data[0].weight !== undefined;
        const filteredData = data.filter(p => p.x > 0 && p.y > 0);
        if (filteredData.length < 2) return null;

        let m, b, rSquared;

        if (isWeighted) {
            ({ m, b, rSquared } = calculateWeightedLinearRegression(filteredData, (x) => Math.log(x), (y) => Math.log(y)));
        } else {
            const points = filteredData.map(p => [Math.log(p.x), Math.log(p.y)]);
            ({ m, b } = ss.linearRegression(points));
            rSquared = ss.rSquared(filteredData.map(p => [p.x, p.y]), (x) => Math.exp(b) * Math.pow(x, m));
        }

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
        return { data: lineData, equation, rSquared, predict };
    }

    function calculateExponentialRegression(data) {
        const isWeighted = data[0].weight !== undefined;
        const filteredData = data.filter(p => p.y > 0);
        if (filteredData.length < 2) return null;

        let m, b, rSquared;

        if (isWeighted) {
            ({ m, b, rSquared } = calculateWeightedLinearRegression(filteredData, (x) => x, (y) => Math.log(y)));
        } else {
            const points = filteredData.map(p => [p.x, Math.log(p.y)]);
            ({ m, b } = ss.linearRegression(points));
            rSquared = ss.rSquared(filteredData.map(p => [p.x, p.y]), (x) => Math.exp(b) * Math.exp(m * x));
        }

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
        return { data: lineData, equation, rSquared, predict };
    }

    function calculateTheilSenRegression(data) {
        const isWeighted = data[0].weight !== undefined;
        if (data.length < 2) return null;

        let m, b, rSquared;

        function weightedMedian(values, weights) {
            const sortedIndices = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
            let sum = 0;
            const totalWeight = weights.reduce((a, b) => a + b, 0);
            for (const i of sortedIndices) {
                sum += weights[i];
                if (sum >= totalWeight / 2) {
                    return values[i];
                }
            }
            return values[sortedIndices[sortedIndices.length - 1]];
        }

        if (isWeighted) {
            const slopes = [];
            const weights = [];
            for (let i = 0; i < data.length; i++) {
                for (let j = i + 1; j < data.length; j++) {
                    if (data[j].x - data[i].x !== 0) {
                        slopes.push((data[j].y - data[i].y) / (data[j].x - data[i].x));
                        weights.push((data[i].weight + data[j].weight) / 2);
                    }
                }
            }
            m = weightedMedian(slopes, weights);
            const intercepts = data.map(p => p.y - m * p.x);
            const interceptWeights = data.map(p => p.weight);
            b = weightedMedian(intercepts, interceptWeights);

            const y_mean_weighted = data.reduce((sum, p) => sum + p.y * p.weight, 0) / data.reduce((sum, p) => sum + p.weight, 0);
            let ss_tot = 0;
            let ss_res = 0;
            for (const p of data) {
                ss_tot += p.weight * Math.pow(p.y - y_mean_weighted, 2);
                ss_res += p.weight * Math.pow(p.y - (m * p.x + b), 2);
            }
            rSquared = 1 - ss_res / ss_tot;
        } else {
            const points = data.map(p => [p.x, p.y]);
            const line = ss.theilSen(points);
            const xMin = config.options.scales.x.min;
            const xMax = config.options.scales.x.max;
            m = (line(xMax) - line(xMin)) / (xMax - xMin);
            b = line(xMin) - m * xMin;
            rSquared = ss.rSquared(points, line);
        }

        const line = (x) => m * x + b;
        const xMin = config.options.scales.x.min;
        const xMax = config.options.scales.x.max;

        const lineData = [
            { x: xMin, y: line(xMin) },
            { x: xMax, y: line(xMax) }
        ];

        const equation = `y = ${m.toFixed(2)}x + ${b.toFixed(2)}`;
        return { data: lineData, equation, rSquared, predict: line };
    }

    function calculateSigmoidalRegression(data) {
        const isWeighted = data[0].weight !== undefined;
        if (data.length < 3) return null;

        const xMin = Math.min(...data.map(p => p.x));
        const xMax = Math.max(...data.map(p => p.x));
        const yMin = Math.min(...data.map(p => p.y));
        const yMax = Math.max(...data.map(p => p.y));

        const normalizedData = data.map(p => ({
            x: (p.x - xMin) / (xMax - xMin),
            y: (p.y - yMin) / (yMax - yMin),
            weight: p.weight || 1
        }));

        let l = 1.0;
        let k = 1.0;
        let x0 = 0.5;
        const learningRate = 0.01;
        const iterations = 10000;

        for (let i = 0; i < iterations; i++) {
            let dL = 0;
            let dK = 0;
            let dX0 = 0;

            for (const p of normalizedData) {
                const exp_term = Math.exp(-k * (p.x - x0));
                const predicted_y = l / (1 + exp_term);
                const error = predicted_y - p.y;
                const weight = p.weight;

                dL += weight * error * (1 / (1 + exp_term));
                dK += weight * error * (l * exp_term * (p.x - x0)) / Math.pow(1 + exp_term, 2);
                dX0 += weight * error * (-l * exp_term * k) / Math.pow(1 + exp_term, 2);
            }

            l -= learningRate * dL;
            k -= learningRate * dK;
            x0 -= learningRate * dX0;
        }

        const predict = (x) => {
            const normalizedX = (x - xMin) / (xMax - xMin);
            const normalizedY = l / (1 + Math.exp(-k * (normalizedX - x0)));
            return normalizedY * (yMax - yMin) + yMin;
        };

        const chartXMin = config.options.scales.x.min;
        const chartXMax = config.options.scales.x.max;
        const step = (chartXMax - chartXMin) / 100;
        const lineData = [];

        for (let x = chartXMin; x <= chartXMax; x += step) {
            lineData.push({ x, y: predict(x) });
        }

        const equation = `y = ${yMax.toFixed(2)} / (1 + e^(-${k.toFixed(2)} * (x - ${x0.toFixed(2)})))`;
        let rSquared;

        if(isWeighted){
            const y_mean_weighted = data.reduce((sum, p) => sum + p.y * p.weight, 0) / data.reduce((sum, p) => sum + p.weight, 0);
            let ss_tot = 0;
            let ss_res = 0;
            for (const p of data) {
                ss_tot += p.weight * Math.pow(p.y - y_mean_weighted, 2);
                ss_res += p.weight * Math.pow(p.y - predict(p.x), 2);
            }
            rSquared = 1 - ss_res / ss_tot;
        } else {
            rSquared = ss.rSquared(data.map(p => [p.x, p.y]), predict);
        }

        return { data: lineData, equation, rSquared, predict };
    }
    // Function to update the points table
    function updateTable() {
        tableBody.innerHTML = '';
        chartData.forEach((point, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="number" id="xCor${index}" class="coordinate-input x-coordinate" data-index="${index}" value="${point.x}"></td>
                <td><input type="number" id="yCor${index}" class="coordinate-input y-coordinate" data-index="${index}" value="${point.y}"></td>
                <td><button class="delete-point-btn" data-index="${index}">Delete</button></td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Function to delete a point
    function deletePoint(index) {
        const point = chartData[index];
        undoStack.push({ type: 'delete', data: point, index: index }); // Also save index for redo

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

    tableBody.addEventListener('click', function(event) {
        if (event.target.classList.contains('delete-point-btn')) {
            const index = parseInt(event.target.getAttribute('data-index'));
            deletePoint(index);
        }
    });

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

        // Theil-Sen
        points = chartData;
        const theilSenResult = calculateTheilSenRegression(points);
        if (theilSenResult && isFinite(theilSenResult.rSquared)) {
            results.push({ type: 'theil-sen', rSquared: theilSenResult.rSquared });
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
                chartData.splice(lastAction.index, 0, lastAction.data);
            } else if (lastAction.type === 'edit') {
                chartData[lastAction.data.index][lastAction.data.field] = lastAction.data.newValue;
            } else if (lastAction.type === 'move') {
                const point = chartData[lastAction.data.index];
                point.x = lastAction.data.newX;
                point.y = lastAction.data.newY;
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
                chartData.splice(lastAction.index, 1);
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
            const oldX = selectedPoint.x;
            const oldY = selectedPoint.y;
            const newX = chartData[selectedPoint.index].x;
            const newY = chartData[selectedPoint.index].y;

            if (oldX !== newX || oldY !== newY) {
                undoStack.push({ type: 'move', data: { index: selectedPoint.index, oldX, oldY, newX, newY } });
            }
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

    document.getElementById("predict-button").addEventListener("click", function() {
        const x = parseFloat(document.getElementById("predict-x").value);
        if (!isNaN(x) && lineDataObj && lineDataObj.predict) {
            const predictedY = lineDataObj.predict(x);
            document.querySelector('.prediction-result span').innerText = predictedY.toFixed(4);
        } else {
            document.querySelector('.prediction-result span').innerText = '';
        }
    });
});