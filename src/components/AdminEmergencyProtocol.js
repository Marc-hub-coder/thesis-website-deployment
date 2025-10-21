import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLogoutButton from './AdminLogoutButton';
import '../styles/EmergencyProtocol.css';

const defaultProtocols = [
  {
    id: 1,
    heading: "CHECK AIR QUALITY DAILY",
    description: "Monitor air quality levels daily to stay informed about VOG conditions.",
    icon: "📊",
    priority: "high"
  },
  {
    id: 2,
    heading: "STAY INDOORS",
    description: "When possible, avoid high VOG level areas and stay indoors with windows and doors closed and sealed.",
    icon: "🏠",
    priority: "high"
  },
  {
    id: 3,
    heading: "AVOID PHYSICAL ACTIVITY",
    description: "Avoid physical activity when VOG levels are high.",
    icon: "🚫",
    priority: "high"
  },
  {
    id: 4,
    heading: "AVOID SMOKING",
    description: "Refrain from smoking or tobacco use during high VOG conditions.",
    icon: "🚭",
    priority: "high"
  },
  {
    id: 5,
    heading: "LISTEN TO YOUR BODY",
    description: "If you feel fatigued or have difficulty breathing, reduce activity and seek medical assistance if symptoms don't improve.",
    icon: "❤️",
    priority: "high"
  },
  {
    id: 6,
    heading: "FOLLOW DOCTOR'S ADVICE",
    description: "Follow your doctor's advice, keep your medication refilled, and use your daily controller medication as prescribed.",
    icon: "💊",
    priority: "high"
  },
  {
    id: 7,
    heading: "WEAR PROTECTIVE MASK",
    description: "If outside for prolonged periods, wear a vinyl or rubber gas mask fitted with cartridges rated for acid gases and dust particulates.",
    icon: "😷",
    priority: "high"
  },
  {
    id: 8,
    heading: "MAKE A FAMILY PLAN",
    description: "As a family, make a plan so that everyone knows what to do and where to go.",
    icon: "👨‍👩‍👧‍👦",
    priority: "medium"
  },
  {
    id: 9,
    heading: "USE AIR CONDITIONER",
    description: "Run an air conditioner or dehumidifier to remove particulate sulfur compounds and acid gases from indoor air.",
    icon: "❄️",
    priority: "medium"
  },
  {
    id: 10,
    heading: "STAY HYDRATED",
    description: "Stay hydrated to help your body cope with VOG exposure.",
    icon: "💧",
    priority: "medium"
  },
  {
    id: 11,
    heading: "AVOID ALLERGENS",
    description: "With high VOG level conditions, avoid contact with colds, flu, molds, mildew, pollen and dust.",
    icon: "🤧",
    priority: "medium"
  },
  {
    id: 12,
    heading: "BUILD A KIT",
    description: "Build an emergency kit with essential supplies for VOG conditions.",
    icon: "📦",
    priority: "medium"
  },
  {
    id: 13,
    heading: "USE FAN WITH BAKING SODA",
    description: "When using a fan, saturate a cloth with baking soda paste and water, then drape it over the fan to neutralize sulfur particles.",
    icon: "💨",
    priority: "low"
  }
];

const LOCAL_STORAGE_KEY = 'emergencyProtocols';

