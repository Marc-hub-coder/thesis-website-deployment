import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import '../styles/AdminDashboard.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const isAuthed = localStorage.getItem('isAdminAuthed') === 'true';
    if (isAuthed) {
      const redirectTo = (location.state && location.state.from) || '/admin';
      navigate(redirectTo, { replace: true });
    }
  }, [location, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (username === 'admin' && password === 'admincdrrmo') {
      localStorage.setItem('isAdminAuthed', 'true');
      const redirectTo = (location.state && location.state.from) || '/admin';
      navigate(redirectTo, { replace: true });
    } else {
      setError('Invalid credentials.');
    }
  };

  return (
    <div className="admin-dashboard">
      <nav className="dashboard-navbar">
        <span className="dashboard-title">VOG & Air Quality Dashboard - ADMIN</span>
        <div className="dashboard-links">
          <Link to="/" className="dashboard-link">Public Dashboard</Link>
        </div>
      </nav>

      <div className="admin-container">
        <h1 className="admin-title">ADMIN LOGIN</h1>

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

        <div className="admin-login-card">
          <form className="admin-login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoComplete="current-password"
                required
              />
            </div>
            {error && <div className="form-error">{error}</div>} 
            <button type="submit" className="save-btn admin-login-btn">Login</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;


