import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ReadBook.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ReadBook() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const contentRef = useRef(null);
  const restoredRef = useRef(false);

  // Загрузка книги
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/books/${id}/read`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBook(response.data);
        setProgress(response.data.progress || 0);
      } catch (err) {
        console.error('Ошибка:', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBook();
    document.body.classList.add('read-mode');
    
    return () => {
      document.body.classList.remove('read-mode');
    };
  }, [id, navigate]);

  // Восстановление скролла (один раз)
  useEffect(() => {
    if (!loading && contentRef.current && progress > 0 && !restoredRef.current) {
      const element = contentRef.current;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      const targetScroll = (progress / 100) * (scrollHeight - clientHeight);
      element.scrollTop = targetScroll;
      console.log(`🔄 Восстановлен скролл: ${progress}%`);
      restoredRef.current = true;
    }
  }, [loading, progress]);

  // Сохранение прогресса на сервер
  const saveProgress = async (position) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/books/${id}/progress`, 
        { position },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(`💾 Сохранено: ${position}%`);
    } catch (err) {
      console.error('❌ Ошибка сохранения:', err.response?.status);
    }
  };

  // Обработка скролла — только обновляем процент (НЕ сохраняем)
  const handleScroll = () => {
    if (!contentRef.current) return;
    
    const element = contentRef.current;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    if (scrollHeight <= clientHeight) return;
    
    const scrollPercent = element.scrollTop / (scrollHeight - clientHeight);
    // Округляем до одного знака после запятой
    const currentProgress = Math.round(scrollPercent * 1000) / 10;
    
    if (currentProgress !== progress) {
      setProgress(currentProgress);
    }
  };

  // Выход — сохраняем финальный прогресс
  const handleExit = async () => {
    if (progress > 0) {
      await saveProgress(progress);
    }
    navigate(`/book/${id}`);
  };

  // Сохранение при закрытии вкладки
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (progress > 0) {
        // Используем sendBeacon для надёжной отправки перед закрытием
        const token = localStorage.getItem('token');
        if (token) {
          const url = `${API_URL}/api/books/${id}/progress`;
          const data = JSON.stringify({ position: progress });
          navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }));
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [id, progress]);

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!book) return null;

  const chapters = book.text?.split(/\n(?=ГЛАВА|ЧАСТЬ)/) || [];

  return (
    <div className="read-container">
      <div className="read-header">
        <button className="back-btn" onClick={handleExit}>
          ← Вернуться
        </button>
        <div className="read-title">
          <h2>{book.title}</h2>
          <p>{book.author}</p>
        </div>
        <div className="progress-indicator">
          {progress}%
        </div>
      </div>

      <div className="read-content" ref={contentRef} onScroll={handleScroll}>
        {chapters.map((chapter, index) => {
          const lines = chapter.split('\n');
          const title = lines[0].replace(/^#+\s*/, '').trim();
          const text = lines.slice(1).join('\n');
          return (
            <div key={index} className="chapter">
              {title && <h3 className="chapter-title">{title}</h3>}
              {text.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}