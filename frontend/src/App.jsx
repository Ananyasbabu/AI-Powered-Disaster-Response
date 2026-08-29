import { useContext } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthContext } from './context/AuthContext';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import Alerts from './pages/Alerts';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ReportIncident from './pages/ReportIncident';
import FloodPrediction from './pages/FloodPrediction';

export default function App() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Helper for consistent role-based redirection
  const getDefaultRoute = () => (user?.role === 'admin' ? '/admin' : '/dashboard');

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">DisasterGuard</div>
        <nav className="nav-links">
          {user ? (
            <>
              {user.role === 'admin' ? (
                <>
                  <Link to="/admin">Admin Dashboard</Link>
                  <Link to="/alerts">Alerts</Link>
                </>
              ) : (
                <>
                  <Link to="/dashboard">Dashboard</Link>
                  <Link to="/report">Report</Link>
                  <Link to="/alerts">Alerts</Link>
                </>
              )}

              <button className="ghost-button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/alerts">Public Alerts</Link>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
              <Link to="/admin-login">Admin Login</Link>
            </>
          )}
        </nav>
      </header>

      <main className="page-container">
        <Routes>
          <Route path="/" element={<Navigate to={user ? getDefaultRoute() : '/alerts'} replace />} />
          <Route path="/login" element={user ? <Navigate to={getDefaultRoute()} /> : <Login />} />
          <Route path="/admin-login" element={user ? <Navigate to={getDefaultRoute()} /> : <AdminLogin />} />
          <Route path="/admin-register" element={user ? <Navigate to={getDefaultRoute()} /> : <AdminRegister />} />
          <Route path="/register" element={user ? <Navigate to={getDefaultRoute()} /> : <Register />} />
          
          {/* Unprotected so citizens can view live warnings without logging in */}
          <Route path="/alerts" element={<Alerts />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['citizen', 'admin']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <ReportIncident />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}