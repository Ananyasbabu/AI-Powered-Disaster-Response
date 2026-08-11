import { createContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext();
const STORAGE_KEY = 'disasterGuardUser';

const initialAccounts = [
  { username: 'citizen', password: 'disaster123', name: 'Citizen Hero', email: 'citizen@example.com' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState(initialAccounts);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = (username, password) => {
    const account = accounts.find(
      (item) => item.username.toLowerCase() === username.toLowerCase() && item.password === password
    );
    if (!account) {
      return { success: false, message: 'Invalid username or password.' };
    }
    setUser({ username: account.username, name: account.name, email: account.email });
    return { success: true };
  };

  const register = (name, email, username, password) => {
    if (accounts.some((item) => item.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Username already taken.' };
    }
    if (accounts.some((item) => item.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'Email already in use.' };
    }
    const newAccount = { name, email, username, password };
    setAccounts((previous) => [...previous, newAccount]);
    setUser({ username, name, email });
    return { success: true };
  };

  const logout = () => {
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, login, logout, register }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
