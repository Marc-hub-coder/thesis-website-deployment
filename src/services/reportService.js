/* eslint-disable no-unused-vars, no-unreachable */
import { db, ensureEmailPasswordAuth } from './firebaseClient';

// Report Service for Admin Reports
class ReportService {
  constructor() {
    this.API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://thesis-backend-zrcb.onrender.com/api';
  }

  // Generate comprehensive report based on configuration
  async generateReport(config) {
    try {
      console.log('Starting report generation with config:', config);
      
      // Fetch actual sensor data and system status
      const actualData = await this.fetchActualData(config);
      console.log('Fetched actual data:', {
        hasSensorData: !!actualData.sensorData,
        systemStatus: actualData.systemStatus,
        historicalDataLength: actualData.historicalData?.length || 0
      });
      
      // Generate report based on actual data
      const reportData = this.generateReportFromActualData(actualData, config);
      console.log('Generated report data:', {
        summary: reportData.summary,
        dailyDataLength: reportData.dailyData?.length || 0,
        systemStatus: reportData.systemStatus
      });
      
      return reportData;
    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error('Failed to generate report');
    }
  }

  // Fetch actual data from sensors and system
  async fetchActualData(config) {
    try {
      console.log('Fetching actual data for config:', config);
      
      // Get current sensor data from Firebase
      const sensorData = await this.getCurrentSensorDataFromFirebase(config.location);
      console.log('Current sensor data:', sensorData);
      
      // Get system status (maintenance, no sensors, etc.)
      const systemStatus = await this.getSystemStatus();
      console.log('System status:', systemStatus);
      
      // Get historical data for the specified date range from Firebase
      const historicalData = await this.getHistoricalDataFromFirebase(config);
      console.log('Historical data length:', historicalData.length);
      
      // Get maintenance history occurrences for the date range
      const maintenanceHistory = await this.getMaintenanceHistory(config.startDate, config.endDate);
      console.log('Maintenance history count:', maintenanceHistory.length);
      
      return {
        sensorData,
        systemStatus,
        historicalData,
        maintenanceHistory
      };
    } catch (error) {
      console.error('Error fetching actual data:', error);
      // Fallback to empty data if Firebase fails
      return {
        sensorData: this.getNoSensorsData(),
        systemStatus: 'unknown',
        historicalData: []
      };
    }
  }

  // Get current sensor data from Firebase
  async getCurrentSensorDataFromFirebase(location) {
    try {
      await ensureEmailPasswordAuth();
      
      // Fetch from Firebase sensors collection
      const sensorsSnap = await db.ref('sensors').once('value');
      if (!sensorsSnap.exists()) {
        return this.getNoSensorsData();
      }
      
      const sensorsTree = sensorsSnap.val();
      if (!sensorsTree || typeof sensorsTree !== 'object') {
        return this.getNoSensorsData();
      }
      
      // Choose device based on location
      const deviceIds = Object.keys(sensorsTree);
      if (deviceIds.length === 0) {
        return this.getNoSensorsData();
      }
      
      const deviceId = location && location !== 'all' && sensorsTree[location] 
        ? location 
        : deviceIds[0];
      
      const deviceData = sensorsTree[deviceId];
      if (!deviceData) {
        return this.getNoSensorsData();
      }
      
      // Get the latest reading
      const readings = Object.values(deviceData);
      if (readings.length === 0) {
        return this.getNoSensorsData();
      }
      
      // Sort by timestamp and get the latest
      const latestReading = readings.sort((a, b) => {
        const timestampA = a.timestamp || a.createdAt || a.time || 0;
        const timestampB = b.timestamp || b.createdAt || b.time || 0;
        return timestampB - timestampA;
      })[0];
      
      // Process the latest reading
      return this.processFirebaseReading(latestReading);
      
    } catch (error) {
      console.error('Error getting current sensor data from Firebase:', error);
      return this.getNoSensorsData();
    }
  }

