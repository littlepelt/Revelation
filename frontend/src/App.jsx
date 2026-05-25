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
      setUser({ username: 'temp' });
    }
    setLoading(false);
  }, []);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Загрузка...</div>;

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
            background: '#FFFFFF',
            padding: '12px 10px',
            borderTop: '1px solid #DFE2ED',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
          }}>
            <Link to="/" style={{ color: '#1A1A1A', textDecoration: 'none', fontWeight: '500' }}>Лента</Link>
            <Link to="/my-books" style={{ color: '#1A1A1A', textDecoration: 'none', fontWeight: '500' }}>Мои книги</Link>
            <Link to="/profile" style={{ color: '#1A1A1A', textDecoration: 'none', fontWeight: '500' }}>Профиль</Link>
          </nav>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;