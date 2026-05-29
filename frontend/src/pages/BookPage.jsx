import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import './BookPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Ripple эффект (как в читалке)
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

export default function BookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState(null);
  const [savedPage, setSavedPage] = useState(1);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const token = localStorage.getItem('token');
        
        const response = await axios.get(`${API_URL}/api/books/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBook(response.data);
        
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
        
      } catch (err) {
        console.error('Error fetching book:', err);
        if (err.response?.status === 404) {
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id, navigate]);

  const setStatus = async (status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/books/${id}/status`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserStatus(status);
    } catch (err) {
      console.error('Ошибка сохранения статуса:', err);
    }
  };

  const handleRead = () => {
    navigate(`/read/${id}/${savedPage}`);
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
        <div className="book-cover-large">
          <img 
            src={book.cover_url || 'https://via.placeholder.com/300x450?text=No+Cover'} 
            alt={book.title}
          />
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
            >
              Читаю
            </button>
            <button 
              className={`status-btn ${userStatus === 'read' ? 'active' : ''}`}
              onClick={() => setStatus('read')}
              onMouseDown={createRipple}
            >
              Прочитано
            </button>
            <button 
              className={`status-btn ${userStatus === 'want_to_read' ? 'active' : ''}`}
              onClick={() => setStatus('want_to_read')}
              onMouseDown={createRipple}
            >
              Буду читать
            </button>
          </div>
          
          <button 
            className="read-button" 
            onClick={handleRead}
            onMouseDown={createRipple}
          >
            Читать книгу
          </button>
          
          <div className="book-description">
            <h3>Описание</h3>
            <p>{book.description || 'Описание отсутствует'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}