  // Process Firebase reading into sensor data format
  processFirebaseReading(reading) {
    const toNumber = (v) => {
      const n = typeof v === 'string' ? parseFloat(v) : Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    
    return {
      airQuality: {
        level: this.calculateAirQualityLevel(reading.aqi || 0),
        aqi: reading.aqi || 0
      },
      volcanicSmog: {
        level: this.calculateHazardLevel(reading.so2 || 0),
        so2: reading.so2 || 0,
        progress: this.calculateProgress(reading.so2 || 0)
      },
      clearTime: {
        hours: reading.clearTime?.hours || 0,
        minutes: reading.clearTime?.minutes || 0,
        expectedTime: reading.clearTime?.expectedTime || "N/A"
      },
      so2Levels: [{ time: "Current", value: reading.so2 || 0 }],
      pm25Levels: [{ time: "Current", value: reading.pm25 || 0 }],
      pm10Levels: [{ time: "Current", value: reading.pm10 || 0 }],
      coLevels: [{ time: "Current", value: reading.co || 0 }],
      no2Levels: [{ time: "Current", value: reading.no2 || 0 }],
      particulateMatter: [{ time: "Current", value: reading.pm25 || 0 }],
      maintenance: {
        dashboard: false,
        so2Chart: false,
        pm25Chart: false,
        pm10Chart: false,
        coChart: false,
        no2Chart: false
      }
    };
  }

  // Get current sensor data (legacy method for compatibility)
  async getCurrentSensorData(location) {
    try {
      // Check if we have sensor data in localStorage (from sensorService)
      const storedData = localStorage.getItem('sensorData');
      if (storedData) {
        return JSON.parse(storedData);
      }
      
      // If no stored data, check maintenance settings
      const maintenanceSettings = localStorage.getItem('maintenanceSettings');
      if (maintenanceSettings) {
        const settings = JSON.parse(maintenanceSettings);
        return this.getMaintenanceData(settings);
      }
      
      // Default to no sensors detected
      return this.getNoSensorsData();
    } catch (error) {
      console.error('Error getting current sensor data:', error);
      return this.getNoSensorsData();
    }
  }

  // Get system status
  async getSystemStatus() {
    try {
      const maintenanceSettings = localStorage.getItem('maintenanceSettings');
      const sensorData = localStorage.getItem('sensorData');
      
      if (maintenanceSettings) {
        const settings = JSON.parse(maintenanceSettings);
        if (settings.dashboard || settings.so2Chart || settings.pm25Chart || 
            settings.pm10Chart || settings.aqiDisplay || settings.volcanicSmog) {
          return 'maintenance';
        }
      }
      
      if (!sensorData) {
        return 'no_sensors';
      }
      
      return 'operational';
    } catch (error) {
      console.error('Error getting system status:', error);
      return 'unknown';
    }
  }

  // Get historical data from Firebase for the specified date range
  async getHistoricalDataFromFirebase(config) {
    try {
      const { startDate, endDate, location, parameters } = config;
      
      console.log(`Fetching data from Firebase for date range: ${startDate} to ${endDate}, location: ${location}`);
      
      await ensureEmailPasswordAuth();
      
      // Fetch from Firebase sensors collection
      const sensorsSnap = await db.ref('sensors').once('value');
      if (!sensorsSnap.exists()) {
        console.log('No sensors collection found in Firebase');
        return [];
      }
      
      const sensorsTree = sensorsSnap.val();
      if (!sensorsTree || typeof sensorsTree !== 'object') {
        console.log('Invalid sensors data structure in Firebase');
        return [];
      }
      
      console.log('Available device IDs:', Object.keys(sensorsTree));
      
      // Choose device based on location
      const deviceIds = Object.keys(sensorsTree);
      if (deviceIds.length === 0) {
        console.log('No device IDs found in sensors tree');
        return [];
      }
      
      const deviceId = location && location !== 'all' && sensorsTree[location] 
        ? location 
        : deviceIds[0];
      
      console.log(`Selected device ID: ${deviceId}`);
      
      const deviceData = sensorsTree[deviceId];
      if (!deviceData) {
        console.log(`No data found for device ID: ${deviceId}`);
        return [];
      }
      
      // Convert device data to array - get ALL readings first
      const allReadings = Object.values(deviceData);
      console.log(`Total readings found for device ${deviceId}: ${allReadings.length}`);
      
      // Log some sample readings to understand the data structure
      if (allReadings.length > 0) {
        console.log('Sample reading:', allReadings[0]);
        console.log('Sample timestamp:', allReadings[0]?.timestamp || allReadings[0]?.createdAt || allReadings[0]?.time);
        console.log('Sample timestamp type:', typeof (allReadings[0]?.timestamp || allReadings[0]?.createdAt || allReadings[0]?.time));
        
        // Test timestamp parsing
        const sampleTimestamp = allReadings[0]?.timestamp || allReadings[0]?.createdAt || allReadings[0]?.time;
        if (sampleTimestamp) {
          let testTime;
          if (typeof sampleTimestamp === 'string' && sampleTimestamp.includes('_')) {
            const [d, hms] = sampleTimestamp.split('_');
            const [Y, M, D] = (d || '').split('-').map(Number);
            const [HH, mm, ss] = (hms || '').split('-').map(Number);
            const dt = new Date(Y || 0, (M || 1) - 1, D || 1, HH || 0, mm || 0, ss || 0);
            testTime = dt.getTime();
            console.log('Parsed timestamp components:', { Y, M, D, HH, mm, ss });
            console.log('Parsed date object:', dt);
            console.log('Parsed timestamp (ms):', testTime);
            console.log('Is valid date:', !isNaN(testTime));
          }
        }
      }
      
      // Filter by date range
      const filteredReadings = this.filterReadingsByDateRange(allReadings, startDate, endDate);
      console.log(`Readings after date filtering: ${filteredReadings.length}`);
      
      // If no readings after filtering, try a broader date range for debugging
      if (filteredReadings.length === 0) {
        console.log('No readings found for selected date range. Checking available date range...');
        const sampleTimestamps = allReadings.slice(0, 5).map(r => ({
          timestamp: r.timestamp || r.createdAt || r.time,
          date: new Date(r.timestamp || r.createdAt || r.time).toISOString().split('T')[0]
        }));
        console.log('Sample timestamps from database:', sampleTimestamps);
      }
      
      // Convert to daily data format
      const dailyData = this.convertReadingsToDailyData(filteredReadings, parameters);
      console.log(`Final daily data entries: ${dailyData.length}`);
      
      return dailyData;
      
    } catch (error) {
      console.error('Error getting historical data from Firebase:', error);
      return [];
    }
  }

  // Filter readings by date range with improved accuracy
  filterReadingsByDateRange(readings, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set start to beginning of day (00:00:00)
    start.setHours(0, 0, 0, 0);
    // Set end to end of day (23:59:59)
    end.setHours(23, 59, 59, 999);
    
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    console.log(`Filtering readings from ${start.toISOString()} to ${end.toISOString()}`);
    
    const filteredReadings = readings.filter(reading => {
      const timestamp = reading.timestamp || reading.createdAt || reading.time || 0;
      let readingTime;
      
      if (typeof timestamp === 'string') {
        // Handle different string formats
        if (timestamp.includes('_')) {
          // Format: YYYY-MM-DD_HH-mm-ss
          const [d, hms] = timestamp.split('_');
          const [Y, M, D] = (d || '').split('-').map(Number);
          const [HH, mm, ss] = (hms || '').split('-').map(Number);
          const dt = new Date(Y || 0, (M || 1) - 1, D || 1, HH || 0, mm || 0, ss || 0);
          readingTime = dt.getTime();
        } else {
          // Try parsing as ISO string or other format
          readingTime = new Date(timestamp).getTime();
        }
      } else if (typeof timestamp === 'number') {
        // Handle numeric timestamps (epoch ms or seconds)
        if (timestamp > 1e12) {
          readingTime = timestamp; // Already in milliseconds
        } else {
          readingTime = timestamp * 1000; // Convert seconds to milliseconds
        }
      } else {
        return false; // Skip invalid timestamps
      }
      
      // Check if reading is within the date range
      const isInRange = readingTime >= startTime && readingTime <= endTime;
      
      if (isInRange) {
        console.log(`Found reading at ${new Date(readingTime).toISOString()}`);
      }
      
      return isInRange;
    });
    
    console.log(`Filtered ${filteredReadings.length} readings from ${readings.length} total readings`);
    return filteredReadings;
  }

  // Convert Firebase readings to daily data format
  convertReadingsToDailyData(readings, parameters) {
    return readings.map(reading => {
      const timestamp = reading.timestamp || reading.createdAt || reading.time || Date.now();
      
      // Parse timestamp using the same logic as filtering
      let readingTime;
      if (typeof timestamp === 'string') {
        // Handle different string formats
        if (timestamp.includes('_')) {
          // Format: YYYY-MM-DD_HH-mm-ss
          const [d, hms] = timestamp.split('_');
          const [Y, M, D] = (d || '').split('-').map(Number);
          const [HH, mm, ss] = (hms || '').split('-').map(Number);
          const dt = new Date(Y || 0, (M || 1) - 1, D || 1, HH || 0, mm || 0, ss || 0);
          readingTime = dt.getTime();
        } else {
          // Try parsing as ISO string or other format
          readingTime = new Date(timestamp).getTime();
        }
      } else if (typeof timestamp === 'number') {
        // Handle numeric timestamps (epoch ms or seconds)
        if (timestamp > 1e12) {
          readingTime = timestamp; // Already in milliseconds
        } else {
          readingTime = timestamp * 1000; // Convert seconds to milliseconds
        }
      } else {
        readingTime = Date.now(); // Fallback to current time
      }
      
      const date = new Date(readingTime);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date created from timestamp:', timestamp, 'parsed as:', readingTime);
        return {
          date: 'Invalid Date',
          time: 'Invalid Date',
          // Add parameter values with fallbacks
          ...(parameters.includes('aqi') && { aqi: reading.aqi || 0 }),
          ...(parameters.includes('so2') && { so2: reading.so2 || 0 }),
          ...(parameters.includes('pm25') && { pm25: reading.pm25 || 0 }),
          ...(parameters.includes('pm10') && { pm10: reading.pm10 || 0 }),
          ...(parameters.includes('co') && { co: reading.co || 0 }),
          ...(parameters.includes('no2') && { no2: reading.no2 || 0 })
        };
      }
      
      const row = {
        date: date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        time: date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };

      // Add parameter values
      if (parameters.includes('aqi')) {
        row.aqi = reading.aqi || 0;
      }
      if (parameters.includes('pm25')) {
        row.pm25 = reading.pm25 || 0;
      }
      if (parameters.includes('pm10')) {
        row.pm10 = reading.pm10 || 0;
      }
      if (parameters.includes('co')) {
        row.co = reading.co || 0;
      }
      if (parameters.includes('no2')) {
        row.no2 = reading.no2 || 0;
      }

      return row;
    }).sort((a, b) => {
      // Sort by date and time
      const dateA = new Date(a.date + ' ' + a.time);
      const dateB = new Date(b.date + ' ' + b.time);
      return dateA - dateB;
    });
  }

  // Get historical data for the specified date range (legacy method)
  async getHistoricalData(config) {
    try {
      const { startDate, endDate, location, parameters } = config;
      
      // In a real application, this would fetch from API
      // For now, generate realistic data based on current system status
      const systemStatus = await this.getSystemStatus();
      
      if (systemStatus === 'maintenance') {
        return this.generateMaintenanceHistoricalData(config);
      } else if (systemStatus === 'no_sensors') {
        return this.generateNoSensorsHistoricalData(config);
      } else {
        return this.generateOperationalHistoricalData(config);
      }
    } catch (error) {
      console.error('Error getting historical data:', error);
      return [];
    }
  }

  // Generate report from actual data
  generateReportFromActualData(actualData, config) {
    const { sensorData, systemStatus, historicalData, maintenanceHistory } = actualData;
    const { reportType, startDate, endDate, location, parameters } = config;
    
    // Calculate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    // Use actual Firebase data if available, otherwise return empty report
    let dailyData = [];
    let summary = {};
    let alerts = [];
    let maintenanceLog = [];
    let maintenanceOccurrences = [];
    
    // Check if we have real Firebase data
    if (historicalData && historicalData.length > 0) {
      console.log(`Using ${historicalData.length} actual readings from Firebase for date range ${startDate} to ${endDate}`);
      dailyData = historicalData;
      summary = this.calculateSummaryFromRealData(dailyData, parameters);
      alerts = this.generateAlertsFromRealData(dailyData, daysDiff);
      maintenanceLog = this.generateMaintenanceLogFromRealData(daysDiff);
      maintenanceOccurrences = maintenanceHistory || [];
    } else {
      // No data available for the selected date range - return empty report
      console.log(`No data found in database for date range ${startDate} to ${endDate}`);
      dailyData = [];
      summary = this.getEmptyReportSummary();
      alerts = [];
      maintenanceLog = [];
      maintenanceOccurrences = [];
    }

    return {
      summary,
      dailyData: dailyData.slice(0, 100), // Limit to 100 rows for display
      alerts,
      maintenanceLog,
      maintenanceOccurrences,
      systemStatus: historicalData && historicalData.length > 0 ? 'operational' : 'no_data',
      config: {
        reportType,
        startDate,
        endDate,
        location,
        parameters
      }
    };
  }

