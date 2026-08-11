import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { user } = useContext(AuthContext);

  // Checks if user is logged in (since role-based auth isn't being used)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}