import { useEffect, useState } from 'react';
import axios from 'axios';
import { Trash2, Users, MessageCircle, BookOpen, X } from 'lucide-react';
import './AdminPanel.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      
      if (activeTab === 'users') {
        const response = await axios.get(`${API_URL}/api/auth/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(response.data);
      } else if (activeTab === 'reviews') {
        const response = await axios.get(`${API_URL}/api/auth/admin/reviews`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReviews(response.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId, username) => {
    if (!confirm(`Удалить пользователя "${username}"? Все его отзывы и данные будут удалены.`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/auth/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Не удалось удалить пользователя');
    }
  };

  const deleteReview = async (reviewId) => {
    if (!confirm('Удалить этот отзыв?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/auth/admin/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(reviews.filter(r => r.id !== reviewId));
    } catch (err) {
      console.error('Error deleting review:', err);
      alert('Не удалось удалить отзыв');
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Админ-панель</h1>
      </div>

      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
          onMouseDown={createRipple}
        >
          <Users size={18} />
          Пользователи
        </button>
        <button 
          className={`admin-tab ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
          onMouseDown={createRipple}
        >
          <MessageCircle size={18} />
          Отзывы
        </button>
        <button 
          className="admin-tab disabled"
          disabled
        >
          <BookOpen size={18} />
          Книги (скоро)
        </button>
      </div>

      <div className="admin-content">
        {loading && <div className="admin-loading">Загрузка...</div>}
        {error && <div className="admin-error">{error}</div>}
        
        {!loading && !error && activeTab === 'users' && (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя пользователя</th>
                  <th>Email</th>
                  <th>Админ</th>
                  <th>Дата регистрации</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.is_admin ? 'Да' : 'Нет'}</td>
                    <td>{new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
                    <td>
                      <button 
                        className="admin-delete-btn"
                        onClick={() => deleteUser(user.id, user.username)}
                        onMouseDown={createRipple}
                        disabled={user.is_admin}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {!loading && !error && activeTab === 'reviews' && (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Пользователь</th>
                  <th>Книга</th>
                  <th>Рейтинг</th>
                  <th>Комментарий</th>
                  <th>Дата</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map(review => (
                  <tr key={review.id}>
                    <td>{review.id}</td>
                    <td>{review.user_username}</td>
                    <td>{review.book_title}</td>
                    <td>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</td>
                    <td className="review-comment-cell">{review.comment || '—'}</td>
                    <td>{new Date(review.created_at).toLocaleDateString('ru-RU')}</td>
                    <td>
                      <button 
                        className="admin-delete-btn"
                        onClick={() => deleteReview(review.id)}
                        onMouseDown={createRipple}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}