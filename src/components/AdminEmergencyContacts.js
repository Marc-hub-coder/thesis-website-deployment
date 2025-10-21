import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLogoutButton from './AdminLogoutButton';
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

const AdminEmergencyContacts = () => {
  const [contacts, setContacts] = useState(defaultContacts);
  const [editIndex, setEditIndex] = useState(null);
  const [editContact, setEditContact] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      setContacts(JSON.parse(saved));
    }
  }, []);

  const handleEdit = (idx) => {
    setEditIndex(idx);
    setEditContact({ ...contacts[idx] });
  };

  const handleChange = (field, value) => {
    setEditContact((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditContact(prev => ({ ...prev, logo: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (idx) => {
    const updated = contacts.map((c, i) => (i === idx ? { ...editContact } : c));
    setContacts(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    setEditIndex(null);
  };

  const handleCancel = () => {
    setEditIndex(null);
  };

  return (
    <div className="emergency-contacts-page">
      <nav className="dashboard-navbar">
        <span className="dashboard-title">VOG & Air Quality Dashboard - ADMIN</span>
        <div className="dashboard-links">
          <Link to="/admin" className="dashboard-link">Admin Panel</Link>
          <Link to="/admin/emergency-contacts" className="dashboard-link active">Emergency Contacts</Link>
          <Link to="/admin/emergency-protocol" className="dashboard-link">Emergency Protocol</Link>
          <Link to="/" className="dashboard-link">Public Dashboard</Link>
          <AdminLogoutButton />
        </div>
      </nav>
      <div className="emergency-contacts-container">
        <h1 className="emergency-contacts-title">EMERGENCY CONTACTS</h1>
        <div className="contacts-grid">
          {contacts.map((contact, idx) => (
            <div className="contact-card" key={idx}>
              <div className="card-header">
                <div className="logo-placeholder">
                  <img src={contact.logo || "/placeholder.svg"} alt={contact.alt} className="logo-image" />
                  {editIndex === idx && (
                    <>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        className="image-upload-input"
                        id={`image-upload-${idx}`}
                      />
                      <label htmlFor={`image-upload-${idx}`} className="image-upload-label">
                        📷 Change Photo
                      </label>
                    </>
                  )}
                </div>
                <div className="social-icon">
                  {editIndex === idx ? (
                    <input 
                      type="url" 
                      value={editContact.social?.href || ''} 
                      onChange={e => handleChange('social', {...editContact.social, href: e.target.value})} 
                      placeholder="Social media link..."
                      className="social-input"
                    />
                  ) : (
                    <a href={contact.social.href} target="_blank" rel="noopener noreferrer" className={contact.social.className}>{contact.social.icon}</a>
                  )}
                </div>
              </div>
              {editIndex === idx ? (
                <>
                  <input 
                    className="edit-title-input" 
                    value={editContact.title} 
                    onChange={e => handleChange('title', e.target.value)} 
                  />
                  <div className="contact-info">
                    <div className="contact-item">
                      <span className="contact-icon">📞</span>
                      <input 
                        className="edit-contact-input" 
                        value={editContact.phone} 
                        onChange={e => handleChange('phone', e.target.value)} 
                      />
                    </div>
                    <div className="contact-item">
                      <span className="contact-icon">📧</span>
                      <input 
                        className="edit-contact-input" 
                        value={editContact.email} 
                        onChange={e => handleChange('email', e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="edit-buttons">
                    <button className="save-btn" onClick={() => handleSave(idx)}>💾 Save</button>
                    <button className="cancel-btn" onClick={handleCancel}>❌ Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="contact-title">
                    {contact.title} 
                    <button className="edit-btn" onClick={() => handleEdit(idx)} title="Edit">
                      ✏️
                    </button>
                  </h3>
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
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminEmergencyContacts;
