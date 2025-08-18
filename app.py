from flask import Flask, render_template, jsonify, request
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import joblib
import os
import json
from utils.data_processing import DataProcessor
import threading
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'

class PredictiveMaintenanceApp:
    def __init__(self):
        self.data_processor = DataProcessor()
        self.current_index = 250  # Start with first 100 rows
        self.simulation_active = False
        self.simulation_interval = 5  # seconds
        self.load_models()
        self.load_data()
        
    def load_data(self):
        """Load the CSV data"""
        try:
            self.df = pd.read_csv('data/Cleared_df0.csv')
            # Add timestamp for simulation
            base_time = datetime.now() - timedelta(hours=len(self.df))
            self.df['timestamp'] = [base_time + timedelta(hours=2*i) for i in range(len(self.df))]
            self.total_rows = len(self.df)
            print(f"Loaded {self.total_rows} rows of data")
        except Exception as e:
            print(f"Error loading data: {e}")
            self.df = pd.DataFrame()
            
    def load_models(self):
        """Load pre-trained models"""
        self.models = {
            'breakdown': {},
            'forecast': {}
        }
        
        # Load breakdown prediction models
        try:
            breakdown_path = 'models/Breakdown/'
            if os.path.exists(f'{breakdown_path}rf_model.joblib'):
                self.models['breakdown']['rf'] = joblib.load(f'{breakdown_path}rf_model.joblib')
            if os.path.exists(f'{breakdown_path}nn_model.joblib'):
                self.models['breakdown']['nn'] = joblib.load(f'{breakdown_path}nn_model.joblib')
            if os.path.exists(f'{breakdown_path}scaler.joblib'):
                self.models['breakdown']['scaler'] = joblib.load(f'{breakdown_path}scaler.joblib')
        except Exception as e:
            print(f"Error loading breakdown models: {e}")
            
        # Load forecasting models
        try:
            forecast_path = 'models/Forecast/'
            forecast_files = [f for f in os.listdir(forecast_path) if f.endswith('.joblib')]
            for file in forecast_files:
                model_name = file.replace('.joblib', '')
                self.models['forecast'][model_name] = joblib.load(f'{forecast_path}{file}')
        except Exception as e:
            print(f"Error loading forecast models: {e}")
    
    def get_current_data(self):
        """Get data up to current index"""
        if self.df.empty:
            return pd.DataFrame()
        return self.df.iloc[:self.current_index].copy()
    
    def predict_next_values(self, steps=10):
        """Predict next values for key parameters"""
        predictions = {}
        current_data = self.get_current_data()
        
        if current_data.empty:
            return predictions
            
        # Key parameters to predict
        key_params = [
            '310A_FI_4303', '310A_DI_3302', '310A_PI_0316', '310A_PI_0325',
            '310A_PI_0578', '310A_PI_0580', '310A_FI_4301', '310ASP01DI01SPM',
            '310ASP01SI01SPM', '310A_TI_5303_D', '310A_TI_5304_D', '310A_PDI_0308'
        ]
        scaler=self.models['forecast']['scaler']
        
        predictions= DataProcessor.XGBoost_forecast(current_data.drop(columns=['faulty_SP','faulty_VP','faulty_TK','timestamp']),self.models['forecast'],key_params,scaler)
        serializable_data = [[k, v.tolist()] for k, v in predictions.items()]
        return serializable_data
    
    def predict_breakdown(self):
        """Predict breakdown probability"""
        current_data = self.get_current_data()
        
        if current_data.empty or len(current_data) < 10:
            return {
                'faulty_SP': 0.1,
                'faulty_TK': 0.1,
                'faulty_VP': 0.1
            }
        
        # Use last row features for prediction
        latest_features = current_data.iloc[-1][[
            '310A_FI_4303', '310A_DI_3302', '310A_PI_0316', '310A_PI_0325',
            '310A_PI_0578', '310A_PI_0580', '310A_FI_4301', '310ASP01DI01SPM',
            '310ASP01SI01SPM', '310A_TI_5303_D', '310A_TI_5304_D', '310A_PDI_0308'
        ]].values.reshape(1, -1)
        
        try:
            if 'scaler' in self.models['breakdown']:
                scaled_features = self.models['breakdown']['scaler'].transform(latest_features)
                
                predictions = {}
                if 'rf' in self.models['breakdown']:
                    # Assume Random Forest predicts  three fault types
                    rf_pred = self.models['breakdown']['rf'].predict_proba(scaled_features)
                    rf_pred = np.array(rf_pred)
                    predictions = {
                        'faulty_SP': float(np.array(rf_pred[0][0][1])) ,
                        'faulty_TK': float(np.array(rf_pred[1][0][1])) ,
                        'faulty_VP': float(np.array(rf_pred[2][0][1])) 
                    }
                return predictions
        except Exception as e:
            print(f"Error in breakdown prediction: {e}")
        
        # Fallback to simple heuristic
        return {
            'faulty_SP': 0,
            'faulty_TK': 0,
            'faulty_VP': 0
        }
    
    def calculate_kpis(self, equipment=None):
        """
        Calculate KPIs for each component or a specific one.
        If equipment is None or 'all', returns KPIs for all components.
        """
        current_data = self.get_current_data()
        if current_data.empty:
            return {}

        fault_columns = ['faulty_SP', 'faulty_TK', 'faulty_VP']
        kpi_results = {}

        # Helper to calculate KPIs for a single component
        def kpi_for_component(fault_col):
            total_faults = current_data[fault_col].sum()
            operating_hours = len(current_data)*2
            mtbf = operating_hours / max(1, total_faults)
            mttr = 0.25  # Assume 2 hours average repair time
            availability = (operating_hours - total_faults * mttr) / operating_hours * 100
            reliability = ((operating_hours - total_faults) / operating_hours) * 100
            return {
                'MTBF': round(mtbf, 2),
                'MTTR': round(mttr, 2),
                'Availability': round(max(0, availability), 2),
                'Reliability': round(max(0, reliability), 2),
                'Total_Faults': int(total_faults),
                'Operating_Hours': operating_hours
            }

        # Map equipment value to fault column
        equipment_map = {
            'sp': 'faulty_SP',
            'tk': 'faulty_TK',
            'vp': 'faulty_VP'
        }

        if equipment is None or equipment == 'all':
            # Calculate for all components
            for key, fault_col in equipment_map.items():
                kpi_results[key] = kpi_for_component(fault_col)
            return kpi_results
        else:
            fault_col = equipment_map.get(equipment.lower())
            if fault_col:
                return kpi_for_component(fault_col)
            else:
                return {}

    def start_simulation(self):
        """Start real-time simulation"""
        if not self.simulation_active:
            self.simulation_active = True
            simulation_thread = threading.Thread(target=self._simulation_loop)
            simulation_thread.daemon = True
            simulation_thread.start()
    
    def stop_simulation(self):
        """Stop real-time simulation"""
        self.simulation_active = False
    
    def _simulation_loop(self):
        """Simulation loop that adds new data points"""
        while self.simulation_active and self.current_index < self.total_rows:
            time.sleep(self.simulation_interval)
            self.current_index += 1
            if self.current_index >= self.total_rows:
                self.simulation_active = False
                break

