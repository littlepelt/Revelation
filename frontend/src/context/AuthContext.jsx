import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // При загрузке просто достаём пользователя из localStorage
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken && storedToken !== 'null' && storedToken !== 'undefined') {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        console.log('✅ User restored from localStorage:', parsedUser.username);
      } catch (e) {
        console.error('Failed to parse stored user:', e);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    if (!token || token === 'null' || token === 'undefined') {
      console.error('Invalid token provided to login');
      return;
    }
    
    // Сохраняем и токен, и данные пользователя
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    console.log('✅ User logged in:', userData.username);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    console.log('✅ User logged out');
  };

  const updateUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
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