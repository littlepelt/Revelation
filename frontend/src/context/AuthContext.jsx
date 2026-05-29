import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      console.log('🔐 Initializing auth, token exists:', !!storedToken);
      
      if (!storedToken || storedToken === 'null' || storedToken === 'undefined') {
        console.log('❌ No valid token found');
        setLoading(false);
        return;
      }
      
      try {
        console.log('🔍 Verifying token with server...');
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        
        if (response.data && response.data.id) {
          console.log('✅ User authenticated:', response.data.username);
          setUser(response.data);
        } else {
          console.log('❌ Invalid response from server');
          localStorage.removeItem('token');
        }
      } catch (err) {
        console.error('❌ Token verification failed:', err.response?.status, err.response?.data);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
  }, []);

  const login = (newToken, userData) => {
    if (!newToken || newToken === 'null' || newToken === 'undefined') {
      console.error('Invalid token provided to login');
      return;
    }
    console.log('🔐 Logging in user:', userData.username);
    localStorage.setItem('token', newToken);
    setUser(userData);
  };

  const logout = () => {
    console.log('🔐 Logging out user');
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
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