import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Функция для проверки токена и получения пользователя
  const verifyTokenAndGetUser = async (storedToken) => {
    if (!storedToken || storedToken === 'null' || storedToken === 'undefined') {
      return false;
    }
    
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      
      if (response.data) {
        setUser(response.data);
        setToken(storedToken);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Token verification failed:', err.response?.status);
      return false;
    }
  };

  // Загрузка при монтировании
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken && storedToken !== 'null' && storedToken !== 'undefined') {
        const isValid = await verifyTokenAndGetUser(storedToken);
        if (!isValid) {
          // Токен невалидный — очищаем
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      
      setLoading(false);
    };
    
    initAuth();
  }, []);

  const login = (newToken, userData) => {
    if (!newToken || newToken === 'null' || newToken === 'undefined') {
      console.error('Invalid token provided to login');
      return;
    }
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}