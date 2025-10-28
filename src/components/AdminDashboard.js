import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLogoutButton from './AdminLogoutButton';
import '../styles/AdminDashboard.css';
import { adminService } from '../services/adminService';

const AdminDashboard = () => {
  const [maintenanceSettings, setMaintenanceSettings] = useState({
    dashboard: false,
    pm25Chart: false,
    pm10Chart: false,
    coChart: false,
    no2Chart: false,
    aqiDisplay: false
  });
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [vogAlertEnabled, setVogAlertEnabled] = useState(false);
  const toggleVogAlert = async (enabled) => {
    try {
      if (enabled) {
        await adminService.setPublicAlert({ type: 'vog', message: 'Possible VOG alert' });
      } else {
        await adminService.setPublicAlert(null);
      }
      setVogAlertEnabled(enabled);
    } catch (_) {}
  };

  const handleMaintenanceToggle = (component) => {
    setMaintenanceSettings(prev => ({
      ...prev,
      [component]: !prev[component]
    }));
  };

  const saveSettings = async () => {
    try {
      await adminService.setMaintenanceSettings(maintenanceSettings);
      alert('Settings saved successfully!');
    } catch (_) {
      alert('Failed to save settings');
    }
  };

  useEffect(() => {
    let unsubMaint = null;
    let unsubAlert = null;

    (async () => {
      // Prime from RTDB, with local cache fallback
      try {
        const initial = await adminService.getMaintenanceSettings();
        if (initial) {
          setMaintenanceSettings({
            dashboard: !!initial.dashboard,
            pm25Chart: !!initial.pm25Chart,
            pm10Chart: !!initial.pm10Chart,
            coChart: !!initial.coChart,
            no2Chart: !!initial.no2Chart,
            aqiDisplay: !!initial.aqiDisplay,
          });
        } else {
          const savedMaintenance = localStorage.getItem('maintenanceSettings');
          if (savedMaintenance) {
            const parsed = JSON.parse(savedMaintenance);
            setMaintenanceSettings({
              dashboard: !!parsed.dashboard,
              pm25Chart: !!parsed.pm25Chart,
              pm10Chart: !!parsed.pm10Chart,
              coChart: !!parsed.coChart,
              no2Chart: !!parsed.no2Chart,
              aqiDisplay: !!parsed.aqiDisplay,
            });
          }
        }
      } catch (_) {}

      // Live subscribe
      try {
        unsubMaint = adminService.onMaintenanceSettings((v) => {
          setMaintenanceSettings({
            dashboard: !!v?.dashboard,
            pm25Chart: !!v?.pm25Chart,
            pm10Chart: !!v?.pm10Chart,
            coChart: !!v?.coChart,
            no2Chart: !!v?.no2Chart,
            aqiDisplay: !!v?.aqiDisplay,
          });
        });
      } catch (_) {}

      try {
        const alert = await adminService.getPublicAlert();
        setVogAlertEnabled(!!alert);
        unsubAlert = adminService.onPublicAlert((a) => setVogAlertEnabled(!!a));
      } catch (_) {}
    })();

    // Update current date/time every second
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
      if (typeof unsubMaint === 'function') unsubMaint();
      if (typeof unsubAlert === 'function') unsubAlert();
    };
  }, []);

  return (
    <div className="admin-dashboard">
      <nav className="dashboard-navbar">
        <span className="dashboard-title">VOG & Air Quality Dashboard - ADMIN</span>
        <div className="dashboard-links">
          <Link to="/admin" className="dashboard-link">Admin Panel</Link>
          <Link to="/admin/emergency-contacts" className="dashboard-link">Emergency Contacts</Link>
          <Link to="/admin/emergency-protocol" className="dashboard-link">Emergency Protocol</Link>
          <Link to="/admin/reports" className="dashboard-link">Reports</Link>
          <Link to="/" className="dashboard-link">Public Dashboard</Link>
          <AdminLogoutButton />
        </div>
      </nav>

      <div className="admin-container">
        <h1 className="admin-title">ADMIN CONTROL PANEL</h1>
        
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
        
        <div className="admin-sections">
          {/* Maintenance Controls */}
          <div className="admin-section">
            <h2 className="section-title">🛠️ Maintenance Controls</h2>
            <div className="maintenance-grid">
              <div className="maintenance-item">
                <label className="maintenance-label">
                  <input
                    type="checkbox"
                    checked={maintenanceSettings.dashboard}
                    onChange={() => handleMaintenanceToggle('dashboard')}
                  />
                  <span>Entire Dashboard</span>
                </label>
              </div>
              
              <div className="maintenance-item">
                <label className="maintenance-label">
                  <input
                    type="checkbox"
                    checked={maintenanceSettings.pm25Chart}
                    onChange={() => handleMaintenanceToggle('pm25Chart')}
                  />
                  <span>PM2.5 Chart</span>
                </label>
              </div>
              
              <div className="maintenance-item">
                <label className="maintenance-label">
                  <input
                    type="checkbox"
                    checked={maintenanceSettings.pm10Chart}
                    onChange={() => handleMaintenanceToggle('pm10Chart')}
                  />
                  <span>PM10 Chart</span>
                </label>
              </div>
              
              <div className="maintenance-item">
                <label className="maintenance-label">
                  <input
                    type="checkbox"
                    checked={maintenanceSettings.coChart}
                    onChange={() => handleMaintenanceToggle('coChart')}
                  />
                  <span>CO Chart</span>
                </label>
              </div>
              
              <div className="maintenance-item">
                <label className="maintenance-label">
                  <input
                    type="checkbox"
                    checked={maintenanceSettings.no2Chart}
                    onChange={() => handleMaintenanceToggle('no2Chart')}
                  />
                  <span>NO2 Chart</span>
                </label>
              </div>
              
              <div className="maintenance-item">
                <label className="maintenance-label">
                  <input
                    type="checkbox"
                    checked={maintenanceSettings.aqiDisplay}
                    onChange={() => handleMaintenanceToggle('aqiDisplay')}
                  />
                  <span>AQI Display</span>
                </label>
              </div>
            </div>
          </div>

          {/* Public Alert Controls */}
          <div className="admin-section">
            <h2 className="section-title">📣 Public Alert</h2>
            <div className="maintenance-grid">
              <div className="maintenance-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span className="maintenance-label" style={{ display: 'inline-flex', alignItems: 'center' }}>Possible VOG Alert</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={vogAlertEnabled}
                  onClick={() => toggleVogAlert(!vogAlertEnabled)}
                  style={{
                    position: 'relative',
                    width: 50,
                    height: 28,
                    borderRadius: 9999,
                    border: '1px solid #ccc',
                    backgroundColor: vogAlertEnabled ? '#22c55e' : '#e5e7eb',
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease-in-out',
                    padding: 0
                  }}
                  title={vogAlertEnabled ? 'Turn off alert' : 'Turn on alert'}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: vogAlertEnabled ? 24 : 2,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                      transition: 'left 150ms ease-in-out'
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="admin-section">
            <h2 className="section-title">⚡ Quick Actions</h2>
            <div className="quick-actions">
              <button 
                className="action-btn emergency"
                onClick={() => {
                  setMaintenanceSettings({...maintenanceSettings, dashboard: true});
                }}
              >
                🚨 Emergency Mode
              </button>
              
              <button 
                className="action-btn maintenance"
                onClick={() => {
                  setMaintenanceSettings({...maintenanceSettings, dashboard: true});
                }}
              >
                🔧 Full Maintenance
              </button>
              
              <button 
                className="action-btn normal"
                onClick={() => {
                  setMaintenanceSettings({...maintenanceSettings, dashboard: false});
                }}
              >
                ✅ Normal Mode
              </button>
            </div>
          </div>

          {/* Reports Section removed as requested */}
        </div>

        <div className="admin-actions">
          <button className="save-btn" onClick={saveSettings}>
            💾 Save All Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 