// Test script to verify backend predictions are working
// Run this in your browser console after deployment

async function testBackendPredictions() {
  const backendUrl = process.env.REACT_APP_PREDICTION_API_URL || 'https://thesis-backend-zrcb.onrender.com';
  
  console.log('Testing backend predictions...');
  console.log('Backend URL:', backendUrl);
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${backendUrl}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Backend health check passed');
      console.log('Health data:', healthData);
    } else {
      console.log('❌ Backend health check failed:', healthResponse.status);
    }
  } catch (error) {
    console.log('❌ Backend health check error:', error.message);
  }
  
  try {
    // Test predictions endpoint
    console.log('\n2. Testing predictions endpoint...');
    const predictionResponse = await fetch(`${backendUrl}/predict_all`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (predictionResponse.ok) {
      const predictionData = await predictionResponse.json();
      console.log('✅ Predictions endpoint working');
      console.log('Prediction data structure:', {
        hasPredictions: !!predictionData.predictions,
        pmData: predictionData.predictions?.pm ? predictionData.predictions.pm.slice(0, 2) : 'No PM data',
        no2Data: predictionData.predictions?.no2 ? predictionData.predictions.no2.slice(0, 2) : 'No NO2 data',
        coData: predictionData.predictions?.co ? predictionData.predictions.co.slice(0, 2) : 'No CO data',
        totalInstances: predictionData.total_instances,
        lastUpdated: predictionData.last_updated
      });
    } else {
      console.log('❌ Predictions endpoint failed:', predictionResponse.status);
      const errorText = await predictionResponse.text();
      console.log('Error details:', errorText);
    }
  } catch (error) {
    console.log('❌ Predictions endpoint error:', error.message);
  }
}

// Run the test
testBackendPredictions();
