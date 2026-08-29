import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-links">
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-button active' : 'nav-button')}>
          Dashboard
        </NavLink>

        <NavLink to="/flood-predict" className={({ isActive }) => (isActive ? 'nav-button active' : 'nav-button')}>
          Flood Predict
        </NavLink>

        <NavLink to="/report" className={({ isActive }) => (isActive ? 'nav-button active' : 'nav-button')}>
          Report
        </NavLink>

        <NavLink to="/alerts" className={({ isActive }) => (isActive ? 'nav-button active' : 'nav-button')}>
          Alerts
        </NavLink>

        <button className="nav-button logout-btn">Logout</button>
      </div>
    </nav>
  );
}