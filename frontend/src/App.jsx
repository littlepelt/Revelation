import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Sun, Moon, Compass, Library, User, UserCog } from 'lucide-react';
import Home from './pages/Home';
import AllBooks from './pages/AllBooks';
import Profile from './pages/Profile';
import LoginRegister from './pages/LoginRegister';
import BookPage from './pages/BookPage';
import ReadBook from './pages/ReadBook';
import AdminPanel from './pages/AdminPanel';
import { useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

import LightIcon from './assets/Icon.svg';
import DarkIcon from './assets/DarkIcon.svg';

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

function AppContent() {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  const logoSrc = theme === 'light' ? LightIcon : DarkIcon;

  return (
    <div className="app-wrapper">
      {user && (
        <header className="app-header">
          <div className="header-container">
            <Link to="/" className="logo-link" onMouseDown={createRipple}>
              <img src={logoSrc} alt="Logo" className="logo-img" />
            </Link>
            <div className="header-right">
              <button onClick={toggleTheme} className="theme-toggle-btn" onMouseDown={createRipple}>
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              {user?.is_admin && (
                <Link to="/admin" className="admin-link" onMouseDown={createRipple}>
                  <UserCog size={20} />
                </Link>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="app-main">
        <Routes>
          <Route path="/login" element={<LoginRegister />} />
          <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
          <Route path="/books" element={user ? <AllBooks /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/user/:username" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/book/:id" element={user ? <BookPage /> : <Navigate to="/login" />} />
          <Route path="/read/:id/:pageNum" element={user ? <ReadBook /> : <Navigate to="/login" />} />
          <Route path="/books/tag/:tag" element={user ? <AllBooks /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user?.is_admin ? <AdminPanel /> : <Navigate to="/" />} />
        </Routes>
      </main>

      {user && (
        <nav className="app-footer">
          <div className="footer-container">
            <Link to="/" className="footer-link" onMouseDown={createRipple}>
              <Compass size={20} />
              <span>Главная</span>
            </Link>
            <Link to="/books" className="footer-link" onMouseDown={createRipple}>
              <Library size={20} />
              <span>Все книги</span>
            </Link>
            <Link to={`/user/${user.username}`} className="footer-link" onMouseDown={createRipple}>
              <User size={20} />
              <span>Профиль</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;