// Test Firebase connection
// Run this in your browser console after deployment

async function testFirebaseConnection() {
  console.log('Testing Firebase connection...');
  
  // Check if Firebase environment variables are loaded
  const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_FIREBASE_DB_URL,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  };
  
  console.log('Firebase Config:', firebaseConfig);
  
  // Check if all required values are present
  const requiredKeys = ['apiKey', 'authDomain', 'databaseURL', 'projectId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
  
  if (missingKeys.length > 0) {
    console.log('❌ Missing Firebase configuration:', missingKeys);
    return;
  }
  
  console.log('✅ Firebase configuration looks good!');
  
  // Test Firebase initialization
  try {
    const { initializeApp } = await import('firebase/app');
    const { getDatabase } = await import('firebase/database');
    
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    
    console.log('✅ Firebase initialized successfully!');
    console.log('Database URL:', firebaseConfig.databaseURL);
    
    // Test database connection
    const { ref, get } = await import('firebase/database');
    const testRef = ref(db, 'test');
    
    try {
      await get(testRef);
      console.log('✅ Firebase database connection successful!');
    } catch (error) {
      console.log('⚠️ Database connection test failed:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Firebase initialization failed:', error.message);
  }
}

// Run the test
testFirebaseConnection();
