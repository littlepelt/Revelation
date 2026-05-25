import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ReadBook.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SAVE_INTERVAL = 60000; // 60 секунд (1 минута)

export default function ReadBook() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [savedProgress, setSavedProgress] = useState(0);
  const contentRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const isSavingRef = useRef(false);

  // Сохранение прогресса на сервер
  const saveProgress = useCallback(async (position, isFinal = false) => {
    if (isSavingRef.current) return;
    
    // Не сохраняем, если прогресс не изменился
    if (position === savedProgress) return;
    
    isSavingRef.current = true;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/books/${id}/progress`, 
        { position },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSavedProgress(position);
    } catch (err) {
      console.error('Ошибка сохранения прогресса:', err);
    } finally {
      isSavingRef.current = false;
    }
  }, [id, savedProgress]);

  // Принудительное сохранение при выходе
  const handleExit = useCallback(async () => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
    }
    await saveProgress(progress, true);
    navigate(`/book/${id}`);
  }, [progress, saveProgress, id, navigate]);

  // Загрузка книги и прогресса
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/books/${id}/read`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBook(response.data);
        const savedPos = response.data.progress || 0;
        setProgress(savedPos);
        setSavedProgress(savedPos);
      } catch (err) {
        console.error('Error fetching book:', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchBook();

    // Блокируем скролл body при открытии читалки
    document.body.classList.add('read-mode');
    
    // Обработчик закрытия/обновления страницы
    const handleBeforeUnload = () => {
      saveProgress(progress, true);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.body.classList.remove('read-mode');
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [id, navigate, progress, saveProgress]);

  // Настройка автоматического сохранения каждую минуту
  useEffect(() => {
    if (!loading && book) {
      saveIntervalRef.current = setInterval(() => {
        if (progress !== savedProgress) {
          saveProgress(progress);
        }
      }, SAVE_INTERVAL);
    }
    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [loading, book, progress, savedProgress, saveProgress]);

  // Восстановление позиции прокрутки
  useEffect(() => {
    if (contentRef.current && !loading && progress > 0) {
      const element = contentRef.current;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      const targetScroll = (progress / 100) * (scrollHeight - clientHeight);
      element.scrollTop = targetScroll;
    }
  }, [loading, progress]);

  // Обработка скролла — просто обновляем процент, без задержек
  const handleScroll = () => {
    if (!contentRef.current) return;
    
    const element = contentRef.current;
    const scrollPercent = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
    const newProgress = Math.min(99, Math.max(0, Math.floor(scrollPercent)));
    
    setProgress(newProgress);
  };

  if (loading) return <div className="loading">Загрузка книги...</div>;
  if (!book) return null;

  // Разбиваем текст на главы
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