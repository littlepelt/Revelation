import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import StarRating from '../components/StarRating';
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

export default function Home() {
  const navigate = useNavigate();
  const [recentBooks, setRecentBooks] = useState([]);
  const [topRatedBooks, setTopRatedBooks] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userReactions, setUserReactions] = useState({});
  const [reactionLoading, setReactionLoading] = useState({});

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        const booksRes = await axios.get(`${API_URL}/api/books`);
        const allBooks = booksRes.data;
        const recent = [...allBooks].slice(-3).reverse();
        setRecentBooks(recent);
        
        const topRated = [...allBooks]
          .sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0))
          .slice(0, 3);
        setTopRatedBooks(topRated);
        
        const reviewsRes = await axios.get(`${API_URL}/api/books/reviews/latest`);
        setRecentReviews(reviewsRes.data);
        
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
        
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHomeData();
  }, []);

  const handleReaction = async (reviewId, reaction) => {
    setReactionLoading(prev => ({ ...prev, [reviewId]: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/books/reviews/${reviewId}/react`,
        { reaction },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setRecentReviews(prev => prev.map(review => 
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

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="home-page">
      <div className="home-main">
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
                    <span className="rating-value">{book.rating_avg || 'Нет оценок'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

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
                    <span className="rating-value">{book.rating_avg || 'Нет оценок'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="home-section">
          <div className="section-header">
            <h2>Оценивают</h2>
          </div>
          <div className="reviews-list">
            {recentReviews.map(review => (
              <div key={review.id} className="home-review-card">
                <div 
                  className="review-book-info"
                  onClick={() => navigate(`/book/${review.book_id}`)}
                  onMouseDown={createRipple}
                >
                  <div className="review-book-cover">
                    <img 
                      src={review.book_cover_url || 'https://via.placeholder.com/48x72?text=No+Cover'} 
                      alt={review.book_title}
                    />
                  </div>
                  <div className="review-book-details">
                    <h4>{review.book_title}</h4>
                    <p>{review.book_author}</p>
                  </div>
                </div>
                
                <div 
                  className="review-author-row"
                  onClick={() => navigate(`/user/${review.username}`)}
                  onMouseDown={createRipple}
                >
                  <div className="review-author-avatar">
                    <img 
                      src={review.avatar_url || '/Avatar.svg'} 
                      alt={review.username}
                      onError={(e) => { e.target.src = '/Avatar.svg'; }}
                    />
                  </div>
                  <div className="review-author-info">
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
            ))}
          </div>
        </section>
      </div>

      <aside className="home-sidebar">
        <div className="sidebar-section">
          <h3>Поиск по жанрам</h3>
          <div className="genres-list">
            <Link to="/books/tag/charter" className="genre-tag">Устав</Link>
            <Link to="/books/tag/instruction" className="genre-tag">Наставление</Link>
            <Link to="/books/tag/manual1" className="genre-tag">Руководство</Link>
            <Link to="/books/tag/manual2" className="genre-tag">Пособие</Link>
            <Link to="/books/tag/strategy" className="genre-tag">Стратегия</Link>
            <Link to="/books/tag/tactics" className="genre-tag">Тактика</Link>
            <Link to="/books/tag/combat_training" className="genre-tag">Боевая подготовка</Link>
            <Link to="/books/tag/phys_training" className="genre-tag">Физ. подготовка</Link>
            <Link to="/books/tag/musketry" className="genre-tag">Стрелковое дело</Link>
            <Link to="/books/tag/engineering" className="genre-tag">Инженерное дело</Link>
            <Link to="/books/tag/medicine" className="genre-tag">Медицина</Link>
            <Link to="/books/tag/military_history" className="genre-tag">Военная история</Link>
            <Link to="/books/tag/treatise" className="genre-tag">Трактат</Link>
            <Link to="/books/tag/regulation" className="genre-tag">Регламент</Link>
            <Link to="/books/tag/resolution" className="genre-tag">Постановление</Link>
          </div>
        </div>
      </aside>
    </div>
  );
}