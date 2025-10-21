import { db, ensureEmailPasswordAuth } from './firebaseClient';

// Prefer environment variable; fall back to the requested device id if not provided via env
const DEFAULT_DEVICE_ID = String(process.env.REACT_APP_DEFAULT_DEVICE_ID || '6C:C8:40:35:32:F4').trim();

// Sensor service class
class SensorService {

  async fetchSensorData(location = '') {
    try {
      // Check for admin maintenance settings
      const maintenanceSettings = localStorage.getItem('maintenanceSettings');
      const adminSensorData = localStorage.getItem('sensorData');
      
      if (maintenanceSettings) {
        const settings = JSON.parse(maintenanceSettings);
        const adminData = adminSensorData ? JSON.parse(adminSensorData) : null;
        // If admin has set any maintenance mode, return maintenance data
        if (settings.dashboard || settings.pm25Chart || 
            settings.pm10Chart || settings.coChart || settings.no2Chart || settings.aqiDisplay) {
          return this.getMaintenanceData(settings, adminData);
        }
      }

      // Fetch from Firebase only (SDK auth handles access)
      const firebaseData = await this.fetchFromFirebase(location);
      if (firebaseData) {
        const processed = this.processSensorData(firebaseData);
        try { localStorage.setItem('sensorData', JSON.stringify(processed)); } catch (_) {}
        return processed;
      }

      // If no real sensors are connected or API is unavailable, return NO SENSORS DETECTED
      return this.getNoSensorsData();
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      return this.getNoSensorsData();
    }
  }

