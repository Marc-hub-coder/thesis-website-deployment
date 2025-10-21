// Test CORS connection to backend
const testCORS = async () => {
  const backendUrl = 'https://thesis-backend-zrcb.onrender.com';
  
  console.log('Testing CORS connection to backend...');
  console.log('Backend URL:', backendUrl);
  
  try {
    // Test 1: Health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('Health status:', healthResponse.status);
    console.log('Health headers:', Object.fromEntries(healthResponse.headers.entries()));
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Health data:', healthData);
    }
  } catch (error) {
    console.error('Health check failed:', error);
  }
  
  try {
    // Test 2: Predict endpoint
    console.log('\n2. Testing predict_all endpoint...');
    const predictResponse = await fetch(`${backendUrl}/predict_all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ location: '' }),
    });
    console.log('Predict status:', predictResponse.status);
    console.log('Predict headers:', Object.fromEntries(predictResponse.headers.entries()));
    
    if (predictResponse.ok) {
      const predictData = await predictResponse.json();
      console.log('Predict data:', predictData);
    } else {
      const errorText = await predictResponse.text();
      console.error('Predict error:', errorText);
    }
  } catch (error) {
    console.error('Predict check failed:', error);
  }
};

// Run the test
testCORS();
