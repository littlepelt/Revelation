import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function LoginRegister({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin ? { username, password } : { username, email, password };
      
      const response = await axios.post(`${API_URL}${endpoint}`, payload);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сервера');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', margin: '80px auto' }}>
      <div style={{ background: '#FFFFFF', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #DFE2ED' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '24px', textAlign: 'center', fontWeight: '600' }}>
          {isLogin ? 'Вход' : 'Регистрация'}
        </h2>
        
        {error && (
          <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', border: '1px solid #DFE2ED', borderRadius: '8px', fontSize: '16px' }}
            />
          </div>
          
          {!isLogin && (
            <div style={{ marginBottom: '16px' }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', border: '1px solid #DFE2ED', borderRadius: '8px', fontSize: '16px' }}
              />
            </div>
          )}
          
          <div style={{ marginBottom: '24px' }}>
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
               style={{ width: '100%', padding: '12px', border: '1px solid #DFE2ED', borderRadius: '8px', fontSize: '16px' }}
            />
          </div>
          
          <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: '16px' }}>
            {isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
        
        <button onClick={() => setIsLogin(!isLogin)} className="btn-secondary" style={{ width: '100%' }}>
          {isLogin ? 'Создать аккаунт' : 'Уже есть аккаунт?'}
        </button>
      </div>
    </div>
  );
}