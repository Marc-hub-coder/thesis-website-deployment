import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLogoutButton from './AdminLogoutButton';
import '../styles/AdminReports.css';
import { reportService } from '../services/reportService';

const AdminReports = () => {
  const [reportConfig, setReportConfig] = useState({
    reportType: 'daily',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    location: 'all',
    parameters: ['aqi', 'pm25', 'pm10', 'co', 'no2']
  });

  const [reportData, setReportData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableLocations, setAvailableLocations] = useState(['All Locations', 'Location 1', 'Location 2', 'Location 3']);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    // Load available locations
    loadLocations();
    
    // Update current date/time every second
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const loadLocations = async () => {
    try {
      const locations = await reportService.getAvailableLocations();
      setAvailableLocations(['All Locations', ...locations]);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleConfigChange = (field, value) => {
    setReportConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleParameterToggle = (parameter) => {
    setReportConfig(prev => ({
      ...prev,
      parameters: prev.parameters.includes(parameter)
        ? prev.parameters.filter(p => p !== parameter)
        : [...prev.parameters, parameter]
    }));
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const data = await reportService.generateReport(reportConfig);
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportCSV = (type = 'comprehensive') => {
    if (!reportData) return;
    
    try {
      reportService.exportToCSV(reportData, type, reportConfig);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV. Please try again.');
    }
  };

  const printReport = () => {
    window.print();
  };

  const getParameterLabel = (param) => {
    const labels = {
      aqi: 'Air Quality Index',
      pm25: 'PM2.5',
      pm10: 'PM10',
      co: 'Carbon Monoxide',
      no2: 'Nitrogen Dioxide'
    };
    return labels[param] || param;
  };

  return (
    <div className="admin-reports">
      <nav className="dashboard-navbar">
        <span className="dashboard-title">VOG & Air Quality Dashboard - ADMIN</span>
        <div className="dashboard-links">
          <Link to="/admin" className="dashboard-link">Admin Panel</Link>
          <Link to="/admin/emergency-contacts" className="dashboard-link">Emergency Contacts</Link>
          <Link to="/admin/emergency-protocol" className="dashboard-link">Emergency Protocol</Link>
          <Link to="/admin/reports" className="dashboard-link active">Reports</Link>
          <Link to="/" className="dashboard-link">Public Dashboard</Link>
          <AdminLogoutButton />
        </div>
      </nav>

      <div className="reports-container">
        <h1 className="reports-title">📊 Report Generation</h1>
        
        {/* Real-time Date/Time Display */}
        <div className="datetime-display">
          <div className="current-date">
            📅 {currentDateTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <div className="current-time">
            🕐 {currentDateTime.toLocaleTimeString('en-US', { 
              hour12: true, 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })}
          </div>
        </div>
        
        {/* Report Configuration */}
        <div className="report-config-section">
          <h2 className="section-title">⚙️ Report Configuration</h2>
          
          <div className="config-grid">
            <div className="config-item">
              <label className="config-label">Report Type</label>
              <select 
                value={reportConfig.reportType}
                onChange={(e) => handleConfigChange('reportType', e.target.value)}
                className="config-select"
              >
                <option value="daily">Daily Report</option>
                <option value="weekly">Weekly Report</option>
                <option value="monthly">Monthly Report</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            <div className="config-item">
              <label className="config-label">Start Date</label>
              <input
                type="date"
                value={reportConfig.startDate}
                onChange={(e) => handleConfigChange('startDate', e.target.value)}
                className="config-input"
              />
            </div>

            <div className="config-item">
              <label className="config-label">End Date</label>
              <input
                type="date"
                value={reportConfig.endDate}
                onChange={(e) => handleConfigChange('endDate', e.target.value)}
                className="config-input"
              />
            </div>

            <div className="config-item">
              <label className="config-label">Location</label>
              <select 
                value={reportConfig.location}
                onChange={(e) => handleConfigChange('location', e.target.value)}
                className="config-select"
              >
                {availableLocations.map(location => (
                  <option key={location} value={location === 'All Locations' ? 'all' : location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="parameters-section">
            <label className="config-label">Parameters to Include</label>
            <div className="parameters-grid">
              {['aqi', 'pm25', 'pm10', 'co', 'no2'].map(param => (
                <label key={param} className="parameter-checkbox">
                  <input
                    type="checkbox"
                    checked={reportConfig.parameters.includes(param)}
                    onChange={() => handleParameterToggle(param)}
                  />
                  <span>{getParameterLabel(param)}</span>
                </label>
              ))}
            </div>
          </div>

          <button 
            className="generate-btn"
            onClick={generateReport}
            disabled={isGenerating}
          >
            {isGenerating ? '🔄 Generating...' : '📊 Generate Report'}
          </button>
        </div>

        {/* Report Display */}
        {reportData && (
          <div className="report-display-section">
            <h2 className="section-title">📋 Report Results</h2>
            
            {/* System Status Display */}
            <div className="system-status-display">
              <div className={`status-indicator ${reportData.systemStatus}`}>
                <span className="status-icon">
                  {reportData.systemStatus === 'maintenance' ? '🔧' : 
                   reportData.systemStatus === 'no_sensors' ? '❌' : 
                   reportData.systemStatus === 'operational' ? '✅' : 
                   reportData.systemStatus === 'no_data' ? '📊' : '❓'}
                </span>
                <span className="status-text">
                  System Status: {
                    reportData.systemStatus === 'maintenance' ? 'Under Maintenance' :
                    reportData.systemStatus === 'no_sensors' ? 'No Sensors Detected' :
                    reportData.systemStatus === 'operational' ? 'Operational' :
                    reportData.systemStatus === 'no_data' ? 'No Data Available for Selected Date Range' : 'Unknown'
                  }
                </span>
              </div>
            </div>
            
            {/* Maintenance Occurrence Summary Banner */}
            {reportData.maintenanceOccurrences && reportData.maintenanceOccurrences.length > 0 && (
              <div className="system-status-display">
                <div className={`status-indicator maintenance`}>
                  <span className="status-icon">🔧</span>
                  <span className="status-text">
                    Maintenance occurred within this report range · {reportData.maintenanceOccurrences.length} occurrence{reportData.maintenanceOccurrences.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="table-container" style={{ marginTop: '8px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Start</th>
                        <th>End</th>
                        <th>Duration (hours)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.maintenanceOccurrences.slice(0, 5).map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.start || 'Unknown'}</td>
                          <td>{item.end || 'Ongoing'}</td>
                          <td>{item.durationMs != null ? (item.durationMs / (1000*60*60)).toFixed(2) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div className="summary-cards">
              <div className="summary-card">
                <div className="card-icon">📊</div>
                <div className="card-content">
                  <h3>Total Readings</h3>
                  <p className="card-value">{reportData.summary.totalReadings}</p>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="card-icon">🌬️</div>
                <div className="card-content">
                  <h3>Average AQI</h3>
                  <p className="card-value">{reportData.summary.averageAQI}</p>
                </div>
              </div>
              
              
              {reportData.summary.averagePM25 !== undefined && (
                <div className="summary-card">
                  <div className="card-icon">🌫️</div>
                  <div className="card-content">
                    <h3>Average PM2.5</h3>
                    <p className="card-value">{reportData.summary.averagePM25}</p>
                  </div>
                </div>
              )}
              
              {reportData.summary.averagePM10 !== undefined && (
                <div className="summary-card">
                  <div className="card-icon">🌫️</div>
                  <div className="card-content">
                    <h3>Average PM10</h3>
                    <p className="card-value">{reportData.summary.averagePM10}</p>
                  </div>
                </div>
              )}
              
              {reportData.summary.averageCO !== undefined && (
                <div className="summary-card">
                  <div className="card-icon">🔴</div>
                  <div className="card-content">
                    <h3>Average CO</h3>
                    <p className="card-value">{reportData.summary.averageCO}</p>
                  </div>
                </div>
              )}
              
              {reportData.summary.averageNO2 !== undefined && (
                <div className="summary-card">
                  <div className="card-icon">🟡</div>
                  <div className="card-content">
                    <h3>Average NO2</h3>
                    <p className="card-value">{reportData.summary.averageNO2}</p>
                  </div>
                </div>
              )}
              
              <div className="summary-card">
                <div className="card-icon">🚨</div>
                <div className="card-content">
                  <h3>Alerts Count</h3>
                  <p className="card-value">{reportData.summary.alertsCount}</p>
                </div>
              </div>
            </div>

            {/* Daily Data Table */}
            <div className="data-table-section">
              <h3 className="subsection-title">📅 Daily Data</h3>
              {reportData.dailyData.length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      {reportConfig.parameters.includes('aqi') && <th>AQI</th>}
                      {reportConfig.parameters.includes('pm25') && <th>PM2.5</th>}
                      {reportConfig.parameters.includes('pm10') && <th>PM10</th>}
                      {reportConfig.parameters.includes('co') && <th>CO</th>}
                      {reportConfig.parameters.includes('no2') && <th>NO2</th>}
                    </tr>
                  </thead>
                    <tbody>
                      {reportData.dailyData.map((row, index) => (
                        <tr key={index}>
                          <td>{row.date}</td>
                          <td>{row.time}</td>
                          {reportConfig.parameters.includes('aqi') && <td>{row.aqi}</td>}
                          {reportConfig.parameters.includes('pm25') && <td>{row.pm25}</td>}
                          {reportConfig.parameters.includes('pm10') && <td>{row.pm10}</td>}
                          {reportConfig.parameters.includes('co') && <td>{row.co}</td>}
                          {reportConfig.parameters.includes('no2') && <td>{row.no2}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-data-message">
                  <div className="no-data-icon">📊</div>
                  <h4>No Data Available</h4>
                  <p>No sensor readings found for the selected date range ({reportConfig.startDate} to {reportConfig.endDate}).</p>
                  <p>Please try selecting a different date range or check if sensors were active during this period.</p>
                </div>
              )}
            </div>

            {/* Alerts Section */}
            <div className="alerts-section">
              <h3 className="subsection-title">🚨 System Alerts</h3>
              <div className="alerts-grid">
                {reportData.alerts.map((alert, index) => (
                  <div key={index} className={`alert-item ${alert.severity}`}>
                    <div className="alert-header">
                      <span className="alert-severity">{alert.severity}</span>
                      <span className="alert-time">{alert.time}</span>
                    </div>
                    <p className="alert-message">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>

            

            {/* Export Options */}
            <div className="export-section">
              <h3 className="subsection-title">📤 Export Options</h3>
              <div className="export-buttons">
                <button 
                  className="export-btn csv"
                  onClick={() => exportCSV('comprehensive')}
                >
                  📊 Export Full Report (CSV)
                </button>
                
                <button 
                  className="export-btn csv"
                  onClick={() => exportCSV('daily')}
                >
                  📅 Export Daily Data (CSV)
                </button>
                
                <button 
                  className="export-btn csv"
                  onClick={() => exportCSV('alerts')}
                >
                  🚨 Export Alerts (CSV)
                </button>
                
                <button 
                  className="export-btn print"
                  onClick={printReport}
                >
                  🖨️ Print Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReports;
