import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import StarRating from '../components/StarRating';
import './AllBooks.css';

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

const tagNames = {
  'classic': 'Классика',
  'psychological': 'Психологический роман',
  'russian': 'Русская литература',
  'english': 'Английская литература',
  'german': 'Немецкая литература',
  'japanese': 'Японская литература',
  'italian': 'Итальянская литература',
  'ancient': 'Древняя литература',
  'poem': 'Поэма',
  'drama': 'Драма',
  'romance': 'Роман',
  'philosophy': 'Философия',
  'adventure': 'Приключения',
  'fantasy': 'Фантастика',
  'detective': 'Детектив'
};

export default function BooksByTag() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const [allBooks, setAllBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingBookId, setPendingBookId] = useState(null);

  const displayTagName = tagNames[tag] || tag;

  useEffect(() => {
    const fetchBooksByTag = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/books/tag/${tag}`);
        setAllBooks(response.data);
      } catch (err) {
        console.error('Error fetching books by tag:', err);
        setAllBooks([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBooksByTag();
  }, [tag]);

  const filteredBooks = allBooks.filter(book => {
    const searchLower = searchTerm.toLowerCase();
    return (
      book.title.toLowerCase().includes(searchLower) ||
      book.author.toLowerCase().includes(searchLower)
    );
  });

  const handleMouseDown = (bookId, e) => {
    const card = e.currentTarget;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = card.getBoundingClientRect();
    const size = Math.max(card.clientWidth, card.clientHeight);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    
    const oldRipples = card.querySelectorAll('.ripple');
    oldRipples.forEach(r => r.remove());
    
    card.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    
    setPendingBookId(bookId);
  };

  const handleMouseUp = (bookId) => {
    if (pendingBookId === bookId) {
      navigate(`/book/${bookId}`);
      setPendingBookId(null);
    }
  };

  const handleMouseLeave = () => {
    setPendingBookId(null);
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="feed-container">
      <div className="page-header">
        <h1>{displayTagName}</h1>
      </div>

      <div className="search-section">
        <input
          type="text"
          className="search-input"
          placeholder="Поиск по названию или автору..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="books-list">
        {filteredBooks.length === 0 ? (
          <div className="empty-library">
            <p className="empty-title">Книги не найдены</p>
            <p className="empty-subtitle">По тегу "{displayTagName}" нет книг</p>
          </div>
        ) : (
          filteredBooks.map(book => (
            <div
              key={book.id}
              className="book-card"
              onMouseDown={(e) => handleMouseDown(book.id, e)}
              onMouseUp={() => handleMouseUp(book.id)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="book-cover">
                {book.cover_url ? (
                  <img src={book.cover_url} alt={book.title} />
                ) : (
                  <div className="cover-placeholder">{book.title[0]}</div>
                )}
              </div>
              <div className="book-main">
                <div className="book-title">{book.title}</div>
                <div className="book-author">{book.author}</div>
                <div className="book-rating">
                  <StarRating rating={book.rating_avg} />
                  <span className="rating-value">{book.rating_avg || 'Нет оценок'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}