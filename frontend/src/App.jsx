import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import Feed from './pages/Feed';
import MyBooks from './pages/MyBooks';
import Profile from './pages/Profile';
import LoginRegister from './pages/LoginRegister';
import BookPage from './pages/BookPage';
import ReadBook from './pages/ReadBook';
import { useTheme } from './context/ThemeContext';
import './App.css';

import LightIcon from './assets/Icon.svg';
import DarkIcon from './assets/DarkIcon.svg';

// Ripple эффект для кнопки темы
const createRipple = (event) => {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(button.clientWidth, button.clientHeight);
  
  ripple.classList.add('ripple');
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
  
  const oldRipples = button.querySelectorAll('.ripple');
  oldRipples.forEach(r => r.remove());
  
  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ username: 'temp' });
    }
    setLoading(false);
  }, []);

  if (loading) return <div className="loading">Загрузка...</div>;

  const logoSrc = theme === 'light' ? LightIcon : DarkIcon;

  return (
    <BrowserRouter>
      <div className="app-wrapper">
        {user && (
          <header className="app-header">
            <div className="header-container">
              <Link to="/" className="logo-link" onMouseDown={createRipple}>
                <img src={logoSrc} alt="Logo" className="logo-img" />
              </Link>
              <button 
                onClick={toggleTheme} 
                className="theme-toggle-btn" 
                onMouseDown={createRipple}
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
          </header>
        )}

        <main className="app-main">
          <Routes>
            <Route path="/login" element={<LoginRegister setUser={setUser} />} />
            <Route path="/" element={user ? <Feed /> : <Navigate to="/login" />} />
            <Route path="/my-books" element={user ? <MyBooks /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <Profile setUser={setUser} /> : <Navigate to="/login" />} />
            <Route path="/book/:id" element={user ? <BookPage /> : <Navigate to="/login" />} />
            <Route path="/read/:id/:pageNum" element={user ? <ReadBook /> : <Navigate to="/login" />} />
          </Routes>
        </main>

        {user && (
          <nav className="app-footer">
            <div className="footer-container">
              <Link to="/" className="footer-link" onMouseDown={createRipple}>Лента</Link>
              <Link to="/my-books" className="footer-link" onMouseDown={createRipple}>Мои книги</Link>
              <Link to="/profile" className="footer-link" onMouseDown={createRipple}>Профиль</Link>
            </div>
          </nav>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;