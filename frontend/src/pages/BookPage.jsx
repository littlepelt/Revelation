import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, PenLine } from 'lucide-react';
import ReviewModal from '../components/ReviewModal';
import './BookPage.css';

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

const StarRating = ({ rating }) => {
  const fullStars = Math.floor(rating || 0);
  const emptyStars = 5 - fullStars;
  
  return (
    <div className="review-rating">
      {[...Array(fullStars)].map((_, i) => (
        <span key={`full-${i}`} className="review-star-filled">★</span>
      ))}
      {[...Array(emptyStars)].map((_, i) => (
        <span key={`empty-${i}`} className="review-star-unfilled">★</span>
      ))}
    </div>
  );
};

export default function BookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState(null);
  const [savedPage, setSavedPage] = useState(1);
  const [statusLoading, setStatusLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Загружаем книгу (публичный запрос)
        const bookRes = await axios.get(`${API_URL}/api/books/${id}`);
        setBook(bookRes.data);
        
        // Загружаем отзывы (публичный запрос)
        try {
          const reviewsRes = await axios.get(`${API_URL}/api/books/${id}/reviews`);
          setReviews(reviewsRes.data);
        } catch (reviewsErr) {
          console.error('Ошибка загрузки отзывов:', reviewsErr);
          setReviews([]);
        }
        
        // Загружаем текущего пользователя
        if (token) {
          try {
            const meRes = await axios.get(`${API_URL}/api/auth/me`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentUserId(meRes.data.id);
          } catch (meErr) {
            console.error('Ошибка загрузки пользователя:', meErr);
          }
          
          // Загружаем прогресс чтения (требует токен)
          try {
            const progressResponse = await axios.get(`${API_URL}/api/books/${id}/progress`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const progressStr = progressResponse.data.progress;
            if (progressStr) {
              const page = parseInt(progressStr.split('.')[0]) || 1;
              setSavedPage(page);
            }
          } catch (progressErr) {
            console.error('Ошибка загрузки прогресса:', progressErr);
          }
          
          // Загружаем статус книги (требует токен)
          try {
            const statusResponse = await axios.get(`${API_URL}/api/books/${id}/status`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setUserStatus(statusResponse.data.status);
          } catch (statusErr) {
            console.error('Ошибка загрузки статуса:', statusErr);
          }
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.response?.status === 404) {
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, navigate]);

  const setStatus = async (status) => {
    setStatusLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/books/${id}/status`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserStatus(status);
    } catch (err) {
      console.error('Ошибка сохранения статуса:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleRead = () => {
    navigate(`/read/${id}/${savedPage}`);
  };

  const handleAddReview = async (rating, comment) => {
    setReviewLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Сохраняем отзыв
      await axios.post(`${API_URL}/api/books/${id}/reviews`,
        { rating, comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Обновляем список отзывов (публичный)
      const reviewsRes = await axios.get(`${API_URL}/api/books/${id}/reviews`);
      setReviews(reviewsRes.data);
      
      // Обновляем книгу (публичный)
      const bookRes = await axios.get(`${API_URL}/api/books/${id}`);
      setBook(prev => ({ ...prev, rating_avg: bookRes.data.rating_avg, rating_count: bookRes.data.rating_count }));
      
      setShowReviewModal(false);
      setEditingReview(null);
    } catch (err) {
      console.error('Ошибка сохранения отзыва:', err);
      alert('Не удалось сохранить отзыв');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    setReviewLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Удаляем отзыв
      await axios.delete(`${API_URL}/api/books/${id}/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Обновляем список отзывов (публичный)
      const reviewsRes = await axios.get(`${API_URL}/api/books/${id}/reviews`);
      setReviews(reviewsRes.data);
      
      // Обновляем книгу (публичный)
      const bookRes = await axios.get(`${API_URL}/api/books/${id}`);
      setBook(prev => ({ ...prev, rating_avg: bookRes.data.rating_avg, rating_count: bookRes.data.rating_count }));
      
      setShowReviewModal(false);
      setEditingReview(null);
    } catch (err) {
      console.error('Ошибка удаления отзыва:', err);
      alert('Не удалось удалить отзыв');
    } finally {
      setReviewLoading(false);
    }
  };

  const openReviewModal = () => {
    const existing = reviews.find(r => r.user_id === currentUserId);
    if (existing) {
      setEditingReview(existing);
    } else {
      setEditingReview(null);
    }
    setShowReviewModal(true);
  };

  const userHasReview = reviews.some(r => r.user_id === currentUserId);

  if (loading) return <div className="loading">Загрузка книги...</div>;
  if (!book) return null;

  return (
    <div className="book-page">
      <div className="book-content">
        {/* Левая колонка: обложка + кнопки */}
        <div className="book-left-column">
          <div className="book-cover-large">
            <img 
              src={book.cover_url || 'https://via.placeholder.com/300x450?text=No+Cover'} 
              alt={book.title}
            />
          </div>
          
          <button 
            className="read-button" 
            onClick={handleRead}
            onMouseDown={createRipple}
          >
            Читать книгу
          </button>
          
          <button 
            className="review-button" 
            onClick={openReviewModal}
            onMouseDown={createRipple}
          >
            <PenLine size={16} />
            {userHasReview ? 'Изменить отзыв' : 'Написать отзыв'}
          </button>
        </div>
        
        {/* Правая колонка: информация о книге */}
        <div className="book-info">
          <h1>{book.title}</h1>
          <h2>{book.author}</h2>
          
          <div className="book-meta">
            <span className="year-badge">{book.publication_year}</span>
            <div className="rating-badge">
              <div className="rating-stars">
                {[...Array(Math.floor(book.rating_avg || 0))].map((_, i) => (
                  <span key={`full-${i}`} className="star-filled">★</span>
                ))}
                {[...Array(5 - Math.floor(book.rating_avg || 0))].map((_, i) => (
                  <span key={`empty-${i}`} className="star-empty">★</span>
                ))}
              </div>
              <span className="rating-value">{book.rating_avg || 'Нет оценок'}</span>
            </div>
          </div>

          {book.tags && book.tags.length > 0 && (
            <div className="book-tags">
              {book.tags.split(',').map((tag, index) => (
                <span key={index} className="book-tag">{tag.trim()}</span>
              ))}
            </div>
          )}
          
          <div className="book-actions">
            <button 
              className={`status-btn ${userStatus === 'reading' ? 'active' : ''}`}
              onClick={() => setStatus('reading')}
              onMouseDown={createRipple}
              disabled={statusLoading}
            >
              Читаю
            </button>
            <button 
              className={`status-btn ${userStatus === 'read' ? 'active' : ''}`}
              onClick={() => setStatus('read')}
              onMouseDown={createRipple}
              disabled={statusLoading}
            >
              Прочитано
            </button>
            <button 
              className={`status-btn ${userStatus === 'want_to_read' ? 'active' : ''}`}
              onClick={() => setStatus('want_to_read')}
              onMouseDown={createRipple}
              disabled={statusLoading}
            >
              Буду читать
            </button>
          </div>
          
          <div className="book-description">
            <h3>Описание</h3>
            <p>{book.description || 'Описание отсутствует'}</p>
          </div>
        </div>
      </div>
      
      {/* Блок отзывов - отдельно после book-content */}
      <div className="book-reviews">
        <h3>Отзывы ({reviews.length})</h3>
        <div className="reviews-list">
          {reviews.length === 0 ? (
            <div className="no-reviews">Пока нет отзывов. Будьте первым!</div>
          ) : (
            reviews.map(review => (
              <div key={review.id} className="review-card">
                <div className="review-author">
                  <div 
                    className="review-author-avatar"
                    onClick={() => navigate(`/user/${review.username}`)}
                  >
                    <img 
                      src={review.avatar_url || 'https://via.placeholder.com/40x40?text=Avatar'} 
                      alt={review.username}
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/40x40?text=Avatar'; }}
                    />
                  </div>
                  <div 
                    className="review-author-info"
                    onClick={() => navigate(`/user/${review.username}`)}
                  >
                    <strong>{review.username}</strong>
                    <span className="review-date">
                      {new Date(review.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
                <StarRating rating={review.rating} />
                {review.comment && (
                  <div className="review-comment">
                    {review.comment}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showReviewModal && (
        <ReviewModal 
          onClose={() => {
            setShowReviewModal(false);
            setEditingReview(null);
          }}
          onSubmit={handleAddReview}
          onDelete={handleDeleteReview}
          loading={reviewLoading}
          existingReview={editingReview}
        />
      )}
    </div>
  );
}