import React, { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  const login = (userData, userToken) => {
    const safeUser = {
      ...userData,
      email: userData?.email ? String(userData.email).toLowerCase() : '',
      name: userData?.name || userData?.email || 'User',
    };

    setUser(safeUser);
    setToken(userToken);
    localStorage.setItem('user', JSON.stringify(safeUser));
    localStorage.setItem('token', userToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};