  // Attempt to read current data from Firebase at a single canonical path
  async fetchFromFirebase(location = '') {
    // 1) Optionally read /current but DO NOT return early; we'll still build full series from /sensors
    let fallbackLatest = null;
    try {
      await ensureEmailPasswordAuth();
      const snap = await db.ref('current').once('value');
      if (snap.exists()) {
        const data = snap.val();
        const resolved = this.resolveFirebaseShape(data, location);
        if (resolved) fallbackLatest = resolved;
      }
    } catch (e) { /* ignore and try sensors */ }

    // 2) Otherwise, derive from /sensors/{deviceId}/{pushId}
    try {
      await ensureEmailPasswordAuth();
      const sensorsSnap = await db.ref('sensors').once('value');
      if (!sensorsSnap.exists()) return null;
      const sensorsTree = sensorsSnap.val();
      if (!sensorsTree || typeof sensorsTree !== 'object') return null;

      // Choose device prioritizing:
      // 1) Explicit location arg
      // 2) REACT_APP_DEFAULT_DEVICE_ID if present in DB
      // 3) First available device
      const deviceIds = Object.keys(sensorsTree);
      if (deviceIds.length === 0) return null;
      const preferredId = DEFAULT_DEVICE_ID;
      const deviceId = (
        (location && sensorsTree[location]) ? location :
        (preferredId && sensorsTree[preferredId]) ? preferredId :
        deviceIds[0]
      );
      // Query the last N readings ordered by timestamp (default to a large number to show all)
      const maxPoints = Math.max(1, Number(process.env.REACT_APP_CHART_MAX_POINTS || 500));
      const deviceRef = db.ref(`sensors/${deviceId}`);
      const recentSnap = await deviceRef.orderByChild('timestamp').limitToLast(maxPoints).once('value');
      if (!recentSnap.exists()) return fallbackLatest;
      let recentMap = recentSnap.val() || {};

      // If we still have too few points, fetch the entire device node as a fallback
      if (Object.keys(recentMap).length < 20) {
        const fullSnap = await deviceRef.once('value');
        if (fullSnap.exists()) {
          recentMap = fullSnap.val() || recentMap;
        }
      }

      const toNumber = (v) => {
        const n = typeof v === 'string' ? parseFloat(v) : Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const parseTs = (t) => {
        if (!t && t !== 0) return 0;
        const raw = String(t);
        // Numeric epoch ms or seconds
        if (/^\d+$/.test(raw)) {
          const num = Number(raw);
          return num > 1e12 ? num : num * 1000; // handle seconds
        }
        // Expect format YYYY-MM-DD_HH-mm-ss
        const [d, hms] = raw.split('_');
        const [Y, M, D] = (d || '').split('-').map(Number);
        const [HH, mm, ss] = (hms || '').split('-').map(Number);
        const dt = new Date(Y || 0, (M || 1) - 1, D || 1, HH || 0, mm || 0, ss || 0);
        return dt.getTime();
      };

      const recentArray = Object.entries(recentMap)
        .map(([key, r]) => ({ key, r }))
        .filter(({ r }) => r && (r.aqi !== undefined || r.so2 !== undefined || r.pm25 !== undefined || r.pm10 !== undefined || r.co !== undefined || r.no2 !== undefined || r.humidity !== undefined || r.temperature !== undefined))
        .map(({ key, r }) => {
          const tsField = r.timestamp ?? r.createdAt ?? r.time ?? r.t ?? key;
          return {
            aqi: r.aqi !== undefined ? toNumber(r.aqi) : undefined,
            so2: r.so2 !== undefined ? toNumber(r.so2) : undefined,
            pm25: r.pm25 !== undefined ? toNumber(r.pm25) : undefined,
            pm10: r.pm10 !== undefined ? toNumber(r.pm10) : undefined,
            co: r.co !== undefined ? toNumber(r.co) : undefined,
            no2: r.no2 !== undefined ? toNumber(r.no2) : undefined,
            humidity: r.humidity !== undefined ? toNumber(r.humidity) : undefined,
            temperature: r.temperature !== undefined ? toNumber(r.temperature) : undefined,
            timestamp: String(tsField || ''),
            tsNum: parseTs(tsField)
          };
        })
        .sort((a, b) => (a.tsNum - b.tsNum));

      if (recentArray.length === 0) return fallbackLatest;
      const latest = recentArray[recentArray.length - 1];

      // Optional outlier filtering for SO2 (enable via REACT_APP_FILTER_SO2_OUTLIERS=true)
      const enableSo2Filter = String(process.env.REACT_APP_FILTER_SO2_OUTLIERS || 'false').toLowerCase() === 'true';
      const filteredForSo2 = enableSo2Filter
        ? recentArray.filter(r => r.so2 !== undefined && r.so2 >= 0 && r.so2 <= 3.5)
        : recentArray.filter(r => r.so2 !== undefined);

      const label = (t) => {
        if (!t && t !== 0) return '';
        const raw = String(t);
        if (/^\d+$/.test(raw)) {
          const num = Number(raw);
          const date = new Date(num > 1e12 ? num : num * 1000);
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return raw.split('_')[1] || raw;
      };

      // Prefer explicit aqi/so2 from DB; compute reasonable fallbacks if missing
      const latestAqi = latest.aqi !== undefined ? latest.aqi : 0;
      const latestSo2 = (filteredForSo2.length ? filteredForSo2[filteredForSo2.length - 1].so2 : latest.so2 !== undefined ? latest.so2 : 0);
      const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

      try {
        // Debug aid: inspect the latest reading coming from Firebase
        // Remove if noisy
        // eslint-disable-next-line no-console
        console.debug('Firebase latest reading', {
          aqi: latest.aqi,
          so2: latest.so2,
          pm25: latest.pm25,
          pm10: latest.pm10,
          timestamp: latest.timestamp
        });
      } catch (_) {}

      const merged = {
        aqi: latestAqi,
        so2: enableSo2Filter ? clamp(latestSo2, 0, 3.5) : (latest.so2 !== undefined ? latest.so2 : 0),
        humidity: latest.humidity !== undefined ? latest.humidity : 0,
        temperature: latest.temperature !== undefined ? latest.temperature : 0,
        pm25Levels: recentArray.map(r => ({ time: label(r.timestamp), value: r.pm25 })),
        pm10Levels: recentArray.map(r => ({ time: label(r.timestamp), value: r.pm10 })),
        coLevels: recentArray.map(r => ({ time: label(r.timestamp), value: r.co })),
        no2Levels: recentArray.map(r => ({ time: label(r.timestamp), value: r.no2 })),
        humidityLevels: recentArray.map(r => ({ time: label(r.timestamp), value: r.humidity })),
        temperatureLevels: recentArray.map(r => ({ time: label(r.timestamp), value: r.temperature })),
        so2Levels: (filteredForSo2.length ? filteredForSo2 : recentArray).map(r => ({ time: label(r.timestamp), value: enableSo2Filter ? clamp(r.so2 ?? 0, 0, 3.5) : (r.so2 ?? 0) })),
        particulateMatter: recentArray.map(r => ({ time: label(r.timestamp), value: r.pm25 }))
      };
      // If we had a fallback latest, preserve its clearTime and any other metadata
      if (fallbackLatest) {
        merged.clearTime = fallbackLatest.clearTime || merged.clearTime;
      }
      return merged;
    } catch (e) {
      return fallbackLatest;
    }
  }

  // Subscribe to realtime updates for a device; returns an unsubscribe function
  onRealtimeUpdates(location = '', onData) {
    let activeRef = null;
    let cancelled = false;

    const attach = async () => {
      try {
        await ensureEmailPasswordAuth();
        const sensorsSnap = await db.ref('sensors').once('value');
        if (!sensorsSnap.exists()) return;
        const sensorsTree = sensorsSnap.val() || {};
        const deviceIds = Object.keys(sensorsTree);
        if (deviceIds.length === 0) return;
        const preferredId = DEFAULT_DEVICE_ID;
        const deviceId = (
          (location && sensorsTree[location]) ? location :
          (preferredId && sensorsTree[preferredId]) ? preferredId :
          deviceIds[0]
        );

        if (cancelled) return;
        activeRef = db.ref(`sensors/${deviceId}`);

        // Listen for any value changes, limit to a reasonable window to avoid heavy payloads
        const maxPoints = Math.max(1, Number(process.env.REACT_APP_CHART_MAX_POINTS || 500));
        const orderedRef = activeRef.orderByChild('timestamp').limitToLast(maxPoints);
        const handler = (snap) => {
          if (!snap.exists()) return;
          const recentMap = snap.val() || {};
          const toNumber = (v) => {
            const n = typeof v === 'string' ? parseFloat(v) : Number(v);
            return Number.isFinite(n) ? n : 0;
          };
          const parseTs = (t) => {
            if (!t && t !== 0) return 0;
            const raw = String(t);
            if (/^\d+$/.test(raw)) {
              const num = Number(raw);
              return num > 1e12 ? num : num * 1000;
            }
            const [d, hms] = raw.split('_');
            const [Y, M, D] = (d || '').split('-').map(Number);
            const [HH, mm, ss] = (hms || '').split('-').map(Number);
            const dt = new Date(Y || 0, (M || 1) - 1, D || 1, HH || 0, mm || 0, ss || 0);
            return dt.getTime();
          };

          const recentArray = Object.entries(recentMap)
            .map(([key, r]) => ({ key, r }))
            .filter(({ r }) => r && (r.aqi !== undefined || r.so2 !== undefined || r.pm25 !== undefined || r.pm10 !== undefined || r.co !== undefined || r.no2 !== undefined || r.humidity !== undefined || r.temperature !== undefined))
            .map(({ key, r }) => {
              const tsField = r.timestamp ?? r.createdAt ?? r.time ?? r.t ?? key;
              return {
                aqi: r.aqi !== undefined ? toNumber(r.aqi) : undefined,
                so2: r.so2 !== undefined ? toNumber(r.so2) : undefined,
                pm25: r.pm25 !== undefined ? toNumber(r.pm25) : undefined,
                pm10: r.pm10 !== undefined ? toNumber(r.pm10) : undefined,
                co: r.co !== undefined ? toNumber(r.co) : undefined,
                no2: r.no2 !== undefined ? toNumber(r.no2) : undefined,
                humidity: r.humidity !== undefined ? toNumber(r.humidity) : undefined,
                temperature: r.temperature !== undefined ? toNumber(r.temperature) : undefined,
                timestamp: String(tsField || ''),
                tsNum: parseTs(tsField)
              };
            })
            .sort((a, b) => (a.tsNum - b.tsNum));

          if (recentArray.length === 0) return;
          const latest = recentArray[recentArray.length - 1];
          const enableSo2Filter = String(process.env.REACT_APP_FILTER_SO2_OUTLIERS || 'false').toLowerCase() === 'true';
          const filteredForSo2 = enableSo2Filter
            ? recentArray.filter(r => r.so2 !== undefined && r.so2 >= 0 && r.so2 <= 3.5)
            : recentArray.filter(r => r.so2 !== undefined);
          const label = (t) => {
            if (!t && t !== 0) return '';
            const raw = String(t);
            if (/^\d+$/.test(raw)) {
              const num = Number(raw);
              const date = new Date(num > 1e12 ? num : num * 1000);
              return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return raw.split('_')[1] || raw;
          };

          const merged = {
            aqi: latest.aqi !== undefined ? latest.aqi : 0,
            so2: enableSo2Filter ? Math.max(0, Math.min(3.5, (filteredForSo2.length ? filteredForSo2[filteredForSo2.length - 1].so2 : (latest.so2 ?? 0)))) : (latest.so2 ?? 0),
            humidity: latest.humidity !== undefined ? latest.humidity : 0,
            temperature: latest.temperature !== undefined ? latest.temperature : 0,
            pm25Levels: recentArray.map(r => ({ time: label(r.timestamp), value: r.pm25 })),
            pm10Levels: recentArray.map(r => ({ time: label(r.timestamp), value: r.pm10 })),
            coLevels: recentArray.map(r => ({ time: label(r.timestamp), value: r.co })),
            no2Levels: recentArray.map(r => ({ time: label(r.timestamp), value: r.no2 })),
            humidityLevels: recentArray.map(r => ({ time: label(r.timestamp), value: r.humidity })),
            temperatureLevels: recentArray.map(r => ({ time: label(r.timestamp), value: r.temperature })),
            so2Levels: (filteredForSo2.length ? filteredForSo2 : recentArray).map(r => ({ time: label(r.timestamp), value: enableSo2Filter ? Math.max(0, Math.min(3.5, r.so2 ?? 0)) : (r.so2 ?? 0) })),
            particulateMatter: recentArray.map(r => ({ time: label(r.timestamp), value: r.pm25 }))
          };

          try {
            // Respect admin maintenance settings during realtime updates as well
            let finalData = this.processSensorData(merged);
            try {
              const maintenanceSettings = localStorage.getItem('maintenanceSettings');
              if (maintenanceSettings) {
                const settings = JSON.parse(maintenanceSettings);
                if (settings && (settings.dashboard || settings.pm25Chart || settings.pm10Chart || settings.coChart || settings.no2Chart || settings.aqiDisplay)) {
                  finalData = this.getMaintenanceData(settings, finalData);
                }
              }
            } catch (_) {}
            if (typeof onData === 'function') onData(finalData);
          } catch (_) {}
        };

        orderedRef.on('value', handler);

        return () => {
          if (orderedRef) orderedRef.off('value', handler);
        };
      } catch (_) {}
      return () => {};
    };

    const unsubPromise = attach();

    // Return cleanup function immediately; it will detach once ref is ready
    return () => {
      cancelled = true;
      Promise.resolve(unsubPromise).then((u) => {
        try { if (typeof u === 'function') u(); } catch (_) {}
      });
      if (activeRef) try { activeRef.off(); } catch (_) {}
    };
  }

  // Normalize various possible Firebase shapes to expected structure
  resolveFirebaseShape(data, location = '') {
    let payload = data;

    // If data is keyed by locations
    if (typeof data === 'object' && !Array.isArray(data)) {
      const keys = Object.keys(data || {});
      if (location && data[location]) {
        payload = data[location];
      } else if (keys.length && (data[keys[0]]?.aqi !== undefined || data[keys[0]]?.so2 !== undefined)) {
        payload = data[keys[0]]; // pick first if no location specified
      }
    }

    // Direct numeric readings
    if (typeof payload === 'object' && (payload.aqi !== undefined || payload.so2 !== undefined)) {
      return {
        aqi: Number(payload.aqi ?? 0),
        so2: Number(payload.so2 ?? 0),
        clearTime: payload.clearTime || undefined,
        so2Levels: payload.so2Levels || payload.so2_levels || [],
        pm25Levels: payload.pm25Levels || payload.pm25_levels || [],
        pm10Levels: payload.pm10Levels || payload.pm10_levels || [],
        particulateMatter: payload.particulateMatter || payload.particulate_matter || []
      };
    }

    return null;
  }

  // Process raw sensor data from API
  processSensorData(rawData) {
    return {
      airQuality: {
        level: this.calculateAirQualityLevel(rawData.aqi || 0),
        aqi: rawData.aqi || 0
      },
      volcanicSmog: {
        level: this.calculateHazardLevel(rawData.so2 || 0),
        so2: rawData.so2 || 0,
        progress: this.calculateProgress(rawData.so2 || 0)
      },
      humidity: {
        value: rawData.humidity || 0,
        level: this.calculateHumidityLevel(rawData.humidity || 0)
      },
      temperature: {
        value: rawData.temperature || 0,
        level: this.calculateTemperatureLevel(rawData.temperature || 0)
      },
      clearTime: {
        hours: rawData.clearTime?.hours || 0,
        minutes: rawData.clearTime?.minutes || 0,
        expectedTime: rawData.clearTime?.expectedTime || "N/A"
      },
      so2Levels: rawData.so2Levels || [],
      pm25Levels: rawData.pm25Levels || [],
      pm10Levels: rawData.pm10Levels || [],
      coLevels: rawData.coLevels || [],
      no2Levels: rawData.no2Levels || [],
      humidityLevels: rawData.humidityLevels || [],
      temperatureLevels: rawData.temperatureLevels || [],
      particulateMatter: rawData.particulateMatter || [],
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

  // Calculate humidity level
  calculateHumidityLevel(humidityValue) {
    if (humidityValue < 30) return 'LOW';
    if (humidityValue < 60) return 'COMFORTABLE';
    if (humidityValue < 80) return 'MODERATE';
    return 'HIGH';
  }

  // Calculate temperature level
  calculateTemperatureLevel(temperatureValue) {
    if (temperatureValue < 0) return 'FREEZING';
    if (temperatureValue < 15) return 'COLD';
    if (temperatureValue < 25) return 'COMFORTABLE';
    if (temperatureValue < 35) return 'WARM';
    return 'HOT';
  }

  // Mock sensor data for development/testing
  getMockSensorData() {
    return {
      airQuality: {
        level: "MODERATE",
        aqi: 78
      },
      volcanicSmog: {
        level: "HIGH",
        so2: 2.5,
        progress: 85
      },
      clearTime: {
        hours: 2,
        minutes: 45,
        expectedTime: "17:45 PM"
      },
      so2Levels: [
        { time: "14:00PM", value: 0.1 },
        { time: "14:30PM", value: 1.0 },
        { time: "15:00PM", value: 1.5 },
        { time: "17:30PM", value: 2.5 },
        { time: "18:00PM", value: 3.0 }
      ],
      pm25Levels: [
        { time: "14:00PM", value: 0.2 },
        { time: "14:30PM", value: 0.8 },
        { time: "15:00PM", value: 1.2 },
        { time: "17:30PM", value: 2.0 },
        { time: "18:00PM", value: 2.8 }
      ],
      pm10Levels: [
        { time: "14:00PM", value: 0.3 },
        { time: "14:30PM", value: 1.1 },
        { time: "15:00PM", value: 1.8 },
        { time: "17:30PM", value: 2.3 },
        { time: "18:00PM", value: 2.9 }
      ],
      particulateMatter: [
        { time: "14:00PM", value: 0.1 },
        { time: "14:30PM", value: 1.0 },
        { time: "15:00PM", value: 1.5 },
        { time: "17:30PM", value: 2.5 },
        { time: "18:00PM", value: 3.0 }
      ]
    };
  }

  // Get maintenance data when sensors are not available
  getMaintenanceData(settings = {}, adminData = null) {
    // Start with normalized admin data (if provided) or fallback to NO SENSORS DETECTED
    let baseData = this.getNoSensorsData();
    try {
      if (adminData) {
        // Accept either already-shaped admin data or raw values with aqi/so2
        if (adminData.airQuality && adminData.volcanicSmog) {
          baseData = JSON.parse(JSON.stringify(adminData));
        } else if (typeof adminData === 'object' && (adminData.aqi !== undefined || adminData.so2 !== undefined)) {
          baseData = this.processSensorData(adminData);
        }
      }
    } catch (e) {
      baseData = this.getNoSensorsData();
    }
    const data = JSON.parse(JSON.stringify(baseData)); // Deep copy to avoid mutation

    if (settings.dashboard) {
      // Full dashboard maintenance - everything under maintenance
      data.airQuality.level = "UNDER MAINTENANCE";
      data.airQuality.aqi = "N/A";
      data.volcanicSmog.level = "UNDER MAINTENANCE";
      data.volcanicSmog.so2 = "N/A";
      data.volcanicSmog.progress = undefined;
      data.clearTime.expectedTime = "UNDER MAINTENANCE";
      data.clearTime.hours = "N/A";
      data.clearTime.minutes = "N/A";
      data.so2Levels = [
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 }
      ];
      data.pm25Levels = [
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 }
      ];
      data.pm10Levels = [
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 }
      ];
      data.coLevels = [
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 }
      ];
      data.no2Levels = [
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 }
      ];
    } else {
      // Individual component maintenance
      if (settings.aqiDisplay) {
        data.airQuality.level = "UNDER MAINTENANCE";
        data.airQuality.aqi = "N/A";
      }
      if (settings.pm25Chart) {
        data.pm25Levels = [
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 }
        ];
      }
      if (settings.pm10Chart) {
        data.pm10Levels = [
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 }
        ];
      }
      if (settings.coChart) {
        data.coLevels = [
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 }
        ];
      }
      if (settings.no2Chart) {
        data.no2Levels = [
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 },
          { time: "N/A", value: 0 }
        ];
      }
    }
    // Expose which maintenance toggles are active for UI logic
    data.maintenance = {
      dashboard: !!settings.dashboard,
      pm25Chart: !!settings.pm25Chart,
      pm10Chart: !!settings.pm10Chart,
      coChart: !!settings.coChart,
      no2Chart: !!settings.no2Chart
    };
    return data;
  }

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
      humidity: {
        value: "N/A",
        level: "NO SENSORS DETECTED"
      },
      temperature: {
        value: "N/A",
        level: "NO SENSORS DETECTED"
      },
      clearTime: {
        hours: "N/A",
        minutes: "N/A",
        expectedTime: "NO SENSORS DETECTED"
      },
      so2Levels: [
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 }
      ],
      pm25Levels: [
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 }
      ],
      pm10Levels: [
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 }
      ],
      coLevels: [
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 }
      ],
      no2Levels: [
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 }
      ],
      humidityLevels: [
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 }
      ],
      temperatureLevels: [
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 }
      ],
      particulateMatter: [
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 },
        { time: "N/A", value: 0 }
      ],
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

  // Get available sensor locations
  async getSensorLocations() {
    try {
      await ensureEmailPasswordAuth();
      const sensorsSnap = await db.ref('sensors').once('value');
      if (sensorsSnap.exists()) {
        const data = sensorsSnap.val();
        if (data && typeof data === 'object') return Object.keys(data);
      }
    } catch (e) {}
    try {
      const locSnap = await db.ref('locations').once('value');
      if (locSnap.exists()) {
        const data = locSnap.val();
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') return Object.keys(data);
      }
    } catch (e) {}
    return [];
  }

  // Get historical data for charts
  async getHistoricalData(location, parameter, timeRange) {
    try {
      await ensureEmailPasswordAuth();
      const sensorsSnap = await db.ref('sensors').once('value');
      if (sensorsSnap.exists()) {
        const sensorsTree = sensorsSnap.val();
        if (sensorsTree && typeof sensorsTree === 'object') {
          const deviceId = location && sensorsTree[location] ? location : Object.keys(sensorsTree)[0];
          const readingsMap = sensorsTree[deviceId] || {};
          const points = Object.values(readingsMap)
            .filter(r => r && r.timestamp)
            .map(r => ({
              time: String(r.timestamp).split('_')[1] || String(r.timestamp),
              value: Number((parameter === 'pm25' ? r.pm25 : parameter === 'pm10' ? r.pm10 : parameter === 'so2' ? r.so2 : r.aqi) || 0)
            }))
            .sort((a, b) => (a.time > b.time ? 1 : -1));
          return points;
        }
      }
    } catch (e) {}
    return [];
  }
}

// Export singleton instance
export const sensorService = new SensorService();

// Expose a small debug helper to inspect processed readings in the browser console
if (typeof window !== 'undefined') {
  window.debugFetchSensor = async (location = '') => {
    const data = await sensorService.fetchSensorData(location);
    // eslint-disable-next-line no-console
    console.log('Processed sensorData:', data);
    return data;
  };
}
