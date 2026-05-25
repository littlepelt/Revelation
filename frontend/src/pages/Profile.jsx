import { useNavigate } from 'react-router-dom';

export default function Profile({ setUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="container" style={{ padding: '20px 0' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>Профиль</h1>
      <button 
        onClick={handleLogout}
        className="btn-outline"
        style={{ padding: '10px 20px' }}
      >
        Выйти
      </button>
    </div>
  );
}