  // Fetch maintenance history occurrences from Firebase within date range
  async getMaintenanceHistory(startDate, endDate) {
    try {
      await ensureEmailPasswordAuth();
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      const startMs = start.getTime();
      const endMs = end.getTime();

      const snap = await db.ref('admin/maintenanceHistory').once('value');
      if (!snap.exists()) return [];
      const raw = snap.val() || {};
      const items = Object.keys(raw).map((key) => ({ id: key, ...raw[key] }));
      const occurrences = items
        .map(item => {
          const s = Number(item.startTime) || 0;
          const e = item.endTime == null ? null : Number(item.endTime);
          const startDateObj = new Date(s);
          const endDateObj = e ? new Date(e) : null;
          const inRange = (s <= endMs) && (e ? e >= startMs : true);
          const durationMs = e ? Math.max(0, e - s) : null;
          return {
            start: isNaN(startDateObj.getTime()) ? null : startDateObj.toLocaleString(),
            end: endDateObj && !isNaN(endDateObj.getTime()) ? endDateObj.toLocaleString() : 'Ongoing',
            startTime: s,
            endTime: e,
            durationMs,
            inRange
          };
        })
        .filter(o => o.inRange)
        .sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
      return occurrences;
    } catch (error) {
      console.error('Error fetching maintenance history:', error);
      return [];
    }
  }

  // Generate maintenance historical data
  generateMaintenanceHistoricalData(config) {
    const { startDate, endDate, parameters } = config;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    const dailyData = [];
    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      
      for (let hour = 0; hour < 24; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        const row = {
          date: currentDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          time: time
        };

        // All parameters show maintenance status
        if (parameters.includes('aqi')) {
          row.aqi = 'UNDER MAINTENANCE';
        }
        if (parameters.includes('so2')) {
          row.so2 = 'UNDER MAINTENANCE';
        }
        if (parameters.includes('pm25')) {
          row.pm25 = 'UNDER MAINTENANCE';
        }
        if (parameters.includes('pm10')) {
          row.pm10 = 'UNDER MAINTENANCE';
        }

        dailyData.push(row);
      }
    }
    
