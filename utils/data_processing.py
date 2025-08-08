import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.preprocessing import StandardScaler,MinMaxScaler
import warnings

warnings.filterwarnings('ignore')

class DataProcessor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.feature_columns = [
            '310A_FI_4303', '310A_DI_3302', '310A_PI_0316', '310A_PI_0325',
            '310A_PI_0578', '310A_PI_0580', '310A_FI_4301', '310ASP01DI01SPM',
            '310ASP01SI01SPM', '310A_TI_5303_D', '310A_TI_5304_D', '310A_PDI_0308'
        ]
        self.fault_columns = ['faulty_SP', 'faulty_TK', 'faulty_VP']
    
    def preprocess_data(self, df, fit_scaler=False):
        """
        Preprocess the data for model input
        """
        # Create a copy to avoid modifying original data
        processed_df = df.copy()
        
        # Handle missing values
        processed_df = processed_df.fillna(method='ffill').fillna(method='bfill')
        
        # Extract features
        features = processed_df[self.feature_columns].values
        
        # Scale features
        if fit_scaler:
            scaled_features = self.scaler.fit_transform(features)
        else:
            scaled_features = self.scaler.transform(features)
        
        return scaled_features, processed_df
    
    def create_sequences(self, data, sequence_length=10, target_columns=None):
        """
        Create sequences for time series prediction
        """
        if target_columns is None:
            target_columns = self.feature_columns
            
        sequences = []
        targets = []
        
        for i in range(len(data) - sequence_length):
            sequences.append(data[i:i+sequence_length])
            targets.append(data[i+sequence_length])
        
        return np.array(sequences), np.array(targets)
    
    def calculate_statistical_features(self, df, window_size=24):
        """
        Calculate rolling statistical features
        """
        features_df = df.copy()
        
        for col in self.feature_columns:
            if col in features_df.columns:
                # Rolling statistics
                features_df[f'{col}_mean_{window_size}h'] = features_df[col].rolling(window=window_size, min_periods=1).mean()
                features_df[f'{col}_std_{window_size}h'] = features_df[col].rolling(window=window_size, min_periods=1).std()
                features_df[f'{col}_min_{window_size}h'] = features_df[col].rolling(window=window_size, min_periods=1).min()
                features_df[f'{col}_max_{window_size}h'] = features_df[col].rolling(window=window_size, min_periods=1).max()
                
                # Lag features
                features_df[f'{col}_lag_1'] = features_df[col].shift(1)
                features_df[f'{col}_lag_24'] = features_df[col].shift(24)
                
                # Rate of change
                features_df[f'{col}_roc'] = features_df[col].pct_change()
        
        return features_df.fillna(method='ffill').fillna(0)
    
    def detect_anomalies(self, df, threshold=3):
        """
        Detect anomalies using statistical methods
        """
        anomalies_df = df.copy()
        anomaly_flags = {}
        
        for col in self.feature_columns:
            if col in df.columns:
                # Z-score based anomaly detection
                z_scores = np.abs((df[col] - df[col].mean()) / df[col].std())
                anomaly_flags[f'{col}_anomaly'] = (z_scores > threshold).astype(int)
        
        for col, flags in anomaly_flags.items():
            anomalies_df[col] = flags
        
        return anomalies_df
    
    def calculate_equipment_health_score(self, df):
        """
        Calculate overall equipment health score
        """
        if df.empty:
            return pd.Series()
        
        health_scores = []
        
        for idx, row in df.iterrows():
            # Base score starts at 100
            score = 100.0
            
            # Deduct points for faults
            for fault_col in self.fault_columns:
                if fault_col in row and row[fault_col] == 1:
                    score -= 30  # Each fault reduces score by 30 points
            
            # Deduct points for parameter deviations
            for param in self.feature_columns:
                if param in row:
                    # Calculate deviation from normal range (simplified)
                    param_mean = df[param].mean()
                    param_std = df[param].std()
                    deviation = abs(row[param] - param_mean) / max(param_std, 0.1)
                    
                    if deviation > 2:  # More than 2 standard deviations
                        score -= min(20, deviation * 5)  # Max 20 points deduction per parameter
            
            health_scores.append(max(0, min(100, score)))  # Keep score between 0 and 100
        
        return pd.Series(health_scores, index=df.index)
    

    def XGBoost_forecast(df, models, target_columns, scaler,lag=10):
        target_columns = df.columns
        scaled_data = scaler.transform(df)
        scaled_df = pd.DataFrame(scaled_data, columns=df.columns)

        Pred = {}
        y_pred_unscaled = {}

        for i, target_col in enumerate(target_columns):
            lagged_columns = []
            for col in df.columns:
                for j in range(1, 11):
                    lagged = scaled_df[col].shift(j)
                    lagged.name = f'{col}_lag{j}'
                    lagged_columns.append(lagged)

            lagged_df = pd.concat(lagged_columns, axis=1)
            lagged_df['target'] = scaled_df[target_col]
            lagged_df = lagged_df.dropna()

            X = lagged_df.drop(columns='target')
            y = lagged_df['target']

            y_pred = models[target_col].predict(X)
            y_pred_temp = y_pred.reshape(-1, 1)

            dummy_pred = np.zeros((len(y_pred_temp), scaled_df.shape[1]))  # Correct shape
            dummy_pred[:, i] = y_pred_temp.flatten()
            y_pred_unscaled[target_col] = scaler.inverse_transform(dummy_pred)[:, i]
        return y_pred_unscaled
    def prepare_control_chart_data(self, df, parameter, window_size=20):
        """
        Prepare data for control charts (SPC)
        """
        if parameter not in df.columns:
            return {}
        
        data = df[parameter].dropna()
        
        # Calculate control limits
        center_line = data.mean()
        std_dev = data.std()
        
        ucl = center_line + 3 * std_dev  # Upper Control Limit
        lcl = center_line - 3 * std_dev  # Lower Control Limit
        
        # Calculate moving range for process capability
        moving_range = data.diff().abs()
        mr_mean = moving_range.mean()
        
        # Warning limits (2 sigma)
        uwl = center_line + 2 * std_dev  # Upper Warning Limit
        lwl = center_line - 2 * std_dev  # Lower Warning Limit
        
        # Identify out-of-control points
        out_of_control = (data > ucl) | (data < lcl)
        
        return {
            'data': data.tolist(),
            'timestamps': df.loc[data.index, 'timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S').tolist() if 'timestamp' in df.columns else list(range(len(data))),
            'center_line': center_line,
            'ucl': ucl,
            'lcl': lcl,
            'uwl': uwl,
            'lwl': lwl,
            'out_of_control': out_of_control.tolist(),
            'mr_mean': mr_mean,
            'parameter': parameter
        }
    
    def calculate_process_capability(self, df, parameter, usl=None, lsl=None):
        """
        Calculate process capability indices
        """
        if parameter not in df.columns:
            return {}
        
        data = df[parameter].dropna()
        
        if len(data) < 2:
            return {}
        
        mean = data.mean()
        std = data.std()
        
        capability = {
            'mean': mean,
            'std': std,
            'Cp': None,
            'Cpk': None,
            'Pp': None,
            'Ppk': None
        }
        
        if usl is not None and lsl is not None:
            # Process capability indices
            cp = (usl - lsl) / (6 * std) if std > 0 else None
            cpk_upper = (usl - mean) / (3 * std) if std > 0 else None
            cpk_lower = (mean - lsl) / (3 * std) if std > 0 else None
            cpk = min(cpk_upper, cpk_lower) if cpk_upper is not None and cpk_lower is not None else None
            
            capability.update({
                'Cp': cp,
                'Cpk': cpk,
                'USL': usl,
                'LSL': lsl
            })
        
        return capability