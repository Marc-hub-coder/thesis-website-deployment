"use client"

import { useState, useEffect } from "react"
import { FlaskConical, Factory, Wind } from "lucide-react"
import { Link } from "react-router-dom"
import "../styles/Dashboard.css"
import "bootstrap/dist/css/bootstrap.min.css"
import { sensorService } from "../services/sensorService.js"
import { adminService } from "../services/adminService"

const Dashboard = () => {
  const [sensorData, setSensorData] = useState(null)
  const [publicAlert, setPublicAlert] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [availableLocations, setAvailableLocations] = useState([])
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [currentChartContainer, setCurrentChartContainer] = useState(null)
  const [currentChartWidth, setCurrentChartWidth] = useState(0)
  const [hoveredPointPM25, setHoveredPointPM25] = useState(null)
  const [tooltipPositionPM25, setTooltipPositionPM25] = useState({ x: 0, y: 0 })
  const [currentChartContainerPM25, setCurrentChartContainerPM25] = useState(null)
  const [currentChartWidthPM25, setCurrentChartWidthPM25] = useState(0)
  const [hoveredPointPM10, setHoveredPointPM10] = useState(null)
  const [tooltipPositionPM10, setTooltipPositionPM10] = useState({ x: 0, y: 0 })
  const [currentChartContainerPM10, setCurrentChartContainerPM10] = useState(null)
  const [currentChartWidthPM10, setCurrentChartWidthPM10] = useState(0)
  const [predictions, setPredictions] = useState(null)
  const [predictionLoading, setPredictionLoading] = useState(false)

  // Map raw device IDs to friendly names for display
  const getLocationLabel = (loc) => {
    if (!loc) return "";
    // Default device shown as Sensor 1
    return loc === '6C:C8:40:35:32:F4' ? 'Sensor 1' : loc;
  }

  // Function to fetch predictions with debouncing
  const fetchPredictionsDebounced = (() => {
    let timeoutId = null
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        fetchPredictions(selectedLocation).catch(err => {
          console.error('Debounced prediction fetch failed:', err)
        })
      }, 1000) // Wait 1 second after last data change before fetching predictions
    }
  })()

  // Function to fetch sensor data
  const fetchSensorData = async (location = "") => {
    setIsLoading(true)
    try {
      const data = await sensorService.fetchSensorData(location)
      setSensorData(data)
    } catch (error) {
      console.error("Error fetching sensor data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Function to fetch predictions from backend (display only)
  const fetchPredictions = async (location = "") => {
    setPredictionLoading(true)
    try {
      const baseUrl = process.env.REACT_APP_PREDICTION_API_URL || 'https://thesis-backend-zrcb.onrender.com';
      const apiUrl = `${baseUrl}/predict_all`;
      console.log('Fetching predictions from backend:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET', // Use GET method as per backend support
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      console.log('Prediction response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Prediction API Error:', errorText);
        throw new Error(`Prediction API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Prediction data received from backend:', data);
      
      // Directly set the predictions from backend response
      if (data.predictions) {
        setPredictions(data.predictions);
      } else {
        throw new Error('No predictions data in backend response');
      }
    } catch (error) {
      console.error("Error fetching predictions from backend:", error)
      
      // Set fallback predictions for display
      setPredictions({
        pm: [
          { 'PM2.5': 0, 'PM10': 0 },
          { 'PM2.5': 0, 'PM10': 0 },
          { 'PM2.5': 0, 'PM10': 0 }
        ],
        no2: [
          { 'NO2': 0 },
          { 'NO2': 0 },
          { 'NO2': 0 }
        ],
        co: [
          { 'CO': 0 },
          { 'CO': 0 },
          { 'CO': 0 }
        ]
      });
    } finally {
      setPredictionLoading(false)
    }
  }

  // Function to generate chart points from sensor data
  const generateChartPoints = (data, maxValue, chartWidth = 400) => {
    if (!data || data.length === 0) return ""
    const safeDenominator = Math.max(1, data.length - 1)
    // Use the same rounded maximum value as the y-axis labels for proper alignment
    let roundedMax
    if (maxValue <= 10) {
      roundedMax = Math.ceil(maxValue)
    } else if (maxValue <= 100) {
      roundedMax = Math.ceil(maxValue / 5) * 5
    } else {
      roundedMax = Math.ceil(maxValue / 10) * 10
    }
    const maxV = Math.max(roundedMax, 0.0001)

    // Use the chart plotting area height (300px) that matches the y-axis label positioning
    const chartHeight = 300 // This matches the y-axis height and SVG min-height

    return data
      .map((point, index) => {
        const x = (index / safeDenominator) * chartWidth
        const value = Number(point.value || 0)

        // Calculate y position to match y-axis label positioning exactly
        // The y-axis uses justify-content: space-between with 7 labels (0 to 6)
        // So we need to map our value to the full chart height
        const y = ((maxV - value) / maxV) * chartHeight

        return `${x},${y}`
      })
      .join(" ")
  }

  // Function to generate chart dots with hover data
  const generateChartDots = (data, maxValue, chartWidth = 400) => {
    if (!data || data.length === 0) return []
    const safeDenominator = Math.max(1, data.length - 1)
    // Use the same rounded maximum value as the y-axis labels for proper alignment
    let roundedMax
    if (maxValue <= 10) {
      roundedMax = Math.ceil(maxValue)
    } else if (maxValue <= 100) {
      roundedMax = Math.ceil(maxValue / 5) * 5
    } else {
      roundedMax = Math.ceil(maxValue / 10) * 10
    }
    const maxV = Math.max(roundedMax, 0.0001)

    // Use the chart plotting area height (300px)
    const chartHeight = 300

    return data.map((point, index) => {
      const x = (index / safeDenominator) * chartWidth
      const value = Number(point.value || 0)

      // Calculate y position to match y-axis label positioning exactly
      const y = ((maxV - value) / maxV) * chartHeight

      return {
        x,
        y,
        value: value,
        time: point.time,
        originalValue: point.value,
      }
    })
  }

  const getChartMax = (filterType) => {
    const series = getChartData(filterType)
    const values = (series || []).map((p) => Number(p.value || 0))
    const observedMax = values.length ? Math.max(...values) : 0
    const observedMin = values.length ? Math.min(...values) : 0

    if (filterType === "co") {
      // For CO, create appropriate scale based on actual data range
      if (observedMax <= 1) return Math.max(1, observedMax * 1.2)
      if (observedMax <= 10) return Math.max(10, observedMax * 1.2)
      return Math.max(observedMax * 1.1, observedMax + 20)
    }
    if (filterType === "no2") {
      // For NO2, create appropriate scale based on actual data range
      if (observedMax <= 1) return Math.max(1, observedMax * 1.2)
      if (observedMax <= 10) return Math.max(10, observedMax * 1.2)
      return Math.max(observedMax * 1.1, observedMax + 20)
    }
    if (filterType === "pm25") return Math.max(Math.max(50, observedMax * 1.2), observedMax + 10)
    if (filterType === "pm10") return Math.max(Math.max(150, observedMax * 1.2), observedMax + 20)
    return Math.max(observedMax * 1.2, 3)
  }

  const getChartWidth = (filterType) => {
    const data = getChartData(filterType)
    const numPoints = Array.isArray(data) ? data.length : 0

    // Check if we're on mobile
    const isMobile = window.innerWidth <= 1024

    if (isMobile) {
      const minPixelsPerPoint = 60 // Increased from 40px to 60px for better spacing
      const calculatedWidth = Math.max(600, numPoints * minPixelsPerPoint) // Increased minimum from 400px to 600px
      return calculatedWidth
    }

    // Desktop behavior - wider spacing per point for readability
    const pixelsPerPoint = 80
    return Math.max(400, numPoints * pixelsPerPoint)
  }

  const pointPixelWidth = 80 // keep in sync with spacing above

  // Function to calculate optimal tooltip position based on dot position
  const calculateTooltipPosition = (event, dot, chartContainer, chartWidth) => {
    const tooltipWidth = 200 // Approximate tooltip width
    const tooltipHeight = 60 // Approximate tooltip height
    const padding = 10 // Padding from chart container edges

    // Get the scroll offset of the chart container
    const scrollLeft = chartContainer.scrollLeft || 0

    // Get the SVG element to understand its actual position and scaling
    const svgElement = chartContainer.querySelector(".chart-svg")
    const svgRect = svgElement ? svgElement.getBoundingClientRect() : null
    const chartRect = chartContainer.getBoundingClientRect()

    if (svgRect) {
      // Calculate the dot's position in viewport coordinates
      const svgScaleX = svgRect.width / chartWidth
      const svgScaleY = svgRect.height / 300

      // Convert dot position from SVG coordinates to viewport coordinates
      // The dot.x is the position within the SVG, we need to account for scroll
      const dotXInViewport = svgRect.left + dot.x * svgScaleX
      const dotYInViewport = svgRect.top + dot.y * svgScaleY

      // Convert to chart container coordinates and account for scroll
      const dotXInContainer = dotXInViewport - chartRect.left + scrollLeft
      const dotYInContainer = dotYInViewport - chartRect.top

      // Position tooltip above the dot - UNLIMITED positioning
      const x = dotXInContainer
      let y = dotYInContainer - tooltipHeight - padding - 10 // Extra padding to ensure it's above

      // Only adjust vertical position if tooltip would go above the chart container
      if (y < padding) {
        y = dotYInContainer + padding
      }

      return { x, y }
    } else {
      // Fallback to simpler calculation if SVG element not found
      const svgScaleX = chartContainer.clientWidth / chartWidth
      const dotXInContainer = dot.x * svgScaleX - scrollLeft
      const svgScaleY = chartContainer.clientHeight / 300
      const dotYInContainer = dot.y * svgScaleY

      const x = dotXInContainer
      let y = dotYInContainer - tooltipHeight - padding - 10 // Extra padding to ensure it's above

      // Only adjust vertical position if tooltip would go above the chart container
      if (y < padding) {
        y = dotYInContainer + padding
      }

      return { x, y }
    }
  }

  // Function to update tooltip position when scrolling
  const updateTooltipPosition = () => {
    if (hoveredPoint && currentChartContainer && currentChartWidth) {
      const newPosition = calculateTooltipPosition(null, hoveredPoint, currentChartContainer, currentChartWidth)
      setTooltipPosition(newPosition)
    }
  }

  // Function to update PM2.5 tooltip position when scrolling
  const updateTooltipPositionPM25 = () => {
    if (hoveredPointPM25 && currentChartContainerPM25 && currentChartWidthPM25) {
      const newPosition = calculateTooltipPosition(
        null,
        hoveredPointPM25,
        currentChartContainerPM25,
        currentChartWidthPM25,
      )
      setTooltipPositionPM25(newPosition)
    }
  }

  // Function to update PM10 tooltip position when scrolling
  const updateTooltipPositionPM10 = () => {
    if (hoveredPointPM10 && currentChartContainerPM10 && currentChartWidthPM10) {
      const newPosition = calculateTooltipPosition(
        null,
        hoveredPointPM10,
        currentChartContainerPM10,
        currentChartWidthPM10,
      )
      setTooltipPositionPM10(newPosition)
    }
  }

  const renderYAxisTicks = (maxValue) => {
    const ticks = []
    // Round maxValue up to a more appropriate interval based on the range
    let roundedMax, steps

    if (maxValue <= 10) {
      roundedMax = Math.ceil(maxValue)
      steps = 6
    } else if (maxValue <= 100) {
      roundedMax = Math.ceil(maxValue / 5) * 5
      steps = 6
    } else {
      // For larger values like SO2 in 170-180 range
      roundedMax = Math.ceil(maxValue / 10) * 10
      steps = 6
    }

    for (let i = steps; i >= 0; i--) {
      const v = Math.round((roundedMax / steps) * i)
      ticks.push(v.toString())
    }
    return (
      <div className="chart-y-axis">
        {ticks.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    )
  }

  // Function to get chart data based on filter
  const getChartData = (filterType) => {
    if (!sensorData) return []

    switch (filterType) {
      case "co":
        return sensorData.coLevels
      case "no2":
        return sensorData.no2Levels
      case "pm25":
        return sensorData.pm25Levels
      case "pm10":
        return sensorData.pm10Levels
      case "all":
      default:
        return sensorData.pm25Levels // Default to PM2.5
    }
  }

  // Function to get chart title based on filter
  const getChartTitle = (filterType) => {
    switch (filterType) {
      case "co":
        return "CO Levels"
      case "no2":
        return "NO2 Levels"
      case "pm25":
        return "PM2.5 Levels"
      case "pm10":
        return "PM10 Levels"
      case "all":
      default:
        return "PM2.5 Levels"
    }
  }

  // Function to get chart color based on filter
  const getChartColor = (filterType) => {
    switch (filterType) {
      case "co":
        return "#cc0000"
      case "no2":
        return "#ffd84d"
      case "pm25":
        return "#cc0000"
      case "pm10":
        return "#ff6600"
      case "all":
      default:
        return "#cc0000"
    }
  }

  // AQI category helpers for coloring the Volcanic Smog card
  const getAqiCategory = (aqiValue) => {
    const n = Number(aqiValue)
    const aqi = Number.isFinite(n) ? n : 0
    if (aqi <= 50) return { key: "good", label: "Good" }
    if (aqi <= 100) return { key: "moderate", label: "Moderate" }
    if (aqi <= 150) return { key: "usg", label: "Unhealthy for Sensitive Groups" }
    if (aqi <= 200) return { key: "unhealthy", label: "Unhealthy" }
    if (aqi <= 300) return { key: "very-unhealthy", label: "Very Unhealthy" }
    return { key: "hazardous", label: "Hazardous" }
  }

  const getAqiPercent = (aqiValue) => {
    const n = Number(aqiValue)
    const aqi = Number.isFinite(n) ? n : 0
    const pct = (aqi / 500) * 100
    return Math.max(0, Math.min(100, pct))
  }

  // SO2 thresholds based on AQI categories (in ppm)
  const getSo2Category = (so2Value) => {
    const n = Number(so2Value)
    const so2 = Number.isFinite(n) ? n : 0

    // Use same thresholds as AQI categories
    if (so2 <= 50) return { key: "good", label: "Good" }
    if (so2 <= 100) return { key: "moderate", label: "Moderate" }
    if (so2 <= 150) return { key: "usg", label: "Unhealthy for Sensitive Groups" }
    if (so2 <= 200) return { key: "unhealthy", label: "Unhealthy" }
    if (so2 <= 300) return { key: "very-unhealthy", label: "Very Unhealthy" }
    return { key: "hazardous", label: "Hazardous" }
  }

  const getSo2Percent = (so2Value) => {
    const n = Number(so2Value)
    const so2 = Number.isFinite(n) ? n : 0
    const pct = (so2 / 500) * 100
    return Math.max(0, Math.min(100, pct))
  }

  // Function to check if chart should show maintenance
  const isChartInMaintenance = (filterType) => {
    // Respect admin toggles; otherwise only treat as unavailable, not maintenance
    const maintenance = sensorData?.maintenance || {}
    if (maintenance.dashboard) return true
    if (filterType === "co" && maintenance.coChart) return true
    if (filterType === "no2" && maintenance.no2Chart) return true
    if (filterType === "pm25" && maintenance.pm25Chart) return true
    if (filterType === "pm10" && maintenance.pm10Chart) return true
    return false
  }

  // Fetch data on mount and subscribe to realtime updates
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    let unsubscribe = null
    let unsubMaint = null
    let unsubAlert = null

    const initializeDashboard = async () => {
      const locations = await sensorService.getSensorLocations()
      setAvailableLocations(locations)

      // Initial fetch for immediate UI
      await fetchSensorData(selectedLocation)
      await fetchPredictions(selectedLocation)

      // Start realtime subscription for selected location (or default)
      unsubscribe = sensorService.onRealtimeUpdates(selectedLocation, (processedData) => {
        setSensorData(processedData)
        // Trigger prediction refresh when new sensor data arrives
        fetchPredictionsDebounced()
      })

      // Subscribe to admin maintenance and public alert for cross-device realtime updates
      try {
        unsubMaint = adminService.onMaintenanceSettings(() => {
          // re-fetch to re-apply maintenance masking from service helper
          fetchSensorData(selectedLocation)
        })
      } catch (_) {}
      try {
        unsubAlert = adminService.onPublicAlert((alert) => {
          setPublicAlert(alert || null)
        })
      } catch (_) {}
    }

    initializeDashboard()

    // Listen to admin maintenance changes via storage event to refetch
    const onStorage = (e) => {
      if (e.key === "maintenanceSettings" || e.key === "maintenanceSettingsVersion") {
        fetchSensorData(selectedLocation)
      }
      if (e.key === "publicAlert" || e.key === "publicAlertVersion") {
        try {
          const raw = localStorage.getItem("publicAlert")
          setPublicAlert(raw ? JSON.parse(raw) : null)
        } catch (_) {
          setPublicAlert(null)
        }
      }
    }
    window.addEventListener("storage", onStorage)

    // Set up periodic prediction refresh every 60 seconds
    const predictionInterval = setInterval(() => {
      fetchPredictions(selectedLocation).catch(err => {
        console.error('Periodic prediction fetch failed:', err)
      })
    }, 60000) // Update predictions every 60 seconds

    return () => {
      if (typeof unsubscribe === "function") unsubscribe()
      if (typeof unsubMaint === "function") unsubMaint()
      if (typeof unsubAlert === "function") unsubAlert()
      window.removeEventListener("storage", onStorage)
      clearInterval(predictionInterval)
    }
  }, [selectedLocation])

  // On mount, load any existing alert
  useEffect(() => {
    try {
      const raw = localStorage.getItem("publicAlert")
      setPublicAlert(raw ? JSON.parse(raw) : null)
    } catch (_) {
      setPublicAlert(null)
    }
  }, [])

  // Add scroll event listener for tooltip positioning
  useEffect(() => {
    if (currentChartContainer) {
      const handleScroll = () => {
        updateTooltipPosition()
      }

      currentChartContainer.addEventListener("scroll", handleScroll)

      return () => {
        currentChartContainer.removeEventListener("scroll", handleScroll)
      }
    }
  }, [currentChartContainer, hoveredPoint, currentChartWidth])

  // Add scroll event listener for PM2.5 tooltip positioning
  useEffect(() => {
    if (currentChartContainerPM25) {
      const handleScroll = () => {
        updateTooltipPositionPM25()
      }

      currentChartContainerPM25.addEventListener("scroll", handleScroll)

      return () => {
        currentChartContainerPM25.removeEventListener("scroll", handleScroll)
      }
    }
  }, [currentChartContainerPM25, hoveredPointPM25, currentChartWidthPM25])

  // Add scroll event listener for PM10 tooltip positioning
  useEffect(() => {
    if (currentChartContainerPM10) {
      const handleScroll = () => {
        updateTooltipPositionPM10()
      }

      currentChartContainerPM10.addEventListener("scroll", handleScroll)

      return () => {
        currentChartContainerPM10.removeEventListener("scroll", handleScroll)
      }
    }
  }, [currentChartContainerPM10, hoveredPointPM10, currentChartWidthPM10])

  // Handle location change
  const handleLocationChange = async (event) => {
    const location = event.target.value
    setSelectedLocation(location)
    if (location) {
      await fetchSensorData(location)
      await fetchPredictions(location)
    }
  }

  // Handle filter change
  const handleFilterChange = (event) => {
    setSelectedFilter(event.target.value)
  }

  // Show loading state
  if (isLoading && !sensorData) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading sensor data...</div>
      </div>
    )
  }

  // Show error state if no data
  if (!sensorData) {
    return (
      <div className="error-container">
        <div className="error-message">Unable to load sensor data. Please check your connection.</div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      {publicAlert && (
        <div className="alert-banner" style={{
          background: '#fff3cd',
          color: '#664d03',
          borderBottom: '1px solid #ffecb5',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'center' }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span><strong>{publicAlert.message || 'Alert'}</strong>{publicAlert.time ? ` • ${new Date(publicAlert.time).toLocaleString()}` : ''}</span>
          </div>
          <button
            onClick={() => setPublicAlert(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#664d03',
              fontSize: 18,
              cursor: 'pointer',
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)'
            }}
            aria-label="Dismiss alert"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
      {publicAlert && (
        <div style={{ height: 48 }}></div>
      )}
      <nav className="dashboard-navbar">
        <span className="dashboard-title">VOG & Air Quality Dashboard</span>
        <div className="dashboard-links">
          <Link to="/" className="dashboard-link">
            Air Quality Statistics
          </Link>
          <Link to="/emergency-contacts" className="dashboard-link">
            Emergency Contacts
          </Link>
          <Link to="/emergency-protocol" className="dashboard-link">
            Emergency Protocol
          </Link>
        </div>
      </nav>

      <div className="dashboard-container">
        <h1 className="dashboard-main-title">AIR QUALITY STATISTICS</h1>
        {/* Top Controls */}
        <div className="top-controls">
          {availableLocations.length > 0 && (
            <div className="sensor-location-container">
              <label htmlFor="sensor-location" className="sensor-location-label">
                Sensor Location
              </label>
              <select
                id="sensor-location"
                className="form-select sensor-location-dropdown"
                value={selectedLocation}
                onChange={handleLocationChange}
                disabled={isLoading}
              >
                <option value="">Select..</option>
                {availableLocations.map((location, index) => (
                  <option key={index} value={location}>
                    {getLocationLabel(location)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="filter-chart-container">
            <label htmlFor="filter-chart" className="filter-chart-label">
              Filter Chart
            </label>
            <select
              id="filter-chart"
              className="form-select filter-chart-dropdown"
              value={selectedFilter}
              onChange={handleFilterChange}
              disabled={isLoading}
            >
              <option value="">Select..</option>
              <option value="all">All Data</option>
              <option value="pm25">PM2.5</option>
              <option value="pm10">PM10</option>
              <option value="no2">NO₂</option>
              <option value="co">CO</option>
            </select>
          </div>
        </div>

        {/* Three Column Layout */}
        <div className="dashboard-columns">
          {/* Left Column - Sensor Data Cards */}
          <div className="left-column">
            <div className="info-card">
              <div className="card-header">
                <h4>
                  <strong>Current Air Quality</strong>
                </h4>
                <span className="card-icon">↔</span>
              </div>
              {(() => {
                const isAqiMaint =
                  sensorData?.airQuality?.level === "UNDER MAINTENANCE" ||
                  sensorData?.airQuality?.level === "NO SENSORS DETECTED"
                const aqiVal = Number(sensorData?.airQuality?.aqi ?? 0)
                const aqiLabel = isAqiMaint ? sensorData?.airQuality?.level : getAqiCategory(aqiVal).label
                return (
                  <>
                    <h2 className={isAqiMaint ? "maintenance-text" : ""}>{aqiLabel}</h2>
                    <p>AQI: {isAqiMaint ? "N/A" : aqiVal}</p>
                    {!isAqiMaint && (() => {
                      const pct = getAqiPercent(aqiVal)
                      const catKey = getAqiCategory(aqiVal).key
                      return (
                        <div className="progress-bar">
                          <div className="progress-indicator-container" style={{ left: `${pct}%` }}>
                            <div className={`progress-indicator aqi-${catKey}`}></div>
                          </div>
                        </div>
                      )
                    })()}
                  </>
                )
              })()}
            </div>

            <div className="info-card">
              <div className="card-header">
                <h4>
                  <strong>CO Readings</strong>
                </h4>
                <span className="card-icon" aria-label="CO icon"><FlaskConical size={20} /></span>
              </div>
              {(() => {
                const isMaint = sensorData?.maintenance?.dashboard
                const value = sensorData?.coLevels?.length > 0 ? sensorData.coLevels[sensorData.coLevels.length - 1].value : "N/A"
                return (
                  <>
                    <h2 className={isMaint ? "maintenance-text" : ""}>{isMaint ? "UNDER MAINTENANCE" : `${value} ppm`}</h2>
                    {!isMaint && <p>Carbon Monoxide</p>}
                    {isMaint && <p>Carbon Monoxide</p>}
                  </>
                )
              })()}
            </div>

            <div className="info-card">
              <div className="card-header">
                <h4>
                  <strong>NO2 Readings</strong>
                </h4>
                <span className="card-icon" aria-label="NO2 icon"><Factory size={20} /></span>
              </div>
              {(() => {
                const isMaint = sensorData?.maintenance?.dashboard
                const latestRaw = sensorData?.no2Levels?.length > 0
                  ? sensorData.no2Levels[sensorData.no2Levels.length - 1].value
                  : null
                let value = "N/A"
                if (latestRaw !== null && latestRaw !== undefined && !Number.isNaN(Number(latestRaw))) {
                  const n = Number(latestRaw)
                  if (n === 0) value = "0.00"
                  else if (Math.abs(n) < 0.01) value = n.toFixed(4)
                  else value = n.toFixed(2)
                }
                return (
                  <>
                    <h2 className={isMaint ? "maintenance-text" : ""}>{isMaint ? "UNDER MAINTENANCE" : `${value} ppm`}</h2>
                    <p>Nitrogen Dioxide</p>
                  </>
                )
              })()}
            </div>

            <div className="info-card">
              <div className="card-header">
                <h4>
                  <strong>PM2.5 Readings</strong>
                </h4>
                <span className="card-icon" aria-label="PM2.5 icon"><Wind size={20} /></span>
              </div>
              {(() => {
                const isMaint = sensorData?.maintenance?.dashboard
                const value = sensorData?.pm25Levels?.length > 0 ? sensorData.pm25Levels[sensorData.pm25Levels.length - 1].value : "N/A"
                return (
                  <>
                    <h2 className={isMaint ? "maintenance-text" : ""}>{isMaint ? "UNDER MAINTENANCE" : `${value} μg/m³`}</h2>
                    <p>Particulate Matter 2.5</p>
                  </>
                )
              })()}
            </div>

            <div className="info-card">
              <div className="card-header">
                <h4>
                  <strong>PM10 Readings</strong>
                </h4>
                <span className="card-icon" aria-label="PM10 icon"><Wind size={20} /></span>
              </div>
              {(() => {
                const isMaint = sensorData?.maintenance?.dashboard
                const value = sensorData?.pm10Levels?.length > 0 ? sensorData.pm10Levels[sensorData.pm10Levels.length - 1].value : "N/A"
                return (
                  <>
                    <h2 className={isMaint ? "maintenance-text" : ""}>{isMaint ? "UNDER MAINTENANCE" : `${value} μg/m³`}</h2>
                    <p>Particulate Matter 10</p>
                  </>
                )
              })()}
            </div>

          </div>

          {/* Middle Column - Charts */}
          <div className="middle-column">
            <div className="chart-card">
              <h4>
                <strong>{getChartTitle(selectedFilter || "pm25")}</strong>
              </h4>
              <div className="chart-container">
                {isChartInMaintenance(selectedFilter || "pm25") ? (
                  <div className="maintenance-chart">
                    <div className="maintenance-text">Charts Under Maintenance</div>
                    <p>Sensor data unavailable</p>
                  </div>
                ) : (
                  <>
                    {renderYAxisTicks(getChartMax(selectedFilter || "pm25"))}
                    <div className="chart-area">
                      <div
                        className="chart-inner"
                        style={{
                          width: `${getChartWidth(selectedFilter || "pm25")}px`,
                          minWidth: `${getChartWidth(selectedFilter || "pm25")}px`,
                        }}
                      >
                        <svg
                          className="chart-svg"
                          style={{
                            width: `${getChartWidth(selectedFilter || "pm25")}px`,
                            height: "300px",
                          }}
                          viewBox={`0 0 ${getChartWidth(selectedFilter || "pm25")} 300`}
                          preserveAspectRatio="none"
                        >
                          <polyline
                            points={generateChartPoints(
                              getChartData(selectedFilter || "pm25"),
                              getChartMax(selectedFilter || "pm25"),
                              getChartWidth(selectedFilter || "pm25"),
                            )}
                            fill="none"
                            stroke={getChartColor(selectedFilter || "pm25")}
                            strokeWidth="2"
                          />
                          {generateChartDots(
                            getChartData(selectedFilter || "pm25"),
                            getChartMax(selectedFilter || "pm25"),
                            getChartWidth(selectedFilter || "pm25"),
                          ).map((dot, index) => (
                            <circle
                              key={index}
                              className="chart-dot"
                              cx={dot.x}
                              cy={dot.y}
                              r="4"
                              fill={getChartColor(selectedFilter || "pm25")}
                              stroke="white"
                              strokeWidth="2"
                              onMouseEnter={(e) => {
                                setHoveredPoint(dot)
                                const chartContainer = e.target.closest(".chart-area")
                                const chartWidth = getChartWidth(selectedFilter || "pm25")
                                setCurrentChartContainer(chartContainer)
                                setCurrentChartWidth(chartWidth)
                                setTooltipPosition(calculateTooltipPosition(e, dot, chartContainer, chartWidth))
                              }}
                              onMouseLeave={() => setHoveredPoint(null)}
                            />
                          ))}
                        </svg>
                        {hoveredPoint && (
                          <div
                            className="chart-tooltip"
                            style={{
                              left: tooltipPosition.x,
                              top: tooltipPosition.y,
                            }}
                          >
                            <div>
                              <strong>Time:</strong> {hoveredPoint.time}
                            </div>
                            <div>
                              <strong>Value:</strong> {hoveredPoint.originalValue}
                            </div>
                          </div>
                        )}
                        <div
                          className="chart-x-axis"
                          style={{
                            width: `${getChartWidth(selectedFilter || "pm25")}px`,
                          }}
                        >
                          {getChartData(selectedFilter || "pm25").map((point, index) => (
                            <span
                              key={index}
                              style={{
                                width: window.innerWidth <= 1024 ? "60px" : `${pointPixelWidth}px`,
                                textAlign: "center",
                                display: "inline-block",
                              }}
                            >
                              {point.time}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {selectedFilter === "all" && (
              <>
                <div className="chart-card">
                  <h4>
                    <strong>NO2 Levels</strong>
                  </h4>
                  <div className="chart-container">
                    {isChartInMaintenance("no2") ? (
                      <div className="maintenance-chart">
                        <div className="maintenance-text">Charts Under Maintenance</div>
                        <p>Sensor data unavailable</p>
                      </div>
                    ) : (
                      <>
                        {renderYAxisTicks(getChartMax("no2"))}
                        <div className="chart-area">
                          <div
                            className="chart-inner"
                            style={{
                              width: `${getChartWidth("no2")}px`,
                              minWidth: `${getChartWidth("no2")}px`,
                            }}
                          >
                            <svg
                              className="chart-svg"
                              style={{
                                width: `${getChartWidth("no2")}px`,
                                height: "300px",
                              }}
                              viewBox={`0 0 ${getChartWidth("no2")} 300`}
                              preserveAspectRatio="none"
                            >
                              <polyline
                                points={generateChartPoints(
                                  sensorData.no2Levels,
                                  getChartMax("no2"),
                                  getChartWidth("no2"),
                                )}
                                fill="none"
                                stroke="#ffd84d"
                                strokeWidth="2"
                              />
                              {generateChartDots(sensorData.no2Levels, getChartMax("no2"), getChartWidth("no2")).map(
                                (dot, index) => (
                                  <circle
                                    key={index}
                                    className="chart-dot"
                                    cx={dot.x}
                                    cy={dot.y}
                                    r="4"
                                    fill="#ffd84d"
                                    stroke="white"
                                    strokeWidth="2"
                                    onMouseEnter={(e) => {
                                      setHoveredPointPM25(dot)
                                      const chartContainer = e.target.closest(".chart-area")
                                      const chartWidth = getChartWidth("no2")
                                      setCurrentChartContainerPM25(chartContainer)
                                      setCurrentChartWidthPM25(chartWidth)
                                      setTooltipPositionPM25(
                                        calculateTooltipPosition(e, dot, chartContainer, chartWidth),
                                      )
                                    }}
                                    onMouseLeave={() => setHoveredPointPM25(null)}
                                  />
                                ),
                              )}
                            </svg>
                            {hoveredPointPM25 && (
                              <div
                                className="chart-tooltip"
                                style={{
                                  left: tooltipPositionPM25.x,
                                  top: tooltipPositionPM25.y,
                                }}
                              >
                                <div>
                                  <strong>Time:</strong> {hoveredPointPM25.time}
                                </div>
                                <div>
                                  <strong>Value:</strong> {hoveredPointPM25.originalValue}
                                </div>
                              </div>
                            )}
                            <div
                              className="chart-x-axis"
                              style={{
                                width: `${getChartWidth("no2")}px`,
                              }}
                            >
                              {sensorData.no2Levels.map((point, index) => (
                                <span
                                  key={index}
                                  style={{
                                    width: window.innerWidth <= 1024 ? "60px" : `${pointPixelWidth}px`,
                                    textAlign: "center",
                                    display: "inline-block",
                                  }}
                                >
                                  {point.time}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="chart-card">
                  <h4>
                    <strong>PM10 Levels</strong>
                  </h4>
                  <div className="chart-container">
                    {isChartInMaintenance("pm10") ? (
                      <div className="maintenance-chart">
                        <div className="maintenance-text">Charts Under Maintenance</div>
                        <p>Sensor data unavailable</p>
                      </div>
                    ) : (
                      <>
                        {renderYAxisTicks(getChartMax("pm10"))}
                        <div className="chart-area">
                          <div
                            className="chart-inner"
                            style={{
                              width: `${getChartWidth("pm10") }px`,
                              minWidth: `${getChartWidth("pm10") }px`,
                            }}
                          >
                            <svg
                              className="chart-svg"
                              style={{
                                width: `${getChartWidth("pm10") }px`,
                                height: "300px",
                              }}
                              viewBox={`0 0 ${getChartWidth("pm10")} 300`}
                              preserveAspectRatio="none"
                            >
                              <polyline
                                points={generateChartPoints(
                                  sensorData.pm10Levels,
                                  getChartMax("pm10"),
                                  getChartWidth("pm10"),
                                )}
                                fill="none"
                                stroke="#ff6600"
                                strokeWidth="2"
                              />
                              {generateChartDots(sensorData.pm10Levels, getChartMax("pm10"), getChartWidth("pm10")).map(
                                (dot, index) => (
                                  <circle
                                    key={index}
                                    className="chart-dot"
                                    cx={dot.x}
                                    cy={dot.y}
                                    r="4"
                                    fill="#ff6600"
                                    stroke="white"
                                    strokeWidth="2"
                                    onMouseEnter={(e) => {
                                      setHoveredPointPM10(dot)
                                      const chartContainer = e.target.closest(".chart-area")
                                      const chartWidth = getChartWidth("pm10")
                                      setCurrentChartContainerPM10(chartContainer)
                                      setCurrentChartWidthPM10(chartWidth)
                                      setTooltipPositionPM10(
                                        calculateTooltipPosition(e, dot, chartContainer, chartWidth),
                                      )
                                    }}
                                    onMouseLeave={() => setHoveredPointPM10(null)}
                                  />
                                ),
                              )}
                            </svg>
                            {hoveredPointPM10 && (
                              <div
                                className="chart-tooltip"
                                style={{
                                  left: tooltipPositionPM10.x,
                                  top: tooltipPositionPM10.y,
                                }}
                              >
                                <div>
                                  <strong>Time:</strong> {hoveredPointPM10.time}
                                </div>
                                <div>
                                  <strong>Value:</strong> {hoveredPointPM10.originalValue}
                                </div>
                              </div>
                            )}
                            <div
                              className="chart-x-axis"
                              style={{
                                width: `${getChartWidth("pm10") }px`,
                              }}
                            >
                              {sensorData.pm10Levels.map((point, index) => (
                                <span
                                  key={index}
                                  style={{
                                    width: window.innerWidth <= 1024 ? "60px" : `${pointPixelWidth}px`,
                                    textAlign: "center",
                                    display: "inline-block",
                                  }}
                                >
                                  {point.time}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="chart-card">
                  <h4>
                    <strong>CO Levels</strong>
                  </h4>
                  <div className="chart-container">
                    {isChartInMaintenance("co") ? (
                      <div className="maintenance-chart">
                        <div className="maintenance-text">Charts Under Maintenance</div>
                        <p>Sensor data unavailable</p>
                      </div>
                    ) : (
                      <>
                        {renderYAxisTicks(getChartMax("co"))}
                        <div className="chart-area">
                          <div
                            className="chart-inner"
                            style={{
                              width: `${getChartWidth("co")}px`,
                              minWidth: `${getChartWidth("co")}px`,
                            }}
                          >
                            <svg
                              className="chart-svg"
                              style={{
                                width: `${getChartWidth("co")}px`,
                                height: "300px",
                              }}
                              viewBox={`0 0 ${getChartWidth("co")} 300`}
                              preserveAspectRatio="none"
                            >
                              <polyline
                                points={generateChartPoints(
                                  sensorData.coLevels,
                                  getChartMax("co"),
                                  getChartWidth("co"),
                                )}
                                fill="none"
                                stroke="#cc0000"
                                strokeWidth="2"
                              />
                              {generateChartDots(sensorData.coLevels, getChartMax("co"), getChartWidth("co")).map(
                                (dot, index) => (
                                  <circle
                                    key={index}
                                    className="chart-dot"
                                    cx={dot.x}
                                    cy={dot.y}
                                    r="4"
                                    fill="#cc0000"
                                    stroke="white"
                                    strokeWidth="2"
                                    onMouseEnter={(e) => {
                                      setHoveredPointPM10(dot)
                                      const chartContainer = e.target.closest(".chart-area")
                                      const chartWidth = getChartWidth("co")
                                      setCurrentChartContainerPM10(chartContainer)
                                      setCurrentChartWidthPM10(chartWidth)
                                      setTooltipPositionPM10(
                                        calculateTooltipPosition(e, dot, chartContainer, chartWidth),
                                      )
                                    }}
                                    onMouseLeave={() => setHoveredPointPM10(null)}
                                  />
                                ),
                              )}
                            </svg>
                            {hoveredPointPM10 && (
                              <div
                                className="chart-tooltip"
                                style={{
                                  left: tooltipPositionPM10.x,
                                  top: tooltipPositionPM10.y,
                                }}
                              >
                                <div>
                                  <strong>Time:</strong> {hoveredPointPM10.time}
                                </div>
                                <div>
                                  <strong>Value:</strong> {hoveredPointPM10.originalValue}
                                </div>
                              </div>
                            )}
                            <div
                              className="chart-x-axis"
                              style={{
                                width: `${getChartWidth("co")}px`,
                              }}
                            >
                              {sensorData.coLevels.map((point, index) => (
                                <span
                                  key={index}
                                  style={{
                                    width: window.innerWidth <= 1024 ? "60px" : `${pointPixelWidth}px`,
                                    textAlign: "center",
                                    display: "inline-block",
                                  }}
                                >
                                  {point.time}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Humidity and Temperature Cards - Moved below all charts */}
            <div className="humidity-temperature-container">
              <div className="humidity-card">
                <div className="card-header">
                  <h4>
                    <strong>Humidity</strong>
                  </h4>
                  <span className="card-icon">💧</span>
                </div>
                <div className="humidity-content">
                  {sensorData?.maintenance?.dashboard ? (
                    <div className="maintenance-text">UNDER MAINTENANCE</div>
                  ) : (
                    <>
                      <div className="humidity-value">
                        {sensorData?.humidity?.value !== undefined ? `${sensorData.humidity.value.toFixed(1)}%` : "N/A"}
                      </div>
                      <div className="humidity-level">
                        {sensorData?.humidity?.level || "N/A"}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="temperature-card">
                <div className="card-header">
                  <h4>
                    <strong>Temperature</strong>
                  </h4>
                  <span className="card-icon">🌡️</span>
                </div>
                <div className="temperature-content">
                  {sensorData?.maintenance?.dashboard ? (
                    <div className="maintenance-text">UNDER MAINTENANCE</div>
                  ) : (
                    <>
                      <div className="temperature-value">
                        {sensorData?.temperature?.value !== undefined ? `${sensorData.temperature.value.toFixed(1)}°C` : "N/A"}
                      </div>
                      <div className="temperature-level">
                        {sensorData?.temperature?.level || "N/A"}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Prediction Cards - Display backend prediction results */}
            <div className="prediction-cards-container">
              <div className="info-card">
                <div className="card-header">
                  <h4>
                    <strong>Predicted PM2.5 (1h ahead)</strong>
                  </h4>
                  <span className="card-icon">🔮</span>
                </div>
                {sensorData?.maintenance?.dashboard ? (
                  <div className="maintenance-text">UNDER MAINTENANCE</div>
                ) : predictionLoading ? (
                  <div className="loading-text">Loading predictions...</div>
                ) : predictions?.pm && Array.isArray(predictions.pm) ? (
                  (() => {
                    const pmData = predictions.pm.slice(0, 3); // Get first 3 hours
                    return (
                      <>
                        <div className="predicted-lines">
                          {pmData.map((prediction, index) => (
                            <div key={index}>
                              Hour {index + 1}: {prediction['PM2.5']?.toFixed(2) || 'N/A'} μg/m³
                            </div>
                          ))}
                        </div>
                        <p>Particulate Matter 2.5</p>
                      </>
                    )
                  })()
                ) : (
                  <div className="error-text">Prediction unavailable</div>
                )}
              </div>

              <div className="info-card">
                <div className="card-header">
                  <h4>
                    <strong>Predicted PM10 (1h ahead)</strong>
                  </h4>
                  <span className="card-icon">🔮</span>
                </div>
                {sensorData?.maintenance?.dashboard ? (
                  <div className="maintenance-text">UNDER MAINTENANCE</div>
                ) : predictionLoading ? (
                  <div className="loading-text">Loading predictions...</div>
                ) : predictions?.pm && Array.isArray(predictions.pm) ? (
                  (() => {
                    const pmData = predictions.pm.slice(0, 3); // Get first 3 hours
                    return (
                      <>
                        <div className="predicted-lines">
                          {pmData.map((prediction, index) => (
                            <div key={index}>
                              Hour {index + 1}: {prediction['PM10']?.toFixed(2) || 'N/A'} μg/m³
                            </div>
                          ))}
                        </div>
                        <p>Particulate Matter 10</p>
                      </>
                    )
                  })()
                ) : (
                  <div className="error-text">Prediction unavailable</div>
                )}
              </div>

              <div className="info-card">
                <div className="card-header">
                  <h4>
                    <strong>Predicted NO2 (1h ahead)</strong>
                  </h4>
                  <span className="card-icon">🔮</span>
                </div>
                {sensorData?.maintenance?.dashboard ? (
                  <div className="maintenance-text">UNDER MAINTENANCE</div>
                ) : predictionLoading ? (
                  <div className="loading-text">Loading predictions...</div>
                ) : predictions?.no2 && Array.isArray(predictions.no2) ? (
                  (() => {
                    const no2Data = predictions.no2.slice(0, 3); // Get first 3 hours
                    return (
                      <>
                        <div className="predicted-lines">
                          {no2Data.map((prediction, index) => (
                            <div key={index}>
                              Hour {index + 1}: {prediction['NO2']?.toFixed(2) || 'N/A'} ppm
                            </div>
                          ))}
                        </div>
                        <p>Nitrogen Dioxide</p>
                      </>
                    )
                  })()
                ) : (
                  <div className="error-text">Prediction unavailable</div>
                )}
              </div>

              <div className="info-card">
                <div className="card-header">
                  <h4>
                    <strong>Predicted CO (1h ahead)</strong>
                  </h4>
                  <span className="card-icon">🔮</span>
                </div>
                {sensorData?.maintenance?.dashboard ? (
                  <div className="maintenance-text">UNDER MAINTENANCE</div>
                ) : predictionLoading ? (
                  <div className="loading-text">Loading predictions...</div>
                ) : predictions?.co && Array.isArray(predictions.co) ? (
                  (() => {
                    const coData = predictions.co.slice(0, 3); // Get first 3 hours
                    return (
                      <>
                        <div className="predicted-lines">
                          {coData.map((prediction, index) => (
                            <div key={index}>
                              Hour {index + 1}: {prediction['CO']?.toFixed(2) || 'N/A'} ppm
                            </div>
                          ))}
                        </div>
                        <p>Carbon Monoxide</p>
                      </>
                    )
                  })()
                ) : (
                  <div className="error-text">Prediction unavailable</div>
                )}
              </div>
            </div>

          </div>


          {/* Right Column - AQI Categories */}
          <div className="right-column">
            <div className="hazard-card">
              <h2 className="hazard-title">
                <strong>AQI Categories</strong>
              </h2>
              <div className="hazard-levels">
                <div className="hazard-level">
                  <span className="circle aqi-good"></span>
                  <div className="hazard-content">
                    <h3>Green (Good)</h3>
                    <h5>0 – 50</h5>
                    <p>Considered satisfactory & poses little or no risk.</p>
                  </div>
                </div>
                <div className="hazard-level">
                  <span className="circle aqi-moderate"></span>
                  <div className="hazard-content">
                    <h3>Yellow (Moderate)</h3>
                    <h5>51 – 100</h5>
                    <p>Acceptable, however, may be moderate health concern for small number of people.</p>
                  </div>
                </div>
                <div className="hazard-level">
                  <span className="circle aqi-usg"></span>
                  <div className="hazard-content">
                    <h3>Orange (Unhealthy for Sensitive Groups)</h3>
                    <h5>101 – 150</h5>
                    <p>
                      Sensitive groups, including those with mild asthma, may feel effects at lower levels. At the
                      higher end, active asthmatics outdoors are likely to have breathing issues, while the general
                      public is not expected to be affected
                    </p>
                  </div>
                </div>
                <div className="hazard-level">
                  <span className="circle aqi-unhealthy"></span>
                  <div className="hazard-content">
                    <h3>Red (Unhealthy)</h3>
                    <h5>151 – 200</h5>
                    <p>
                      Everyone may begin to experience health effects. Members of sensitive groups may experience more
                      serious health effects.
                    </p>
                  </div>
                </div>
                <div className="hazard-level">
                  <span className="circle aqi-very-unhealthy"></span>
                  <div className="hazard-content">
                    <h3>Purple (Very Unhealthy)</h3>
                    <h5>201 – 300</h5>
                    <p>Triggers health alert, meaning everyone may experience more serious health effects.</p>
                  </div>
                </div>
                <div className="hazard-level">
                  <span className="circle aqi-hazardous"></span>
                  <div className="hazard-content">
                    <h3>Maroon (Hazardous)</h3>
                    <h5>301 – 500</h5>
                    <p>
                      Triggers health warnings of emergency conditions. Entire population is more likely to be affected.
                    </p>
                  </div>
                </div>
              </div>
              <p className="disclaimer">Note: This system has an 90% accuracy. Minor discrepancies may be present.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
