import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { PenLine, ThumbsUp, ThumbsDown, ChevronDown, Check } from 'lucide-react';
import ReviewModal from '../components/ReviewModal';
import StarRating from '../components/StarRating';
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

const getEnglishTag = (russianTag) => {
  const mapping = {
    'Классика': 'classic',
    'Психологический роман': 'psychological',
    'Русская литература': 'russian',
    'Английская литература': 'english',
    'Немецкая литература': 'german',
    'Японская литература': 'japanese',
    'Итальянская литература': 'italian',
    'Древняя литература': 'ancient',
    'Поэма': 'poem',
    'Драма': 'drama',
    'Роман': 'romance',
    'Философия': 'philosophy',
    'Приключения': 'adventure',
    'Фантастика': 'fantasy',
    'Детектив': 'detective'
  };
  return mapping[russianTag] || russianTag.toLowerCase();
};

export default function BookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState(null);
  const [savedPage, setSavedPage] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [userReactions, setUserReactions] = useState({});
  const [reactionLoading, setReactionLoading] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        const bookRes = await axios.get(`${API_URL}/api/books/${id}`);
        setBook(bookRes.data);
        
        const reviewsRes = await axios.get(`${API_URL}/api/books/${id}/reviews`);
        setReviews(reviewsRes.data);
        
        if (token && reviewsRes.data.length > 0) {
          const reactionsMap = {};
          for (const review of reviewsRes.data) {
            try {
              const reactionRes = await axios.get(`${API_URL}/api/books/reviews/${review.id}/reaction`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              reactionsMap[review.id] = reactionRes.data.reaction;
            } catch (e) {
              console.error('Error fetching reaction:', e);
            }
          }
          setUserReactions(reactionsMap);
        }
        
        if (token) {
          try {
            const meRes = await axios.get(`${API_URL}/api/auth/me`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentUserId(meRes.data.id);
          } catch (meErr) {
            console.error('Ошибка загрузки пользователя:', meErr);
          }
          
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
      setDropdownOpen(false);
    } catch (err) {
      console.error('Ошибка сохранения статуса:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  const removeFromShelf = async () => {
    setStatusLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/books/${id}/status`, 
        { status: null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserStatus(null);
      setDropdownOpen(false);
    } catch (err) {
      console.error('Ошибка удаления с полки:', err);
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
      
      await axios.post(`${API_URL}/api/books/${id}/reviews`,
        { rating, comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const reviewsRes = await axios.get(`${API_URL}/api/books/${id}/reviews`);
      setReviews(reviewsRes.data);
      
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
      
      await axios.delete(`${API_URL}/api/books/${id}/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const reviewsRes = await axios.get(`${API_URL}/api/books/${id}/reviews`);
      setReviews(reviewsRes.data);
      
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

  const handleReaction = async (reviewId, reaction) => {
    setReactionLoading(prev => ({ ...prev, [reviewId]: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/books/reviews/${reviewId}/react`,
        { reaction },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, likes: response.data.likes, dislikes: response.data.dislikes }
          : review
      ));
      
      setUserReactions(prev => {
        const current = prev[reviewId];
        if (current === reaction) {
          return { ...prev, [reviewId]: null };
        } else {
          return { ...prev, [reviewId]: reaction };
        }
      });
      
    } catch (err) {
      console.error('Error posting reaction:', err);
    } finally {
      setReactionLoading(prev => ({ ...prev, [reviewId]: false }));
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

  const statusOptions = [
    { value: 'reading', label: 'Читаю' },
    { value: 'read', label: 'Прочитано' },
    { value: 'want_to_read', label: 'Буду читать' }
  ];

  return (
    <div className="book-page">
      <div className="book-content">
        <div className="book-left-column">
          <div className="book-cover-large">
            <img 
              src={book.cover_url || 'https://via.placeholder.com/300x450?text=No+Cover'} 
              alt={book.title}
            />
          </div>
          
          <div className="read-button-container">
            <button 
              className="read-button-main" 
              onClick={handleRead}
              onMouseDown={createRipple}
            >
              Читать книгу
            </button>
            <div className="dropdown-wrapper">
              <button 
                className="read-button-dropdown"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                onMouseDown={createRipple}
              >
                <ChevronDown size={18} />
              </button>
              {dropdownOpen && (
                <div className="dropdown-menu">
                  {statusOptions.map(option => (
                    <button
                      key={option.value}
                      className={`dropdown-item ${userStatus === option.value ? 'active' : ''}`}
                      onClick={() => setStatus(option.value)}
                      disabled={statusLoading}
                    >
                      {userStatus === option.value && <Check size={14} />}
                      <span>{option.label}</span>
                    </button>
                  ))}
                  {userStatus && (
                    <>
                      <div className="dropdown-divider"></div>
                      <button
                        className="dropdown-item remove"
                        onClick={removeFromShelf}
                        disabled={statusLoading}
                      >
                        Убрать с полки
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <button 
            className="review-button" 
            onClick={openReviewModal}
            onMouseDown={createRipple}
          >
            <PenLine size={16} />
            {userHasReview ? 'Изменить отзыв' : 'Написать отзыв'}
          </button>
        </div>
        
        <div className="book-info">
          <h1>{book.title}</h1>
          <h2>{book.author}{book.publication_year ? `, ${book.publication_year}` : ''}</h2>
          
          <div className="book-meta">
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
              {book.tags.split(',').map((tag, index) => {
                const englishTag = getEnglishTag(tag.trim());
                return (
                  <Link 
                    key={index} 
                    to={`/books/tag/${englishTag}`} 
                    className="book-tag"
                  >
                    {tag.trim()}
                  </Link>
                );
              })}
            </div>
          )}
          
          <div className="book-description">
            <h3>Описание</h3>
            <p>{book.description || 'Описание отсутствует'}</p>
          </div>
        </div>
      </div>
      
      <div className="book-reviews">
        <h3>Отзывы ({reviews.length})</h3>
        <div className="reviews-list">
          {reviews.length === 0 ? (
            <div className="no-reviews">Пока нет отзывов. Будьте первым!</div>
          ) : (
            reviews.map(review => (
              <div key={review.id} className="review-card">
                <div 
                  className="review-author-clickable"
                  onClick={() => navigate(`/user/${review.username}`)}
                  onMouseDown={createRipple}
                >
                  <div className="review-author-avatar">
                    <img 
                      src={review.avatar_url || '/Avatar.png'} 
                      alt={review.username}
                      onError={(e) => { e.target.src = '/Avatar.png'; }}
                    />
                  </div>
                  <div className="review-author-info">
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
                
                <div className="review-reactions">
                  <button 
                    className={`reaction-btn ${userReactions[review.id] === 'like' ? 'active' : ''}`}
                    onClick={() => handleReaction(review.id, 'like')}
                    disabled={reactionLoading[review.id]}
                    onMouseDown={createRipple}
                  >
                    <ThumbsUp size={16} />
                    <span>{review.likes || 0}</span>
                  </button>
                  <button 
                    className={`reaction-btn ${userReactions[review.id] === 'dislike' ? 'active' : ''}`}
                    onClick={() => handleReaction(review.id, 'dislike')}
                    disabled={reactionLoading[review.id]}
                    onMouseDown={createRipple}
                  >
                    <ThumbsDown size={16} />
                    <span>{review.dislikes || 0}</span>
                  </button>
                </div>
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