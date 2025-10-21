# Air Quality Prediction System Setup Guide

This guide will help you set up the complete air quality prediction system with both frontend and backend components.

## Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- Firebase project with Realtime Database
- ML model files (provided separately)

## Backend Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Firebase Configuration

1. Download your Firebase service account key from the Firebase Console
2. Place the service account key file in the `backend/` directory
3. Update the path in `backend/config.py` or set the environment variable:
   ```bash
   export FIREBASE_SERVICE_ACCOUNT_KEY_PATH="path/to/your/serviceAccountKey.json"
   export FIREBASE_DATABASE_URL="https://your-project.firebaseio.com"
   ```

### 3. ML Models Setup

Place your ML model files in the `backend/models/` directory:

```
backend/models/
├── chunk_pmonly.keras
├── input_scaler_pmonly.pkl
├── target_scalers_pmonly.pkl
├── chunk_no2only.keras
├── input_scaler_no2only.pkl
├── target_scalers_no2only.pkl
├── chunk_coonly (1).keras
├── input_scaler_coonly.pkl
└── target_scalers_coonly.pkl
```

### 4. Run the Backend

```bash
cd backend
python run.py
```

The API will be available at `http://localhost:5000`

## Frontend Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_DB_URL=https://your_project.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_PREDICTION_API_URL=http://localhost:5000
```

### 3. Run the Frontend

```bash
npm start
```

The application will be available at `http://localhost:3000`

## Running Both Services

### Option 1: Using npm scripts

```bash
# Install backend dependencies first
npm run install-backend

# Run both frontend and backend
npm run dev
```

### Option 2: Manual setup

1. Start the backend:
   ```bash
   cd backend
   python run.py
   ```

2. Start the frontend (in a new terminal):
   ```bash
   npm start
   ```

## API Endpoints

The Flask backend provides the following endpoints:

- `GET /` - API information
- `GET /health` - Health check and model status
- `POST /predict_pm` - Predict PM2.5 and PM10
- `POST /predict_no2` - Predict NO2
- `POST /predict_co` - Predict CO
- `POST /predict_all` - Predict all pollutants using Firebase data

## Features

### Frontend Changes
- Replaced "Estimated Clear Time" card with "Predicted Values" card
- Shows 1-hour ahead predictions for PM2.5, PM10, NO2, and CO
- Real-time updates from Firebase
- Responsive design with loading states

### Backend Features
- Flask API with CORS support
- Firebase integration for data fetching
- ML model integration for predictions
- Health check endpoint
- Error handling and logging

## Troubleshooting

### Common Issues

1. **Firebase connection errors**: Check your service account key and database URL
2. **Model loading errors**: Ensure all model files are in the correct directory
3. **CORS errors**: The backend includes CORS configuration for localhost:3000
4. **Port conflicts**: Change ports in the configuration if needed

### Health Check

Visit `http://localhost:5000/health` to check if the backend is running and models are loaded.

## Development

### Adding New Models

1. Place new model files in `backend/models/`
2. Update the model loading logic in `backend/app.py`
3. Add new prediction endpoints as needed

### Frontend Customization

The prediction service is modular and can be extended to include more prediction types or display formats.

## Production Deployment

For production deployment:

1. Set `FLASK_ENV=production` and `FLASK_DEBUG=False`
2. Use a production WSGI server like Gunicorn
3. Configure proper CORS origins
4. Set up proper logging and monitoring
5. Use environment variables for all configuration
