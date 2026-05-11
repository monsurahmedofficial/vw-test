import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vw_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  async function login(mobile, password) {
    const { data } = await api.post('/auth/login', { mobile, password });
    localStorage.setItem('vw_token', data.token);
    localStorage.setItem('vw_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('vw_token');
    localStorage.removeItem('vw_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
