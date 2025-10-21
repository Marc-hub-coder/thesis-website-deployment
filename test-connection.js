// Test script to verify backend connection
// Run this in your browser console after deployment

async function testBackendConnection() {
  const backendUrl = process.env.REACT_APP_PREDICTION_API_URL || 'https://thesis-backend-zrcb.onrender.com';
  
  console.log('Testing backend connection...');
  console.log('Backend URL:', backendUrl);
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${backendUrl}/health`);
    if (healthResponse.ok) {
      console.log('✅ Backend health check passed');
      const healthData = await healthResponse.json();
      console.log('Health data:', healthData);
    } else {
      console.log('❌ Backend health check failed:', healthResponse.status);
    }
  } catch (error) {
    console.log('❌ Backend connection failed:', error.message);
  }
  
  try {
    // Test prediction endpoint
    const predictionResponse = await fetch(`${backendUrl}/predict_all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ location: 'test' }),
    });
    
    if (predictionResponse.ok) {
      console.log('✅ Prediction endpoint working');
      const predictionData = await predictionResponse.json();
      console.log('Prediction data:', predictionData);
    } else {
      console.log('❌ Prediction endpoint failed:', predictionResponse.status);
    }
  } catch (error) {
    console.log('❌ Prediction endpoint error:', error.message);
  }
}

// Run the test
testBackendConnection();
