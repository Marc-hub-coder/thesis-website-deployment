const PREDICTION_API_BASE_URL = process.env.REACT_APP_PREDICTION_API_URL || 'http://localhost:5000';

class PredictionService {
  async getPredictions(location = '') {
    try {
      const response = await fetch(`${PREDICTION_API_BASE_URL}/predict_all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location }),
      });

      if (!response.ok) {
        throw new Error(`Prediction API error: ${response.status}`);
      }

      const data = await response.json();
      return data.predictions;
    } catch (error) {
      console.error('Error fetching predictions:', error);
      throw error;
    }
  }

  async getPMPredictions(values) {
    try {
      const response = await fetch(`${PREDICTION_API_BASE_URL}/predict_pm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      });

      if (!response.ok) {
        throw new Error(`PM prediction API error: ${response.status}`);
      }

      const data = await response.json();
      return data.forecast;
    } catch (error) {
      console.error('Error fetching PM predictions:', error);
      throw error;
    }
  }

  async getNO2Predictions(values) {
    try {
      const response = await fetch(`${PREDICTION_API_BASE_URL}/predict_no2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      });

      if (!response.ok) {
        throw new Error(`NO2 prediction API error: ${response.status}`);
      }

      const data = await response.json();
      return data.forecast;
    } catch (error) {
      console.error('Error fetching NO2 predictions:', error);
      throw error;
    }
  }

  async getCOPredictions(values) {
    try {
      const response = await fetch(`${PREDICTION_API_BASE_URL}/predict_co`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      });

      if (!response.ok) {
        throw new Error(`CO prediction API error: ${response.status}`);
      }

      const data = await response.json();
      return data.forecast;
    } catch (error) {
      console.error('Error fetching CO predictions:', error);
      throw error;
    }
  }

  async checkAPIHealth() {
    try {
      const response = await fetch(`${PREDICTION_API_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking API health:', error);
      throw error;
    }
  }

  // Helper method to format prediction data for display
  formatPredictionData(predictions) {
    if (!predictions) return null;

    const result = {
      pm25: null,
      pm10: null,
      no2: null,
      co: null
    };

    // Extract PM predictions
    if (predictions.pm && Array.isArray(predictions.pm)) {
      const pmData = predictions.pm[0]; // Get first hour prediction
      if (pmData) {
        result.pm25 = pmData['PM2.5'];
        result.pm10 = pmData['PM10'];
      }
    }

    // Extract NO2 predictions
    if (predictions.no2 && Array.isArray(predictions.no2)) {
      const no2Data = predictions.no2[0]; // Get first hour prediction
      if (no2Data) {
        result.no2 = no2Data['NO2'];
      }
    }

    // Extract CO predictions
    if (predictions.co && Array.isArray(predictions.co)) {
      const coData = predictions.co[0]; // Get first hour prediction
      if (coData) {
        result.co = coData['CO'];
      }
    }

    return result;
  }

  // Helper method to get prediction summary for display
  getPredictionSummary(predictions) {
    const formatted = this.formatPredictionData(predictions);
    if (!formatted) return null;

    return {
      pm25: formatted.pm25 ? `${formatted.pm25.toFixed(2)} μg/m³` : 'N/A',
      pm10: formatted.pm10 ? `${formatted.pm10.toFixed(2)} μg/m³` : 'N/A',
      no2: formatted.no2 ? `${formatted.no2.toFixed(2)} ppm` : 'N/A',
      co: formatted.co ? `${formatted.co.toFixed(2)} ppm` : 'N/A'
    };
  }

  // Helper to get first 3-hour horizon summary for each pollutant
  getTop3HourSummary(predictions) {
    if (!predictions) return null;

    const fmt = (val, unit) => (Number.isFinite(val) ? `${val.toFixed(2)} ${unit}` : 'N/A');

    const top3 = {
      pm25: [],
      pm10: [],
      no2: [],
      co: []
    };

    // PM: array of { hour_ahead, PM2.5, PM10 }
    if (Array.isArray(predictions.pm)) {
      const n = Math.min(3, predictions.pm.length);
      for (let i = 0; i < n; i++) {
        const row = predictions.pm[i] || {};
        top3.pm25.push(fmt(Number(row['PM2.5']), 'μg/m³'));
        top3.pm10.push(fmt(Number(row['PM10']), 'μg/m³'));
      }
    }

    // NO2: array of { hour_ahead, NO2 }
    if (Array.isArray(predictions.no2)) {
      const n = Math.min(3, predictions.no2.length);
      for (let i = 0; i < n; i++) {
        const row = predictions.no2[i] || {};
        top3.no2.push(fmt(Number(row['NO2']), 'ppm'));
      }
    }

    // CO: array of { hour_ahead, CO }
    if (Array.isArray(predictions.co)) {
      const n = Math.min(3, predictions.co.length);
      for (let i = 0; i < n; i++) {
        const row = predictions.co[i] || {};
        top3.co.push(fmt(Number(row['CO']), 'ppm'));
      }
    }

    // Ensure lists have exactly 3 items (fill with N/A if fewer)
    const padTo3 = (arr, unit) => {
      const out = arr.slice(0, 3);
      while (out.length < 3) out.push('N/A');
      return out;
    };

    top3.pm25 = padTo3(top3.pm25);
    top3.pm10 = padTo3(top3.pm10);
    top3.no2 = padTo3(top3.no2);
    top3.co = padTo3(top3.co);

    return top3;
  }
}

export const predictionService = new PredictionService();