# Initialize the application
pm_app = PredictiveMaintenanceApp()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/current-data')
def get_current_data():
    """Get current historical data"""
    current_data = pm_app.get_current_data()
    
    if current_data.empty:
        return jsonify({'error': 'No data available'}), 404
    
    # Convert to format suitable for charts
    data = {
        'timestamps': current_data['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S').tolist(),
        'parameters': {}
    }
    
    # Key parameters for visualization
    key_params = [
        '310A_FI_4303', '310A_DI_3302', '310A_PI_0316', '310A_PI_0325',
        '310A_PI_0578', '310A_PI_0580', '310A_FI_4301', '310ASP01DI01SPM',
        '310ASP01SI01SPM', '310A_TI_5303_D', '310A_TI_5304_D', '310A_PDI_0308'
    ]
    
    for param in key_params:
        if param in current_data.columns:
            data['parameters'][param] = current_data[param].tolist()
    
    # Add fault data
    fault_params = ['faulty_SP', 'faulty_TK', 'faulty_VP']
    for param in fault_params:
        if param in current_data.columns:
            data['parameters'][param] = current_data[param].tolist()
    
    return jsonify(data)

@app.route('/api/predictions')
def get_predictions():
    """Get predictions for next time steps"""
    steps = request.args.get('steps', 10, type=int)
    predictions = pm_app.predict_next_values(steps)
    
    # Generate future timestamps
    current_data = pm_app.get_current_data()
    if not current_data.empty:
        last_timestamp = current_data['timestamp'].iloc[-1]
        future_timestamps = [(last_timestamp + timedelta(hours=i+1)).strftime('%Y-%m-%d %H:%M:%S') 
                           for i in range(steps)]
    else:
        future_timestamps = []
    
    return jsonify({
        'timestamps': future_timestamps,
        'predictions': predictions
    })

@app.route('/api/breakdown-prediction')
def get_breakdown_prediction():
    """Get breakdown probability predictions"""
    predictions = pm_app.predict_breakdown()
    return jsonify(predictions)

@app.route('/api/kpis')
def get_kpis():
    """
    Get KPI calculations for a specific equipment or all.
    Query param: equipment=sp|tk|vp|all (default: all)
    """
    equipment = request.args.get('equipment', 'all').lower()
    kpis = pm_app.calculate_kpis(equipment)
    return jsonify(kpis)

@app.route('/api/simulation/start', methods=["POST"])
def start_simulation():
    """Start real-time simulation"""
    pm_app.start_simulation()
    return jsonify({'status': 'Simulation started'})

@app.route('/api/simulation/stop', methods=["POST"])
def stop_simulation():
    """Stop real-time simulation"""
    pm_app.stop_simulation()
    return jsonify({'status': 'Simulation stopped'})

@app.route('/api/simulation/status')
def simulation_status():
    """Get simulation status"""
    return jsonify({
        'active': pm_app.simulation_active,
        'current_index': pm_app.current_index,
        'total_rows': pm_app.total_rows,
        'progress': (pm_app.current_index / pm_app.total_rows * 100) if pm_app.total_rows > 0 else 0
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)