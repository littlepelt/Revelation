import { useEffect, useState } from 'react';
import axios from 'axios';
import { Trash2, Users, MessageCircle, BookOpen, Plus, Edit } from 'lucide-react';
import BookFormModal from '../components/BookFormModal';
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
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookLoading, setBookLoading] = useState(false);

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
      } else if (activeTab === 'books') {
        const response = await axios.get(`${API_URL}/api/books`);
        setBooks(response.data);
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

  const deleteBook = async (bookId, title) => {
    if (!confirm(`Удалить книгу "${title}"? Все отзывы и статусы будут удалены.`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/books/admin/books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBooks(books.filter(b => b.id !== bookId));
    } catch (err) {
      console.error('Error deleting book:', err);
      alert('Не удалось удалить книгу');
    }
  };

  const handleBookSubmit = async (bookData) => {
    setBookLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingBook 
        ? `${API_URL}/api/books/admin/books/${editingBook.id}`
        : `${API_URL}/api/books/admin/books`;
      const method = editingBook ? 'put' : 'post';
      
      const response = await axios[method](url, bookData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await fetchData();
      setShowBookModal(false);
      setEditingBook(null);
    } catch (err) {
      console.error('Error saving book:', err);
      alert('Не удалось сохранить книгу');
    } finally {
      setBookLoading(false);
    }
  };

  const openAddBookModal = () => {
    setEditingBook(null);
    setShowBookModal(true);
  };

  const openEditBookModal = (book) => {
    setEditingBook(book);
    setShowBookModal(true);
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
          className={`admin-tab ${activeTab === 'books' ? 'active' : ''}`}
          onClick={() => setActiveTab('books')}
          onMouseDown={createRipple}
        >
          <BookOpen size={18} />
          Книги
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
        
        {!loading && !error && activeTab === 'books' && (
          <div>
            <div className="admin-books-header">
              <button 
                className="admin-add-book-btn"
                onClick={openAddBookModal}
                onMouseDown={createRipple}
              >
                <Plus size={16} />
                Добавить книгу
              </button>
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>Автор</th>
                    <th>Год</th>
                    <th>Рейтинг</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map(book => (
                    <tr key={book.id}>
                      <td>{book.id}</td>
                      <td>{book.title}</td>
                      <td>{book.author}</td>
                      <td>{book.publication_year || '—'}</td>
                      <td>{book.rating_avg ? `${book.rating_avg} (${book.rating_count})` : 'Нет оценок'}</td>
                      <td>
                        <div className="admin-actions">
                          <button 
                            className="admin-edit-btn"
                            onClick={() => openEditBookModal(book)}
                            onMouseDown={createRipple}
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            className="admin-delete-btn"
                            onClick={() => deleteBook(book.id, book.title)}
                            onMouseDown={createRipple}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showBookModal && (
        <BookFormModal 
          onClose={() => {
            setShowBookModal(false);
            setEditingBook(null);
          }}
          onSubmit={handleBookSubmit}
          book={editingBook}
          loading={bookLoading}
        />
      )}
    </div>
  );
}