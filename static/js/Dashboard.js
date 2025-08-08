class PredictiveMaintenanceDashboard {
    constructor() {
        this.charts = {};
        this.updateInterval = null;
        this.refreshRate = 5000; // 5 seconds
        this.isSimulationRunning = false;
        this.currentDataIndex = 100; // Start with first 100 rows
        this.maxDataIndex = 0; // Will be set from server
        
        this.initializeCharts();
        this.setupEventListeners();
        this.loadInitialData();
    }

    initializeCharts() {
        // Trend Chart
        const trendCtx = document.getElementById('trendChart').getContext('2d');
        this.charts.trend = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Historical Data',
                        data: [],
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 1
                    },
                    {
                        label: 'Predicted Data',
                        data: [],
                        borderColor: '#FF9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Parameter Trend Analysis'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });

        // Control Chart
        const controlCtx = document.getElementById('controlChart').getContext('2d');
        this.charts.control = new Chart(controlCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Process Data',
                        data: [],
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#2196F3'
                    },
                    {
                        label: 'Center Line (UCL)',
                        data: [],
                        borderColor: '#4CAF50',
                        borderWidth: 2,
                        borderDash: [10, 5],
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Upper Control Limit',
                        data: [],
                        borderColor: '#f44336',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Lower Control Limit',
                        data: [],
                        borderColor: '#f44336',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Statistical Process Control Chart'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Sample Number'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    }
                }
            }
        });

        // Breakdown Prediction Chart
        const breakdownCtx = document.getElementById('breakdownChart').getContext('2d');
        this.charts.breakdown = new Chart(breakdownCtx, {
            type: 'doughnut',
            data: {
                labels: ['SP Fault Risk (%)', 'TK Fault Risk (%)', 'VP Fault Risk (%)'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#f44336',
                        '#FF9800',
                        '#FF5722'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Equipment Fault Risk Assessment'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed.toFixed(1) + '%';
                            }
                        }
                    }
                }
            }
        });

        // Multi-Parameter Chart
        const multiCtx = document.getElementById('multiParameterChart').getContext('2d');
        this.charts.multiParameter = new Chart(multiCtx, {
            type: 'radar',
            data: {
                labels: ['FI_4303', 'DI_3302', 'PI_0316', 'PI_0325', 'TI_5303', 'TI_5304'],
                datasets: [{
                    label: 'Current Values (Normalized)',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#667eea'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Multi-Parameter Overview'
                    }
                },
                scales: {
                    r: {
                        angleLines: {
                            display: true
                        },
                        suggestedMin: 0,
                        suggestedMax: 1,
                        ticks: {
                            stepSize: 0.2
                        }
                    }
                }
            }
        });
    }

    setupEventListeners() {
        // Simulation controls
        const startBtn = document.getElementById('startSimulation');
        const stopBtn = document.getElementById('stopSimulation');
        const refreshBtn = document.getElementById('refreshData');

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startSimulation();
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopSimulation();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshAllData();
            });
        }

        // Parameter selection
        const paramSelect = document.getElementById('parameterSelect');
        const controlParamSelect = document.getElementById('controlParameterSelect');

        if (paramSelect) {
            paramSelect.addEventListener('change', (e) => {
                this.updateTrendChart(e.target.value);
            });
        }

        if (controlParamSelect) {
            controlParamSelect.addEventListener('change', (e) => {
                this.updateControlChart(e.target.value);
            });
        }
    }

    async startSimulation() {
        try {
            const response = await fetch('/api/simulation/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.isSimulationRunning = true;
            this.updateSimulationStatus();
            this.showNotification('Simulation started successfully', 'success');
            
            // Start auto-refresh when simulation is running
            this.startDataRefresh();
        } catch (error) {
            console.error('Error starting simulation:', error);
            this.showNotification('Error starting simulation', 'error');
        }
    }

    async stopSimulation() {
        try {
            const response = await fetch('/api/simulation/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.isSimulationRunning = false;
            this.updateSimulationStatus();
            this.showNotification('Simulation stopped', 'info');
            
            // Stop auto-refresh
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
        } catch (error) {
            console.error('Error stopping simulation:', error);
            this.showNotification('Error stopping simulation', 'error');
        }
    }

    async updateSimulationStatus() {
        try {
            const response = await fetch('/api/simulation/status');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const status = await response.json();
            
            const statusElement = document.getElementById('simulationStatus');
            const progressElement = document.getElementById('progressFill');
            
            if (statusElement) {
                statusElement.textContent = status.active ? 'Running' : 'Stopped';
                statusElement.className = status.active ? 'status-running' : 'status-stopped';
            }
            
            if (progressElement) {
                progressElement.style.width = `${status.progress || 0}%`;
            }
            
            this.isSimulationRunning = status.active;
            this.currentDataIndex = status.current_index || this.currentDataIndex;
            this.maxDataIndex = status.max_index || this.maxDataIndex;
            
        } catch (error) {
            console.error('Error updating simulation status:', error);
        }
    }

    async loadInitialData() {
        this.showLoading(true);
        
        try {
            await Promise.all([
                this.updateKPIs(),
                this.updateCurrentData(),
                this.updateBreakdownPrediction(),
                this.updateEquipmentHealth(),
                this.updateDataTable()
            ]);

            // Update charts with current parameter selection
            const selectedParam = document.getElementById('parameterSelect')?.value || '310A_FI_4303';
            const selectedControlParam = document.getElementById('controlParameterSelect')?.value || '310A_FI_4303';
            
            await Promise.all([
                this.updateTrendChart(selectedParam),
                this.updateControlChart(selectedControlParam)
            ]);
            
            // Update simulation status
            await this.updateSimulationStatus();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showNotification('Error loading initial data', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async refreshAllData() {
        try {
            await Promise.all([
                this.updateKPIs(),
                this.updateCurrentData(),
                this.updateBreakdownPrediction(),
                this.updateDataTable()
            ]);

            // Update charts with current parameter selection
            const selectedParam = document.getElementById('parameterSelect')?.value || '310A_FI_4303';
            const selectedControlParam = document.getElementById('controlParameterSelect')?.value || '310A_FI_4303';
            
            await Promise.all([
                this.updateTrendChart(selectedParam),
                this.updateControlChart(selectedControlParam)
            ]);
            
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    async updateKPIs() {
        try {
            const response = await fetch('/api/kpis');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const kpis = await response.json();

            // Update KPI values
            this.updateKPIElement('mtbfValue', kpis.MTBF, 'hours');
            this.updateKPIElement('mttrValue', kpis.MTTR, 'hours');
            this.updateKPIElement('availabilityValue', kpis.Availability, '%');
            this.updateKPIElement('reliabilityValue', kpis.Reliability, '%');
            this.updateKPIElement('totalFaultsValue', kpis.Total_Faults, '');
            this.updateKPIElement('operatingHoursValue', kpis.Operating_Hours, 'hours');

            // Add visual indicators based on values
            this.updateKPIStatus('availabilityValue', parseFloat(kpis.Availability), [95, 85]);
            this.updateKPIStatus('reliabilityValue', parseFloat(kpis.Reliability), [95, 85]);
            
        } catch (error) {
            console.error('Error updating KPIs:', error);
        }
    }

    updateKPIElement(elementId, value, unit) {
        const element = document.getElementById(elementId);
        if (element) {
            const formattedValue = typeof value === 'number' ? value.toFixed(2) : (value || '0');
            element.textContent = formattedValue + (unit ? ' ' + unit : '');
        }
    }

    updateKPIStatus(elementId, value, thresholds) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const card = element.closest('.kpi-card');
        
        if (card) {
            card.classList.remove('alert', 'warning', 'good');
        }
        
        if (value >= thresholds[0]) {
            element.style.color = '#4CAF50';
            card?.classList.add('good');
        } else if (value >= thresholds[1]) {
            element.style.color = '#FF9800';
            card?.classList.add('warning');
        } else {
            element.style.color = '#f44336';
            card?.classList.add('alert');
        }
    }

    async updateCurrentData() {
        try {
            const response = await fetch('/api/current-data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.currentData = await response.json();
            
            // Update multi-parameter radar chart
            this.updateMultiParameterChart();
            
        } catch (error) {
            console.error('Error updating current data:', error);
        }
    }

    async updateBreakdownPrediction() {
        try {
            const response = await fetch('/api/breakdown-prediction');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const predictions = await response.json();

            // Update breakdown chart
            this.charts.breakdown.data.datasets[0].data = [
                (predictions.faulty_SP || 0) * 100,
                (predictions.faulty_TK || 0) * 100,
                (predictions.faulty_VP || 0) * 100
            ];
            this.charts.breakdown.update();

            // Update equipment health displays
            this.updateEquipmentHealthDisplay('sp', predictions.faulty_SP || 0);
            this.updateEquipmentHealthDisplay('tk', predictions.faulty_TK || 0);
            this.updateEquipmentHealthDisplay('vp', predictions.faulty_VP || 0);
            
        } catch (error) {
            console.error('Error updating breakdown prediction:', error);
        }
    }

    updateEquipmentHealthDisplay(equipment, faultProbability) {
        const healthPercent = Math.max(0, (1 - faultProbability) * 100);
        const riskPercent = faultProbability * 100;
        
        // Update health bar
        const healthBar = document.getElementById(`${equipment}HealthBar`);
        const healthPercentElement = document.getElementById(`${equipment}HealthPercent`);
        const faultRiskElement = document.getElementById(`${equipment}FaultRisk`);
        
        if (healthBar) {
            healthBar.style.width = `${healthPercent}%`;
            
            // Update health bar color
            if (healthPercent >= 80) {
                healthBar.style.background = 'linear-gradient(45deg, #4CAF50, #66BB6A)';
            } else if (healthPercent >= 60) {
                healthBar.style.background = 'linear-gradient(45deg, #FF9800, #FFB74D)';
            } else {
                healthBar.style.background = 'linear-gradient(45deg, #f44336, #ef5350)';
            }
        }
        
        if (healthPercentElement) {
            healthPercentElement.textContent = `${Math.round(healthPercent)}%`;
        }
        
        if (faultRiskElement) {
            faultRiskElement.textContent = `${Math.round(riskPercent)}%`;
            faultRiskElement.className = `fault-risk ${this.getRiskClass(riskPercent)}`;
        }
    }

    async updateEquipmentHealth() {
        // This method can be used for additional equipment health updates
        // Currently handled by updateBreakdownPrediction
    }

    getRiskClass(riskPercent) {
        if (riskPercent <= 25) return 'risk-low';
        if (riskPercent <= 50) return 'risk-medium';
        return 'risk-high';
    }

   async updateTrendChart(parameter = '310A_FI_4303') {
    try {
        const [currentResponse, predictionsResponse] = await Promise.all([
            fetch('/api/current-data'),
            fetch(`/api/predictions?parameter=${parameter}&steps=10`)
        ]);

        if (!currentResponse.ok || !predictionsResponse.ok) {
            throw new Error('Failed to fetch trend data');
        }

        const currentData = await currentResponse.json();
        const predictions = await predictionsResponse.json();

        if (!currentData.parameters || !currentData.parameters[parameter]) {
            console.warn(`Parameter ${parameter} not found in current data`);
            return;
        }

        const historicalData = currentData.parameters[parameter];
        const historicalTimestamps = currentData.timestamps;
        const predictedData = Object.fromEntries(predictions.predictions)[parameter] || [];
        const predictedTimestamps = predictions.timestamps || [];

        const maxPoints = 50;
        console.log(historicalData)
        console.log(predictedData)
        // Keep historical data capped at maxPoints
        let limitedHistoricalData = historicalData.slice(-maxPoints);
        let limitedHistoricalTimestamps = historicalTimestamps.slice(-maxPoints);

        // For predicted data, cap at maxPoints as well (usually small)
        let limitedPredictedData = predictedData.slice(-maxPoints);
        let limitedPredictedTimestamps = predictedTimestamps.slice(-maxPoints);

        // Now combine timestamps for X axis labels:
        // Last historical timestamps + predicted timestamps
        const combinedTimestamps = [
            ...limitedHistoricalTimestamps,
            ...limitedPredictedTimestamps
        ];

        // For historical dataset, pad with nulls to align with predicted data length
        const historicalNullPadding = Array(limitedPredictedData.length).fill(null);
        const historicalDataset = [...limitedHistoricalData, ...historicalNullPadding];

        // For predicted dataset, pad with nulls for all but last historical point,
        // then connect last historical value, then predicted data
        const nullPaddingLength = Math.max(0, limitedHistoricalData.length - 1);
        const predictedDataset = [
            ...Array(nullPaddingLength).fill(null),
            limitedHistoricalData[limitedHistoricalData.length - 1] || null,
            ...limitedPredictedData
        ];

        // Update chart
        this.charts.trend.data.labels = combinedTimestamps;
        this.charts.trend.data.datasets[0].data = historicalDataset;
        this.charts.trend.data.datasets[1].data = predictedDataset;

        this.charts.trend.options.plugins.title.text = `${parameter} - Trend Analysis`;
        this.charts.trend.update();

    } catch (error) {
        console.error('Error updating trend chart:', error);
    }
}



    async updateControlChart(parameter = '310A_FI_4303') {
        try {
            const response = await fetch('/api/current-data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const currentData = await response.json();

            if (!currentData.parameters || !currentData.parameters[parameter]) {
                console.warn(`Parameter ${parameter} not found in current data`);
                return;
            }

            const data = currentData.parameters[parameter];
            const timestamps = currentData.timestamps;

            // Show last 30 points for better visibility
            const maxPoints = 30;
            const startIndex = Math.max(0, data.length - maxPoints);
            const limitedData = data.slice(startIndex);
            const limitedTimestamps = timestamps.slice(startIndex);

            // Calculate control limits using all available data for statistical accuracy
            const mean = data.reduce((a, b) => a + b, 0) / data.length;
            const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
            const stdDev = Math.sqrt(variance);

            const ucl = mean + 3 * stdDev;
            const lcl = mean - 3 * stdDev;

            // Update chart
            this.charts.control.data.labels = limitedTimestamps.map((timestamp, index) => `${startIndex + index + 1}`);
            this.charts.control.data.datasets[0].data = limitedData;
            this.charts.control.data.datasets[1].data = Array(limitedData.length).fill(mean);
            this.charts.control.data.datasets[2].data = Array(limitedData.length).fill(ucl);
            this.charts.control.data.datasets[3].data = Array(limitedData.length).fill(lcl);

            // Highlight out-of-control points
            const pointColors = limitedData.map(value => {
                if (value > ucl || value < lcl) {
                    return '#f44336'; // Red for out-of-control
                }
                return '#2196F3'; // Blue for in-control
            });
            this.charts.control.data.datasets[0].pointBackgroundColor = pointColors;

            this.charts.control.options.plugins.title.text = `${parameter} - Control Chart`;
            this.charts.control.update();
            
        } catch (error) {
            console.error('Error updating control chart:', error);
        }
    }

    updateMultiParameterChart() {
        if (!this.currentData || !this.currentData.parameters) return;

        const parameters = ['310A_FI_4303', '310A_DI_3302', '310A_PI_0316', '310A_PI_0325', '310A_TI_5303_D', '310A_TI_5304_D'];
        const normalizedValues = [];

        parameters.forEach(param => {
            if (this.currentData.parameters[param] && this.currentData.parameters[param].length > 0) {
                const data = this.currentData.parameters[param];
                const latestValue = data[data.length - 1];
                const min = Math.min(...data);
                const max = Math.max(...data);
                
                // Normalize to 0-1 range
                const normalized = max > min ? (latestValue - min) / (max - min) : 0.5;
                normalizedValues.push(Math.max(0, Math.min(1, normalized))); // Ensure within bounds
            } else {
                normalizedValues.push(0);
            }
        });

        this.charts.multiParameter.data.datasets[0].data = normalizedValues;
        this.charts.multiParameter.update();
    }

    async updateDataTable() {
        try {
            const response = await fetch('/api/current-data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();

            if (!data.parameters || !data.timestamps) return;

            const tableBody = document.getElementById('dataTableBody');
            if (!tableBody) return;
            
            tableBody.innerHTML = '';

            // Show last 15 records
            const recordCount = Math.min(15, data.timestamps.length);
            const startIndex = data.timestamps.length - recordCount;

            for (let i = startIndex; i < data.timestamps.length; i++) {
                const row = document.createElement('tr');
                
                const timestamp = data.timestamps[i];
                const fi4303 = data.parameters['310A_FI_4303']?.[i];
                const di3302 = data.parameters['310A_DI_3302']?.[i];
                const pi0316 = data.parameters['310A_PI_0316']?.[i];
                const ti5303 = data.parameters['310A_TI_5303_D']?.[i];
                const ti5304 = data.parameters['310A_TI_5304_D']?.[i];
                const spFault = data.parameters['faulty_SP']?.[i] || 0;
                const tkFault = data.parameters['faulty_TK']?.[i] || 0;
                const vpFault = data.parameters['faulty_VP']?.[i] || 0;

                // Format timestamp
                const formattedTime = new Date(timestamp).toLocaleString();

                row.innerHTML = `
                    <td>${formattedTime}</td>
                    <td>${fi4303 !== undefined ? fi4303.toFixed(2) : 'N/A'}</td>
                    <td>${di3302 !== undefined ? di3302.toFixed(3) : 'N/A'}</td>
                    <td>${pi0316 !== undefined ? pi0316.toFixed(2) : 'N/A'}</td>
                    <td>${ti5303 !== undefined ? ti5303.toFixed(0) : 'N/A'}</td>
                    <td>${ti5304 !== undefined ? ti5304.toFixed(0) : 'N/A'}</td>
                    <td><span class="status-indicator ${spFault ? 'status-error' : 'status-ok'}"></span>${spFault ? 'FAULT' : 'OK'}</td>
                    <td><span class="status-indicator ${tkFault ? 'status-error' : 'status-ok'}"></span>${tkFault ? 'FAULT' : 'OK'}</td>
                    <td><span class="status-indicator ${vpFault ? 'status-error' : 'status-ok'}"></span>${vpFault ? 'FAULT' : 'OK'}</td>
                `;

                tableBody.appendChild(row);
            }
        } catch (error) {
            console.error('Error updating data table:', error);
        }
    }

    startDataRefresh() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(async () => {
            await this.updateSimulationStatus();
            
            if (this.isSimulationRunning) {
                await this.refreshAllData();
            }
        }, this.refreshRate);
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            if (show) {
                overlay.classList.add('show');
            } else {
                overlay.classList.remove('show');
            }
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            min-width: 300px;
            animation: slideIn 0.3s ease;
            font-family: Arial, sans-serif;
        `;

        // Add close functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 1.2rem;
            cursor: pointer;
            margin-left: auto;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    getNotificationColor(type) {
        switch (type) {
            case 'success': return '#4CAF50';
            case 'error': return '#f44336';
            case 'warning': return '#FF9800';
            default: return '#2196F3';
        }
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Destroy all charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    }

    // Helper method to format numbers
    formatNumber(value, decimals = 2) {
        if (typeof value !== 'number') return 'N/A';
        return value.toFixed(decimals);
    }

    // Helper method to get parameter display name
    getParameterDisplayName(parameter) {
        const parameterNames = {
            '310A_FI_4303': 'Flow Indicator 4303',
            '310A_DI_3302': 'Density Indicator 3302',
            '310A_PI_0316': 'Pressure Indicator 0316',
            '310A_PI_0325': 'Pressure Indicator 0325',
            '310A_TI_5303_D': 'Temperature Indicator 5303',
            '310A_TI_5304_D': 'Temperature Indicator 5304',
            '310A_FI_4301': 'Flow Indicator 4301',
            '310A_PDI_0308': 'Pressure Differential 0308',
            '310A_PI_0578': 'Pressure Indicator 0578',
            '310A_PI_0580': 'Pressure Indicator 0580'
        };
        return parameterNames[parameter] || parameter;
    }

    // Method to export current data as CSV
    exportData() {
        if (!this.currentData || !this.currentData.parameters) {
            this.showNotification('No data available to export', 'warning');
            return;
        }

        const parameters = Object.keys(this.currentData.parameters);
        const timestamps = this.currentData.timestamps;
        
        // Create CSV content
        let csvContent = 'Timestamp,' + parameters.join(',') + '\n';
        
        for (let i = 0; i < timestamps.length; i++) {
            const row = [timestamps[i]];
            parameters.forEach(param => {
                row.push(this.currentData.parameters[param][i] || '');
            });
            csvContent += row.join(',') + '\n';
        }

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `predictive_maintenance_data_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showNotification('Data exported successfully', 'success');
    }

    // Method to handle chart resize
    handleResize() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    // Method to update chart theme (for dark/light mode switching)
    updateChartTheme(isDark = false) {
        const textColor = isDark ? '#ffffff' : '#333333';
        const gridColor = isDark ? '#444444' : '#e0e0e0';
        
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.options) {
                // Update text colors
                if (chart.options.plugins && chart.options.plugins.title) {
                    chart.options.plugins.title.color = textColor;
                }
                if (chart.options.plugins && chart.options.plugins.legend) {
                    chart.options.plugins.legend.labels = chart.options.plugins.legend.labels || {};
                    chart.options.plugins.legend.labels.color = textColor;
                }
                
                // Update scale colors
                if (chart.options.scales) {
                    Object.values(chart.options.scales).forEach(scale => {
                        if (scale.title) {
                            scale.title.color = textColor;
                        }
                        scale.ticks = scale.ticks || {};
                        scale.ticks.color = textColor;
                        scale.grid = scale.grid || {};
                        scale.grid.color = gridColor;
                    });
                }
                
                chart.update();
            }
        });
    }

    // Method to get health status text and color
    getHealthStatus(percentage) {
        if (percentage >= 90) return { text: 'Excellent', color: '#4CAF50' };
        if (percentage >= 80) return { text: 'Good', color: '#8BC34A' };
        if (percentage >= 70) return { text: 'Fair', color: '#FFC107' };
        if (percentage >= 60) return { text: 'Poor', color: '#FF9800' };
        return { text: 'Critical', color: '#f44336' };
    }

    // Method to calculate equipment overall health score
    calculateOverallHealth() {
        if (!this.currentData || !this.currentData.parameters) return 0;
        
        const parameters = ['310A_FI_4303', '310A_DI_3302', '310A_PI_0316', '310A_TI_5303_D', '310A_TI_5304_D'];
        let totalScore = 0;
        let validParameters = 0;
        
        parameters.forEach(param => {
            if (this.currentData.parameters[param] && this.currentData.parameters[param].length > 0) {
                const data = this.currentData.parameters[param];
                const latestValue = data[data.length - 1];
                const mean = data.reduce((a, b) => a + b, 0) / data.length;
                const stdDev = Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length);
                
                // Calculate parameter health based on deviation from mean
                const deviation = Math.abs(latestValue - mean);
                const normalizedDeviation = stdDev > 0 ? deviation / stdDev : 0;
                const parameterHealth = Math.max(0, 100 - (normalizedDeviation * 20));
                
                totalScore += parameterHealth;
                validParameters++;
            }
        });
        
        return validParameters > 0 ? totalScore / validParameters : 0;
    }

    // Method to update overall system health display
    updateSystemHealth() {
        const overallHealth = this.calculateOverallHealth();
        const healthElement = document.getElementById('systemHealth');
        const healthStatus = this.getHealthStatus(overallHealth);
        
        if (healthElement) {
            healthElement.innerHTML = `
                <div class="health-score" style="color: ${healthStatus.color}">
                    ${overallHealth.toFixed(1)}%
                </div>
                <div class="health-status" style="color: ${healthStatus.color}">
                    ${healthStatus.text}
                </div>
            `;
        }
    }
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification {
        transition: all 0.3s ease;
    }
    
    .notification:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    }
    
    .status-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 5px;
    }
    
    .status-ok {
        background-color: #4CAF50;
    }
    
    .status-error {
        background-color: #f44336;
    }
    
    .status-warning {
        background-color: #FF9800;
    }
    
    .risk-low {
        color: #4CAF50;
        font-weight: bold;
    }
    
    .risk-medium {
        color: #FF9800;
        font-weight: bold;
    }
    
    .risk-high {
        color: #f44336;
        font-weight: bold;
    }
    
    .kpi-card.good {
        border-left: 4px solid #4CAF50;
    }
    
    .kpi-card.warning {
        border-left: 4px solid #FF9800;
    }
    
    .kpi-card.alert {
        border-left: 4px solid #f44336;
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(244, 67, 54, 0); }
        100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); }
    }
    
    .status-running {
        color: #4CAF50;
        font-weight: bold;
    }
    
    .status-stopped {
        color: #f44336;
        font-weight: bold;
    }
`;
document.head.appendChild(style);

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new PredictiveMaintenanceDashboard();
    
    // Add window resize handler
    window.addEventListener('resize', () => {
        if (window.dashboard) {
            window.dashboard.handleResize();
        }
    });
    
    // Add export button functionality if it exists
    const exportBtn = document.getElementById('exportData');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (window.dashboard) {
                window.dashboard.exportData();
            }
        });
    }
    
    // Add theme toggle functionality if it exists
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-theme');
            if (window.dashboard) {
                window.dashboard.updateChartTheme(isDark);
            }
        });
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboard) {
        window.dashboard.destroy();
    }
});

// Error handling for chart.js
window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('Chart')) {
        console.error('Chart.js error detected:', event.error);
        if (window.dashboard) {
            window.dashboard.showNotification('Chart rendering error detected. Please refresh the page.', 'error');
        }
    }
});

// Performance monitoring
if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark('dashboard-script-loaded');
}