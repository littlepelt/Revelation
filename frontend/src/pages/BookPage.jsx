import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Star } from 'lucide-react';
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
    <div className="review-stars-display">
      {[...Array(fullStars)].map((_, i) => (
        <span key={`full-${i}`}>★</span>
      ))}
      {[...Array(emptyStars)].map((_, i) => (
        <span key={`empty-${i}`}>☆</span>
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Загружаем книгу
        const bookRes = await axios.get(`${API_URL}/api/books/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBook(bookRes.data);
        
        // Загружаем отзывы (публичный доступ, без токена)
        try {
          const reviewsRes = await axios.get(`${API_URL}/api/books/${id}/reviews`);
          setReviews(reviewsRes.data);
        } catch (reviewsErr) {
          console.error('Ошибка загрузки отзывов:', reviewsErr);
          setReviews([]);
        }
        
        // Загружаем прогресс чтения
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
        
        // Загружаем статус книги
        try {
          const statusResponse = await axios.get(`${API_URL}/api/books/${id}/status`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserStatus(statusResponse.data.status);
        } catch (statusErr) {
          console.error('Ошибка загрузки статуса:', statusErr);
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
    
    console.log('Saving review...');
    await axios.post(`${API_URL}/api/books/${id}/reviews`,
      { rating, comment },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('Review saved, fetching updated data...');
    
    // Обновляем отзывы (публичный)
    const reviewsRes = await axios.get(`${API_URL}/api/books/${id}/reviews`);
    setReviews(reviewsRes.data);
    
    // Обновляем книгу (публичный)
    const bookRes = await axios.get(`${API_URL}/api/books/${id}`);
    setBook(prev => ({ ...prev, rating_avg: bookRes.data.rating_avg, rating_count: bookRes.data.rating_count }));
    
    console.log('Data updated successfully');
    setShowReviewModal(false);
  } catch (err) {
    console.error('Error saving review:', err.response?.status, err.response?.data);
    alert('Не удалось сохранить отзыв');
  } finally {
    setReviewLoading(false);
  }
};

  if (loading) return <div className="loading">Загрузка книги...</div>;
  if (!book) return null;

  return (
    <div className="book-page">
      <button 
        className="back-button"
        onClick={() => navigate('/')}
        onMouseDown={createRipple}
      >
        <ArrowLeft size={20} />
      </button>
      
      <div className="book-content">
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
            onClick={() => setShowReviewModal(true)}
            onMouseDown={createRipple}
          >
            <Star size={16} />
            Написать отзыв
          </button>
        </div>
        
        <div className="book-info">
          <h1>{book.title}</h1>
          <h2>{book.author}</h2>
          
          <div className="book-meta">
            <span className="year-badge">{book.publication_year}</span>
            <span className="rating-badge">
              ★ {book.rating_avg || 'Нет оценок'} ({book.rating_count || 0} оценок)
            </span>
          </div>
          
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
                          src={review.avatar_url || 'https://placehold.net/8.png'} 
                          alt={review.username}
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
                    <div className="review-rating">
                      <StarRating rating={review.rating} />
                    </div>
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
        </div>
      </div>

      {showReviewModal && (
        <ReviewModal 
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleAddReview}
          loading={reviewLoading}
        />
      )}
    </div>
  );
}