    return dailyData;
  }

  // Generate no sensors historical data
  generateNoSensorsHistoricalData(config) {
    const { startDate, endDate, parameters } = config;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    const dailyData = [];
    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      
      for (let hour = 0; hour < 24; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        const row = {
          date: currentDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          time: time
        };

        // All parameters show no sensors detected
        if (parameters.includes('aqi')) {
          row.aqi = 'NO SENSORS DETECTED';
        }
        if (parameters.includes('so2')) {
          row.so2 = 'NO SENSORS DETECTED';
        }
        if (parameters.includes('pm25')) {
          row.pm25 = 'NO SENSORS DETECTED';
        }
        if (parameters.includes('pm10')) {
          row.pm10 = 'NO SENSORS DETECTED';
        }

        dailyData.push(row);
      }
    }
    
    return dailyData;
  }

  // Generate operational historical data
  generateOperationalHistoricalData(config) {
    const { startDate, endDate, parameters } = config;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    const dailyData = [];
    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      
      for (let hour = 0; hour < 24; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        const row = {
          date: currentDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          time: time
        };

        // Generate realistic operational data
        if (parameters.includes('aqi')) {
          row.aqi = Math.floor(Math.random() * 200) + 50; // 50-250 AQI
        }
        if (parameters.includes('so2')) {
          row.so2 = (Math.random() * 2.5).toFixed(2); // 0-2.5 SO2
        }
        if (parameters.includes('pm25')) {
          row.pm25 = (Math.random() * 35).toFixed(1); // 0-35 PM2.5
        }
        if (parameters.includes('pm10')) {
          row.pm10 = (Math.random() * 150).toFixed(1); // 0-150 PM10
        }

        dailyData.push(row);
      }
    }
    
    return dailyData;
  }

  // Calculate summary statistics for maintenance mode
  calculateMaintenanceSummary(dailyData, parameters) {
    return {
      totalReadings: dailyData.length,
      averageAQI: 'UNDER MAINTENANCE',
      averageSO2: 'UNDER MAINTENANCE',
      alertsCount: dailyData.length, // Each reading shows maintenance
      systemStatus: 'Maintenance Mode'
    };
  }

  // Calculate summary statistics for no sensors mode
  calculateNoSensorsSummary(dailyData, parameters) {
    return {
      totalReadings: dailyData.length,
      averageAQI: 'NO SENSORS DETECTED',
      averageSO2: 'NO SENSORS DETECTED',
      alertsCount: dailyData.length, // Each reading shows no sensors
      systemStatus: 'No Sensors Detected'
    };
  }

  // Calculate summary statistics for operational mode
  calculateOperationalSummary(dailyData, parameters) {
    let totalReadings = dailyData.length;
    let averageAQI = 0;
    let averageSO2 = 0;
    let alertsCount = Math.floor(Math.random() * 20) + 5; // 5-25 alerts

    if (parameters.includes('aqi')) {
      const aqiValues = dailyData.filter(row => row.aqi && typeof row.aqi === 'number').map(row => row.aqi);
      averageAQI = aqiValues.length > 0 
        ? Math.round(aqiValues.reduce((sum, val) => sum + val, 0) / aqiValues.length)
        : 0;
    }

    if (parameters.includes('so2')) {
      const so2Values = dailyData.filter(row => row.so2 && typeof row.so2 === 'number').map(row => parseFloat(row.so2));
      averageSO2 = so2Values.length > 0 
        ? parseFloat((so2Values.reduce((sum, val) => sum + val, 0) / so2Values.length).toFixed(2))
        : 0;
    }

    return {
      totalReadings,
      averageAQI,
      averageSO2,
      alertsCount,
      systemStatus: 'Operational'
    };
  }

  // Calculate summary statistics from real Firebase data
  calculateSummaryFromRealData(dailyData, parameters) {
    let totalReadings = dailyData.length;
    let averageAQI = 0;
    let averageSO2 = 0;
    let averagePM25 = 0;
    let averagePM10 = 0;
    let averageCO = 0;
    let averageNO2 = 0;
    let alertsCount = 0;

    // Calculate averages for each parameter
    if (parameters.includes('aqi')) {
      const aqiValues = dailyData.filter(row => row.aqi && typeof row.aqi === 'number').map(row => row.aqi);
      averageAQI = aqiValues.length > 0 
        ? Math.round(aqiValues.reduce((sum, val) => sum + val, 0) / aqiValues.length)
        : 0;
    }

    if (parameters.includes('pm25')) {
      const pm25Values = dailyData.filter(row => row.pm25 && typeof row.pm25 === 'number').map(row => parseFloat(row.pm25));
      averagePM25 = pm25Values.length > 0 
        ? parseFloat((pm25Values.reduce((sum, val) => sum + val, 0) / pm25Values.length).toFixed(2))
        : 0;
    }

    if (parameters.includes('pm10')) {
      const pm10Values = dailyData.filter(row => row.pm10 && typeof row.pm10 === 'number').map(row => parseFloat(row.pm10));
      averagePM10 = pm10Values.length > 0 
        ? parseFloat((pm10Values.reduce((sum, val) => sum + val, 0) / pm10Values.length).toFixed(2))
        : 0;
    }

    if (parameters.includes('co')) {
      const coValues = dailyData.filter(row => row.co && typeof row.co === 'number').map(row => parseFloat(row.co));
      averageCO = coValues.length > 0 
        ? parseFloat((coValues.reduce((sum, val) => sum + val, 0) / coValues.length).toFixed(2))
        : 0;
    }

    if (parameters.includes('no2')) {
      const no2Values = dailyData.filter(row => row.no2 && typeof row.no2 === 'number').map(row => parseFloat(row.no2));
      averageNO2 = no2Values.length > 0 
        ? parseFloat((no2Values.reduce((sum, val) => sum + val, 0) / no2Values.length).toFixed(2))
        : 0;
    }

    // Count alerts based on high values
    alertsCount = this.countAlertsFromRealData(dailyData, parameters);

    return {
      totalReadings,
      averageAQI,
      averagePM25,
      averagePM10,
      averageCO,
      averageNO2,
      alertsCount,
      systemStatus: 'Operational'
    };
  }

  // Count alerts from real data based on threshold values
  countAlertsFromRealData(dailyData, parameters) {
    let alertCount = 0;
    
    dailyData.forEach(row => {
      if (parameters.includes('aqi') && row.aqi > 150) alertCount++;
      if (parameters.includes('pm25') && row.pm25 > 25) alertCount++;
      if (parameters.includes('pm10') && row.pm10 > 50) alertCount++;
      if (parameters.includes('co') && row.co > 5) alertCount++;
      if (parameters.includes('no2') && row.no2 > 20) alertCount++;
    });
    
    return alertCount;
  }

  // Generate alerts from real data
  generateAlertsFromRealData(dailyData, daysDiff) {
    const alerts = [];
    
    dailyData.forEach((row, index) => {
      if (row.aqi > 150) {
        alerts.push({
          severity: 'high',
          message: `High AQI detected: ${row.aqi}`,
          time: `${row.date} ${row.time}`
        });
      }
      if (row.pm25 > 25) {
        alerts.push({
          severity: 'medium',
          message: `Elevated PM2.5: ${row.pm25} μg/m³`,
          time: `${row.date} ${row.time}`
        });
      }
      if (row.pm10 > 50) {
        alerts.push({
          severity: 'medium',
          message: `Elevated PM10: ${row.pm10} μg/m³`,
          time: `${row.date} ${row.time}`
        });
      }
      if (row.co > 5) {
        alerts.push({
          severity: 'high',
          message: `High CO detected: ${row.co} ppm`,
          time: `${row.date} ${row.time}`
        });
      }
      if (row.no2 > 20) {
        alerts.push({
          severity: 'medium',
          message: `Elevated NO2: ${row.no2} ppm`,
          time: `${row.date} ${row.time}`
        });
      }
    });
    
    // Sort by time (newest first) and limit to 20 alerts
    return alerts.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 20);
  }

  // Generate maintenance log from real data
  generateMaintenanceLogFromRealData(daysDiff) {
    const technicians = ['John Smith', 'Maria Garcia', 'David Chen', 'Sarah Johnson'];
    const maintenanceLog = [];
    
    // Generate a few maintenance entries based on the data period
    const numEntries = Math.min(3, Math.max(1, Math.floor(daysDiff / 7)));
    
    for (let i = 0; i < numEntries; i++) {
      const logDate = new Date();
      logDate.setDate(logDate.getDate() - Math.floor(Math.random() * daysDiff));
      
      maintenanceLog.push({
        type: 'Routine Check',
        description: 'Regular sensor maintenance and calibration',
        date: logDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }),
        technician: technicians[Math.floor(Math.random() * technicians.length)]
      });
    }
    
    return maintenanceLog.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Generate alerts for maintenance mode
  generateMaintenanceAlerts(daysDiff) {
    const alertTypes = [
      { severity: 'high', message: 'System under scheduled maintenance', count: 5 },
      { severity: 'medium', message: 'Sensors temporarily unavailable', count: 3 },
      { severity: 'low', message: 'Maintenance team on site', count: 2 },
      { severity: 'medium', message: 'System calibration in progress', count: 4 },
      { severity: 'low', message: 'Routine system updates', count: 2 }
    ];

    return this.generateAlertsFromTypes(alertTypes, daysDiff);
  }

  // Generate alerts for no sensors mode
  generateNoSensorsAlerts(daysDiff) {
    const alertTypes = [
      { severity: 'high', message: 'No sensors detected - system offline', count: 8 },
      { severity: 'high', message: 'Sensor connection lost', count: 5 },
      { severity: 'medium', message: 'Sensor hardware failure detected', count: 3 },
      { severity: 'medium', message: 'Communication error with sensors', count: 4 },
      { severity: 'low', message: 'Sensor power supply issue', count: 2 }
    ];

    return this.generateAlertsFromTypes(alertTypes, daysDiff);
  }

  // Generate alerts for operational mode
  generateOperationalAlerts(daysDiff) {
    const alertTypes = [
      { severity: 'high', message: 'SO2 levels exceeded safety threshold', count: 3 },
      { severity: 'medium', message: 'PM2.5 levels above moderate range', count: 5 },
      { severity: 'low', message: 'Sensor calibration due', count: 2 },
      { severity: 'high', message: 'Air quality index in unhealthy range', count: 4 },
      { severity: 'medium', message: 'PM10 levels elevated', count: 3 },
      { severity: 'low', message: 'Routine maintenance scheduled', count: 1 }
    ];

    return this.generateAlertsFromTypes(alertTypes, daysDiff);
  }

  // Helper method to generate alerts from types
  generateAlertsFromTypes(alertTypes, daysDiff) {
    const alerts = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysDiff);

    alertTypes.forEach(type => {
      for (let i = 0; i < type.count; i++) {
        const alertDate = new Date(startDate);
        alertDate.setDate(startDate.getDate() + Math.floor(Math.random() * daysDiff));
        
        alerts.push({
          severity: type.severity,
          message: type.message,
          time: alertDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        });
      }
    });

    // Sort by date (newest first)
    return alerts.sort((a, b) => new Date(b.time) - new Date(a.time));
  }

  // Generate maintenance log for maintenance mode
  generateMaintenanceLog(daysDiff) {
    const maintenanceTypes = [
      { type: 'Maintenance', description: 'System under scheduled maintenance', count: 4 },
      { type: 'Calibration', description: 'Sensor calibration and accuracy verification', count: 3 },
      { type: 'Update', description: 'Software update and system optimization', count: 2 },
      { type: 'Inspection', description: 'Regular system inspection and health check', count: 2 },
      { type: 'Repair', description: 'Preventive maintenance and component check', count: 1 }
    ];

    return this.generateMaintenanceLogFromTypes(maintenanceTypes, daysDiff);
  }

  // Generate maintenance log for no sensors mode
  generateNoSensorsMaintenanceLog(daysDiff) {
    const maintenanceTypes = [
      { type: 'Troubleshooting', description: 'Investigating sensor connection issues', count: 5 },
      { type: 'Repair', description: 'Attempting to restore sensor communication', count: 3 },
      { type: 'Inspection', description: 'Hardware inspection for sensor failures', count: 2 },
      { type: 'Replacement', description: 'Preparing sensor replacement parts', count: 2 },
      { type: 'Diagnostic', description: 'Running system diagnostics', count: 1 }
    ];

    return this.generateMaintenanceLogFromTypes(maintenanceTypes, daysDiff);
  }

  // Generate maintenance log for operational mode
  generateOperationalMaintenanceLog(daysDiff) {
    const maintenanceTypes = [
      { type: 'Calibration', description: 'Sensor calibration and accuracy verification', count: 2 },
      { type: 'Cleaning', description: 'Routine sensor cleaning and maintenance', count: 3 },
      { type: 'Repair', description: 'Minor sensor repair and component replacement', count: 1 },
      { type: 'Update', description: 'Software update and system optimization', count: 2 },
      { type: 'Inspection', description: 'Regular system inspection and health check', count: 1 }
    ];

    return this.generateMaintenanceLogFromTypes(maintenanceTypes, daysDiff);
  }

  // Helper method to generate maintenance log from types
  generateMaintenanceLogFromTypes(maintenanceTypes, daysDiff) {
    const technicians = ['John Smith', 'Maria Garcia', 'David Chen', 'Sarah Johnson'];
    const maintenanceLog = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysDiff);

    maintenanceTypes.forEach(maintenance => {
      for (let i = 0; i < maintenance.count; i++) {
        const logDate = new Date(startDate);
        logDate.setDate(startDate.getDate() + Math.floor(Math.random() * daysDiff));
        
        maintenanceLog.push({
          type: maintenance.type,
          description: maintenance.description,
          date: logDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          }),
          technician: technicians[Math.floor(Math.random() * technicians.length)]
        });
      }
    });

    // Sort by date (newest first)
    return maintenanceLog.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Get fallback data when API fails
  getFallbackData(config) {
    return {
      sensorData: this.getNoSensorsData(),
      systemStatus: 'unknown',
      historicalData: []
    };
  }

  // Get maintenance data
  getMaintenanceData(settings) {
    return {
      airQuality: {
        level: "UNDER MAINTENANCE",
        aqi: "N/A"
      },
      volcanicSmog: {
        level: "UNDER MAINTENANCE",
        so2: "N/A",
        progress: undefined
      },
      clearTime: {
        hours: "N/A",
        minutes: "N/A",
        expectedTime: "UNDER MAINTENANCE"
      }
    };
  }

  // Get no sensors data
  getNoSensorsData() {
    return {
      airQuality: {
        level: "NO SENSORS DETECTED",
        aqi: "N/A"
      },
      volcanicSmog: {
        level: "NO SENSORS DETECTED",
        so2: "N/A",
        progress: undefined
      },
      clearTime: {
        hours: "N/A",
        minutes: "N/A",
        expectedTime: "NO SENSORS DETECTED"
      }
    };
  }

  // Get empty report summary when no data is found
  getEmptyReportSummary() {
    return {
      totalReadings: 0,
      averageAQI: 'No Data',
      averagePM25: 'No Data',
      averagePM10: 'No Data',
      averageCO: 'No Data',
      averageNO2: 'No Data',
      alertsCount: 0,
      systemStatus: 'No Data Available'
    };
  }

  // Calculate air quality level based on AQI (EPA scale)
  calculateAirQualityLevel(aqi) {
    if (aqi <= 50) return 'GOOD';
    if (aqi <= 100) return 'MODERATE';
    if (aqi <= 150) return 'UNHEALTHY FOR SENSITIVE GROUPS';
    if (aqi <= 200) return 'UNHEALTHY';
    if (aqi <= 300) return 'VERY UNHEALTHY';
    return 'HAZARDOUS'; // 301-500
  }

  // Calculate hazard level based on SO2 value
  calculateHazardLevel(so2Value) {
    if (so2Value <= 0.9) return 'SAFE';
    if (so2Value <= 1.9) return 'MODERATE';
    if (so2Value <= 2.5) return 'HIGH';
    return 'DANGEROUS';
  }

  // Calculate progress percentage for progress bar
  calculateProgress(so2Value) {
    const maxSO2 = 3.0; // Maximum SO2 value for 100% progress
    return Math.min(Math.round((so2Value / maxSO2) * 100), 100);
  }

  // Get available sensor locations from Firebase
  async getAvailableLocations() {
    try {
      await ensureEmailPasswordAuth();
      const sensorsSnap = await db.ref('sensors').once('value');
      if (sensorsSnap.exists()) {
        const data = sensorsSnap.val();
        if (data && typeof data === 'object') {
          return Object.keys(data);
        }
      }
      return ['All Locations'];
    } catch (error) {
      console.error('Error fetching locations:', error);
      return ['All Locations'];
    }
  }

  // Export data to CSV
  exportToCSV(data, exportType, config) {
    try {
      let csvContent = '';
      let filename = '';

      switch (exportType) {
        case 'comprehensive':
          csvContent = this.generateComprehensiveCSV(data, config);
          filename = `comprehensive_report_${config.startDate}_${config.endDate}.csv`;
          break;
        case 'daily':
          csvContent = this.generateDailyDataCSV(data.dailyData, config);
          filename = `daily_data_${config.startDate}_${config.endDate}.csv`;
          break;
        case 'alerts':
          csvContent = this.generateAlertsCSV(data.alerts);
          filename = `alerts_report_${config.startDate}_${config.endDate}.csv`;
          break;
        default:
          throw new Error('Invalid export type');
      }

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw new Error('Failed to export CSV');
    }
  }

  // Generate comprehensive CSV content
  generateComprehensiveCSV(data, config) {
    let csv = 'VOG & Air Quality Dashboard - Comprehensive Report\n';
    csv += `Report Type: ${config.reportType}\n`;
    csv += `Date Range: ${config.startDate} to ${config.endDate}\n`;
    csv += `Location: ${config.location}\n`;
    csv += `System Status: ${data.systemStatus || 'Unknown'}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Summary section
    csv += 'SUMMARY\n';
    csv += 'Total Readings,Average AQI,Average SO2,Alerts Count,System Status\n';
    csv += `${data.summary.totalReadings},${data.summary.averageAQI},${data.summary.averageSO2},${data.summary.alertsCount},${data.summary.systemStatus || 'N/A'}\n\n`;

    // Daily data section
    csv += 'DAILY DATA\n';
    const headers = ['Date', 'Time'];
    if (config.parameters.includes('aqi')) headers.push('AQI');
    if (config.parameters.includes('pm25')) headers.push('PM2.5');
    if (config.parameters.includes('pm10')) headers.push('PM10');
    if (config.parameters.includes('co')) headers.push('CO');
    if (config.parameters.includes('no2')) headers.push('NO2');
    
    csv += headers.join(',') + '\n';
    
    data.dailyData.forEach(row => {
      const values = [row.date, row.time];
      if (config.parameters.includes('aqi')) values.push(row.aqi || '');
      if (config.parameters.includes('pm25')) values.push(row.pm25 || '');
      if (config.parameters.includes('pm10')) values.push(row.pm10 || '');
      if (config.parameters.includes('co')) values.push(row.co || '');
      if (config.parameters.includes('no2')) values.push(row.no2 || '');
      
      csv += values.join(',') + '\n';
    });

    csv += '\nALERTS\n';
    csv += 'Severity,Time,Message\n';
    data.alerts.forEach(alert => {
      csv += `${alert.severity},${alert.time},"${alert.message}"\n`;
    });

    csv += '\nMAINTENANCE LOG\n';
    csv += 'Type,Date,Description,Technician\n';
    data.maintenanceLog.forEach(log => {
      csv += `${log.type},${log.date},"${log.description}","${log.technician}"\n`;
    });

    // Maintenance occurrences section
    if (data.maintenanceOccurrences && data.maintenanceOccurrences.length) {
      csv += '\nMAINTENANCE OCCURRENCES\n';
      csv += 'Start,End,Duration (hours)\n';
      data.maintenanceOccurrences.forEach(item => {
        const hours = item.durationMs != null ? (item.durationMs / (1000*60*60)).toFixed(2) : '';
        csv += `${item.start},${item.end},${hours}\n`;
      });
    }

    return csv;
  }

  // Generate daily data CSV content
  generateDailyDataCSV(dailyData, config) {
    let csv = 'VOG & Air Quality Dashboard - Daily Data Report\n';
    csv += `Date Range: ${config.startDate} to ${config.endDate}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    const headers = ['Date', 'Time'];
    if (config.parameters.includes('aqi')) headers.push('AQI');
    if (config.parameters.includes('pm25')) headers.push('PM2.5');
    if (config.parameters.includes('pm10')) headers.push('PM10');
    if (config.parameters.includes('co')) headers.push('CO');
    if (config.parameters.includes('no2')) headers.push('NO2');
    
    csv += headers.join(',') + '\n';
    
    dailyData.forEach(row => {
      const values = [row.date, row.time];
      if (config.parameters.includes('aqi')) values.push(row.aqi || '');
      if (config.parameters.includes('pm25')) values.push(row.pm25 || '');
      if (config.parameters.includes('pm10')) values.push(row.pm10 || '');
      if (config.parameters.includes('co')) values.push(row.co || '');
      if (config.parameters.includes('no2')) values.push(row.no2 || '');
      
      csv += values.join(',') + '\n';
    });

    return csv;
  }

  // Generate alerts CSV content
  generateAlertsCSV(alerts) {
    let csv = 'VOG & Air Quality Dashboard - Alerts Report\n';
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    csv += 'Severity,Time,Message\n';
    
    alerts.forEach(alert => {
      csv += `${alert.severity},${alert.time},"${alert.message}"\n`;
    });

    return csv;
  }
}

// Export singleton instance
export const reportService = new ReportService();
