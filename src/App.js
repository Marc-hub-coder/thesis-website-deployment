import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import EmergencyContacts from './components/EmergencyContacts';
import EmergencyProtocol from './components/EmergencyProtocol';
import AdminDashboard from './components/AdminDashboard';
import AdminEmergencyContacts from './components/AdminEmergencyContacts';
import AdminEmergencyProtocol from './components/AdminEmergencyProtocol';
import AdminReports from './components/AdminReports';
import AdminLogin from './components/AdminLogin';
import RequireAdmin from './components/RequireAdmin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/emergency-contacts" element={<EmergencyContacts />} />
        <Route path="/emergency-protocol" element={<EmergencyProtocol />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/emergency-contacts" element={<RequireAdmin><AdminEmergencyContacts /></RequireAdmin>} />
        <Route path="/admin/emergency-protocol" element={<RequireAdmin><AdminEmergencyProtocol /></RequireAdmin>} />
        <Route path="/admin/reports" element={<RequireAdmin><AdminReports /></RequireAdmin>} />
      </Routes>
    </Router>
  );
}

export default App;
