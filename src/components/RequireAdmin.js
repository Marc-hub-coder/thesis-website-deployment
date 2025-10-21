import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const RequireAdmin = ({ children }) => {
  const location = useLocation();
  const isAuthed = typeof window !== 'undefined' && localStorage.getItem('isAdminAuthed') === 'true';

  if (!isAuthed) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
};

export default RequireAdmin;


