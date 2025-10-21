import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/EmergencyContacts.css';
import mayorOfficeLogo from '../images/mayor office.png';
import cdrrmoLogo from '../images/cdrrmo.png';
import mediatrixLogo from '../images/mediatrix.jpg';
import medixLogo from '../images/medix.png';

const defaultContacts = [
  {
    logo: mayorOfficeLogo,
    alt: "Lipa City Mayor's Office Logo",
    social: { href: "https://lipa.gov.ph/", icon: "🌐", className: "globe-icon" },
    title: "LIPA CITY GOVERNMENT",
    phone: "(043) 774-5169",
    email: "cado.lipa@gmail.com"
  },
  {
    logo: cdrrmoLogo,
    alt: "Lipa City CDRRMO Logo",
    social: { href: "https://www.facebook.com/cdrrmolipa/", icon: "f", className: "facebook-icon" },
    title: "LIPA CITY CDRRMO",
    phone: "(043) 756-0127",
    email: "cdrrmc_lipa@yahoo.com"
  },
  {
    logo: mediatrixLogo,
    alt: "Mary Mediatrix Medical Center Logo",
    social: { href: "https://www.facebook.com/OfficialMMMC?_rdr", icon: "f", className: "facebook-icon" },
    title: "MARY MEDIATRIX MEDICAL CENTER",
    phone: "(043) 773-6800",
    email: "customercare@mediatrix.com.ph"
  },
  {
    logo: medixLogo,
    alt: "Lipa Medix Medical Center Logo",
    social: { href: "https://www.facebook.com/LipaMedixOfficialFBPage/", icon: "f", className: "facebook-icon" },
    title: "LIPA MEDIX MEDICAL CENTER",
    phone: "(043) 756-1190",
    email: "lipamedix94@gmail.com"
  }
];

const LOCAL_STORAGE_KEY = 'emergencyContacts';

const EmergencyContacts = () => {
  const [contacts, setContacts] = useState(defaultContacts);

  useEffect(() => {
    // Load contacts from localStorage (admin edits) or use defaults
    const savedContacts = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedContacts) {
      try {
        const parsedContacts = JSON.parse(savedContacts);
        setContacts(parsedContacts);
      } catch (error) {
        console.error('Error parsing saved contacts:', error);
        setContacts(defaultContacts);
      }
    }
  }, []);

  return (
    <div className="emergency-contacts-page">
      <nav className="dashboard-navbar">
        <span className="dashboard-title">VOG & Air Quality Dashboard</span>
        <div className="dashboard-links">
          <Link to="/" className="dashboard-link">Air Quality Statistics</Link>
          <Link to="/emergency-contacts" className="dashboard-link">Emergency Contacts</Link>
          <Link to="/emergency-protocol" className="dashboard-link">Emergency Protocol</Link>
        </div>
      </nav>

      <div className="emergency-contacts-container">
        <h1 className="emergency-contacts-title">EMERGENCY CONTACTS</h1>
        
        <div className="contacts-grid">
          {contacts.map((contact, idx) => (
            <div className="contact-card" key={idx}>
              <div className="card-header">
                <div className="logo-placeholder">
                  <img 
                    src={contact.logo || "/placeholder.svg"} 
                    alt={contact.alt} 
                    className="logo-image"
                  />
                </div>
                <div className="social-icon">
                  <a href={contact.social.href} target="_blank" rel="noopener noreferrer" className={contact.social.className}>
                    {contact.social.icon}
                  </a>
                </div>
              </div>
              <h3 className="contact-title">{contact.title}</h3>
              <div className="contact-info">
                <div className="contact-item">
                  <span className="contact-icon">📞</span>
                  <span className="contact-number"> {contact.phone}</span>
                </div>
                <div className="contact-item">
                  <span className="contact-icon">📧</span>
                  <span className="contact-email"> {contact.email}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmergencyContacts;