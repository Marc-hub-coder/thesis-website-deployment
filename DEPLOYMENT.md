# Deployment Guide for VOG & Air Quality Dashboard Frontend

## 🚀 Quick Deploy to Render

### Step 1: Prepare Your Repository
1. Make sure your code is pushed to GitHub
2. Ensure all dependencies are listed in `package.json`

### Step 2: Create Render Static Site
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Static Site"
3. Connect your GitHub repository

### Step 3: Configure Build Settings
- **Name**: `vog-air-quality-frontend` (or your preferred name)
- **Branch**: `main` (or your default branch)
- **Root Directory**: Leave empty (root of repository)
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `build`

### Step 4: Environment Variables
Add these environment variables in the Render dashboard:

#### Required Variables:
```env
REACT_APP_PREDICTION_API_URL=https://thesis-backend-zrcb.onrender.com
REACT_APP_API_BASE_URL=https://thesis-backend-zrcb.onrender.com/api
```

#### Firebase Variables (configured):
```env
REACT_APP_FIREBASE_API_KEY=AIzaSyAYrAf_pQjFhwBg5uhEoDdiajahyJubEzw
REACT_APP_FIREBASE_AUTH_DOMAIN=air-quality-monitoring-f97b2.firebaseapp.com
REACT_APP_FIREBASE_DB_URL=https://air-quality-monitoring-f97b2-default-rtdb.asia-southeast1.firebasedatabase.app
REACT_APP_FIREBASE_PROJECT_ID=air-quality-monitoring-f97b2
REACT_APP_FIREBASE_STORAGE_BUCKET=air-quality-monitoring-f97b2.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=390745277112
REACT_APP_FIREBASE_APP_ID=1:390745277112:web:2858ecf8e886b83e16ea4d
```

### Step 5: Deploy
1. Click "Create Static Site"
2. Wait for the build to complete
3. Your frontend will be available at `https://your-app-name.onrender.com`

## 🔧 Testing the Connection

After deployment, test that your frontend can connect to your backend:

1. Open your deployed frontend URL
2. Check the browser console for any API connection errors
3. Test the prediction functionality
4. Verify that data is being fetched from your backend

## 🐛 Troubleshooting

### Common Issues:

1. **Build Fails**: Check that all dependencies are in `package.json`
2. **API Connection Fails**: Verify your backend URL in environment variables
3. **CORS Errors**: Ensure your backend allows requests from your frontend domain
4. **Environment Variables Not Working**: Make sure they start with `REACT_APP_`

### Getting Your Backend URL:
1. Go to your Render dashboard
2. Find your backend service
3. Copy the URL (should be something like `https://your-backend-name.onrender.com`)

## 📝 Notes

- The frontend is configured to work with a separately deployed backend
- All API calls are made to the environment-configured backend URL
- Firebase integration is optional but recommended for real-time sensor data
- The app will fallback gracefully if the backend is unavailable
