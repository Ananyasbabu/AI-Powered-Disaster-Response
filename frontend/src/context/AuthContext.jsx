import { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [accounts, setAccounts] = useState(() => {
    const savedAccounts = localStorage.getItem('accounts');
    return savedAccounts ? JSON.parse(savedAccounts) : [];
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  const login = (username, password) => {
    const account = accounts.find(
      (item) => item.username.toLowerCase() === username.toLowerCase() && item.password === password
    );
    if (!account) {
      return { success: false, message: 'Invalid username or password.' };
    }
    const loggedInUser = {
      username: account.username,
      name: account.name,
      email: account.email,
      role: account.role || 'citizen',
    };
    setUser(loggedInUser);
    return { success: true, user: loggedInUser };
  };

  const register = (name, email, username, password) => {
    if (accounts.some((item) => item.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Username already taken.' };
    }
    if (accounts.some((item) => item.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'Email already in use.' };
    }
    const newAccount = { name, email, username, password, role: 'citizen' };
    setAccounts((previous) => [...previous, newAccount]);
    setUser({ username, name, email, role: 'citizen' });
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const value = { user, token, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