const AdminEmergencyProtocol = () => {
  const [protocols, setProtocols] = useState(defaultProtocols);
  const [editIndex, setEditIndex] = useState(null);
  const [editProtocol, setEditProtocol] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      setProtocols(JSON.parse(saved));
    }
  }, []);

  const handleEdit = (idx) => {
    setEditIndex(idx);
    setEditProtocol({ ...protocols[idx] });
  };

  const handleChange = (field, value) => {
    setEditProtocol((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (idx) => {
    const updated = protocols.map((p, i) => (i === idx ? { ...editProtocol } : p));
    setProtocols(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    setEditIndex(null);
  };

  const handleCancel = () => {
    setEditIndex(null);
  };

  const addNewProtocol = () => {
    const newProtocol = {
      id: Date.now(),
      heading: "NEW PROTOCOL",
      description: "Enter protocol description here.",
      icon: "⚠️",
      priority: "medium"
    };
    const updated = [...protocols, newProtocol];
    setProtocols(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  const deleteProtocol = (idx) => {
    if (window.confirm('Are you sure you want to delete this protocol?')) {
      const updated = protocols.filter((_, i) => i !== idx);
      setProtocols(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  return (
    <div className="emergency-protocol-page">
      <nav className="dashboard-navbar">
        <span className="dashboard-title">VOG & Air Quality Dashboard - ADMIN</span>
        <div className="dashboard-links">
          <Link to="/admin" className="dashboard-link">Admin Panel</Link>
          <Link to="/admin/emergency-contacts" className="dashboard-link">Emergency Contacts</Link>
          <Link to="/admin/emergency-protocol" className="dashboard-link active">Emergency Protocol</Link>
          <Link to="/" className="dashboard-link">Public Dashboard</Link>
          <AdminLogoutButton />
        </div>
      </nav>

      <div className="emergency-protocol-container">
        <h1 className="emergency-protocol-title">VOLCANIC SMOG SAFETY PROTOCOL</h1>

        <div className="vog-info-card">
          <div className="vog-header">
            <span className="vog-icon">🌋</span>
            <h2 className="vog-title">What is VOG?</h2>
            <span className="vog-icon">🌋</span>
          </div>
          <p className="vog-description">
            Volcanic Smog (VOG) is created when sulfur dioxide gas and other pollutants emitted from volcanic activity interact chemically with atmospheric moisture, oxygen, dust, and sunlight. VOG poses a health hazard by aggravating preexisting respiratory ailments and reducing driving visibility. Additionally, when atmospheric moisture is abundant, sulfuric acid dioxide gas in VOG combines with it and falls as acid rain.
          </p>
        </div>

        <div className="admin-controls">
          <button className="add-protocol-btn" onClick={addNewProtocol}>
            ➕ Add New Protocol
          </button>
        </div>
        
        <div className="protocol-cards">
          {protocols.map((protocol, idx) => (
            <div className="protocol-card" key={protocol.id}>
              {editIndex === idx ? (
                <>
                  <div className="protocol-content">
                    <div className="protocol-text">
                      <input
                        className="edit-protocol-heading"
                        value={editProtocol.heading}
                        onChange={e => handleChange('heading', e.target.value)}
                        placeholder="Protocol heading"
                      />
                      <textarea
                        className="edit-protocol-description"
                        value={editProtocol.description}
                        onChange={e => handleChange('description', e.target.value)}
                        placeholder="Protocol description"
                        rows="3"
                      />
                    </div>
                    <div className="protocol-icon">
                      <input
                        className="edit-protocol-icon"
                        value={editProtocol.icon}
                        onChange={e => handleChange('icon', e.target.value)}
                        placeholder="📝"
                        maxLength="2"
                      />
                    </div>
                  </div>
                  <div className="protocol-footer">
                    <select
                      value={editProtocol.priority}
                      onChange={e => handleChange('priority', e.target.value)}
                      className="priority-select"
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                    <div className="edit-actions">
                      <button className="save-btn-small" onClick={() => handleSave(idx)}>💾</button>
                      <button className="cancel-btn-small" onClick={handleCancel}>❌</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="protocol-content">
                    <div className="protocol-text">
                      <h3 className="protocol-heading">
                        {protocol.heading}
                        <button className="edit-btn-protocol" onClick={() => handleEdit(idx)} title="Edit">
                          ✏️
                        </button>
                        <button className="delete-btn-protocol" onClick={() => deleteProtocol(idx)} title="Delete">
                          🗑️
                        </button>
                      </h3>
                      <p className="protocol-description">{protocol.description}</p>
                    </div>
                    <div className="protocol-icon">
                      <span className="icon">{protocol.icon}</span>
                    </div>
                  </div>
                  <div className="protocol-footer">
                    <span className={`priority-badge ${protocol.priority}`}>
                      {protocol.priority.charAt(0).toUpperCase() + protocol.priority.slice(1)} Priority
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminEmergencyProtocol;
