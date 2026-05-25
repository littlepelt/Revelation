import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Feed from './pages/Feed';
import MyBooks from './pages/MyBooks';
import Profile from './pages/Profile';
import LoginRegister from './pages/LoginRegister';
import BookPage from './pages/BookPage';
import logo from './assets/Icon.svg'; // ← импорт локального логотипа
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ username: 'temp' });
    }
    setLoading(false);
  }, []);

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <BrowserRouter>
      <div className="app-wrapper">
        {user && (
          <header className="app-header">
            <div className="header-container">
              <Link to="/" className="logo-link">
                <img src={logo} alt="Logo" className="logo-img" />
              </Link>
            </div>
          </header>
        )}

        <main className="app-main">
          <Routes>
            <Route path="/login" element={<LoginRegister setUser={setUser} />} />
            <Route path="/" element={user ? <Feed /> : <Navigate to="/login" />} />
            <Route path="/my-books" element={user ? <MyBooks /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
            <Route path="/book/:id" element={user ? <BookPage /> : <Navigate to="/login" />} />
          </Routes>
        </main>

        {user && (
          <nav className="app-footer">
            <div className="footer-container">
              <Link to="/" className="footer-link">Лента</Link>
              <Link to="/my-books" className="footer-link">Мои книги</Link>
              <Link to="/profile" className="footer-link">Профиль</Link>
            </div>
          </nav>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;