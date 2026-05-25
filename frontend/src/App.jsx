import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Feed from './pages/Feed';
import MyBooks from './pages/MyBooks';
import Profile from './pages/Profile';
import LoginRegister from './pages/LoginRegister';
import BookPage from './pages/BookPage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Простая проверка — позже сделаем валидацию токена
      setUser({ username: 'temp' });
    }
    setLoading(false);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <BrowserRouter>
      <div style={{ paddingBottom: '70px' }}>
        <Routes>
          <Route path="/login" element={<LoginRegister setUser={setUser} />} />
          <Route path="/" element={user ? <Feed /> : <Navigate to="/login" />} />
          <Route path="/my-books" element={user ? <MyBooks /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/book/:id" element={user ? <BookPage /> : <Navigate to="/login" />} />
        </Routes>

        {user && (
          <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-around',
            background: '#f5f5f5',
            padding: '10px',
            borderTop: '1px solid #ccc'
          }}>
            <Link to="/">📚 Лента</Link>
            <Link to="/my-books">📖 Мои книги</Link>
            <Link to="/profile">👤 Профиль</Link>
          </nav>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;