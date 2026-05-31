import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Home.css';

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
    <div className="home-rating-stars">
      {[...Array(fullStars)].map((_, i) => (
        <span key={`full-${i}`} className="star-filled">★</span>
      ))}
      {[...Array(emptyStars)].map((_, i) => (
        <span key={`empty-${i}`} className="star-empty">★</span>
      ))}
    </div>
  );
};

export default function Home() {
  const navigate = useNavigate();
  const [recentBooks, setRecentBooks] = useState([]);
  const [topRatedBooks, setTopRatedBooks] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        // Последние добавленные книги (по id)
        const booksRes = await axios.get(`${API_URL}/api/books`);
        const allBooks = booksRes.data;
        const recent = [...allBooks].slice(-3).reverse();
        setRecentBooks(recent);
        
        // Лучшие по рейтингу
        const topRated = [...allBooks]
          .sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0))
          .slice(0, 3);
        setTopRatedBooks(topRated);
        
        // Последние отзывы
        const reviewsRes = await axios.get(`${API_URL}/api/books/reviews/latest`);
        setRecentReviews(reviewsRes.data);
        
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHomeData();
  }, []);

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="home-page">
      <div className="home-main">
        {/* Блок "Последнее" */}
        <section className="home-section">
          <div className="section-header">
            <h2>Последнее</h2>
          </div>
          <div className="books-grid-large">
            {recentBooks.map(book => (
              <div 
                key={book.id} 
                className="home-book-card-large"
                onClick={() => navigate(`/book/${book.id}`)}
                onMouseDown={createRipple}
              >
                <div className="home-book-cover-large">
                  <img 
                    src={book.cover_url || 'https://via.placeholder.com/200x300?text=No+Cover'} 
                    alt={book.title}
                  />
                </div>
                <div className="home-book-info">
                  <h3>{book.title}</h3>
                  <p>{book.author}</p>
                  <div className="home-book-rating">
                    <StarRating rating={book.rating_avg} />
                    <span>{book.rating_avg || 'Нет оценок'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Блок "Лучшее" */}
        <section className="home-section">
          <div className="section-header">
            <h2>Лучшее</h2>
          </div>
          <div className="books-list-vertical">
            {topRatedBooks.map(book => (
              <div 
                key={book.id} 
                className="home-book-card-vertical"
                onClick={() => navigate(`/book/${book.id}`)}
                onMouseDown={createRipple}
              >
                <div className="home-book-cover-vertical">
                  <img 
                    src={book.cover_url || 'https://via.placeholder.com/80x120?text=No+Cover'} 
                    alt={book.title}
                  />
                </div>
                <div className="home-book-info-vertical">
                  <h3>{book.title}</h3>
                  <p>{book.author}</p>
                  <div className="home-book-rating">
                    <StarRating rating={book.rating_avg} />
                    <span>{book.rating_avg || 'Нет оценок'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Блок "Оценивают" */}
        <section className="home-section">
          <div className="section-header">
            <h2>Оценивают</h2>
          </div>
          <div className="reviews-list">
            {recentReviews.length === 0 ? (
              <div className="no-reviews">Пока нет отзывов</div>
            ) : (
              recentReviews.map(review => (
                <div key={review.id} className="home-review-card">
                  <div className="review-book-info">
                    <div 
                      className="review-book-cover"
                      onClick={() => navigate(`/book/${review.book_id}`)}
                    >
                      <img 
                        src={review.book_cover_url || 'https://via.placeholder.com/48x72?text=No+Cover'} 
                        alt={review.book_title}
                      />
                    </div>
                    <div 
                      className="review-book-details"
                      onClick={() => navigate(`/book/${review.book_id}`)}
                    >
                      <h4>{review.book_title}</h4>
                      <p>{review.book_author}</p>
                    </div>
                  </div>
                  <div className="review-author-info">
                    <div 
                      className="review-author-avatar"
                      onClick={() => navigate(`/user/${review.username}`)}
                    >
                      <img 
                        src={review.avatar_url || 'https://via.placeholder.com/32x32?text=Avatar'} 
                        alt={review.username}
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/32x32?text=Avatar'; }}
                      />
                    </div>
                    <div 
                      className="review-author-details"
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
        </section>
      </div>

      {/* Правая колонка - поиск по жанрам */}
      <aside className="home-sidebar">
        <div className="sidebar-section">
          <h3>Поиск по жанрам</h3>
          <div className="genres-list">
            <div className="genre-tag">Классика</div>
            <div className="genre-tag">Роман</div>
            <div className="genre-tag">Драма</div>
            <div className="genre-tag">Философия</div>
            <div className="genre-tag">Психология</div>
            <div className="genre-tag">Приключения</div>
            <div className="genre-tag">Фантастика</div>
            <div className="genre-tag">Детектив</div>
          </div>
        </div>
      </aside>
    </div>
  );
}