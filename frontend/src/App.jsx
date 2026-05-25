import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Feed from './pages/Feed';
import MyBooks from './pages/MyBooks';
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <div style={{ paddingBottom: '70px' }}>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/my-books" element={<MyBooks />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>

        {/* Нижняя навигация */}
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
          <Link to="/">Лента</Link>
          <Link to="/my-books">Мои книги</Link>
          <Link to="/profile">Профиль</Link>
        </nav>
      </div>
    </BrowserRouter>
  );
}

export default App;