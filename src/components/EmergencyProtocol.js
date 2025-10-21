import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

const EmergencyProtocol = () => {
  const [protocols, setProtocols] = useState(defaultProtocols);

  useEffect(() => {
    // Load protocols from localStorage (admin edits) or use defaults
    const savedProtocols = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedProtocols) {
      try {
        const parsedProtocols = JSON.parse(savedProtocols);
        setProtocols(parsedProtocols);
      } catch (error) {
        console.error('Error parsing saved protocols:', error);
        setProtocols(defaultProtocols);
      }
    }
  }, []);

  return (
    <div className="emergency-protocol-page">
      <nav className="dashboard-navbar">
        <span className="dashboard-title">VOG & Air Quality Dashboard</span>
        <div className="dashboard-links">
          <Link to="/" className="dashboard-link">Air Quality Statistics</Link>
          <Link to="/emergency-contacts" className="dashboard-link">Emergency Contacts</Link>
          <Link to="/emergency-protocol" className="dashboard-link">Emergency Protocol</Link>
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
        
        <div className="protocol-cards">
          {protocols.map((protocol, idx) => (
            <div className="protocol-card" key={protocol.id}>
              <div className="protocol-content">
                <div className="protocol-text">
                  <h3 className="protocol-heading">{protocol.heading}</h3>
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmergencyProtocol;
