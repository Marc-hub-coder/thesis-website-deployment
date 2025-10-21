import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      localStorage.removeItem('isAdminAuthed');
    } catch (e) {}
    navigate('/admin/login', { replace: true });
  };

  return (
    <button type="button" className="dashboard-link logout-btn" onClick={handleLogout} title="Logout">
      Logout
    </button>
  );
};

export default AdminLogoutButton;


