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
  const saveTimeoutRef = useRef(null);
  const initialLoadRef = useRef(true);

  // Загрузка книги и прогресса
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error('❌ Нет токена, редирект на логин');
          navigate('/login');
          return;
        }
        
        const response = await axios.get(`${API_URL}/api/books/${id}/read`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const bookData = response.data;
        setBook(bookData);
        setProgress(bookData.progress || 0);
        console.log(`📖 Загружена: ${bookData.title}, прогресс: ${bookData.progress || 0}%`);
        
      } catch (err) {
        console.error('❌ Ошибка загрузки:', err.response?.status, err.response?.data);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBook();
    document.body.classList.add('read-mode');
    
    return () => {
      document.body.classList.remove('read-mode');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [id, navigate]);

  // Сохранение прогресса на сервер
  const saveProgress = async (position) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('❌ Токен не найден');
        return;
      }
      
      await axios.post(`${API_URL}/api/books/${id}/progress`, 
        { position },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      console.log(`💾 Прогресс сохранён: ${position}%`);
    } catch (err) {
      console.error('❌ Ошибка сохранения:', err.response?.status, err.response?.data);
    }
  };

  // Восстановление позиции после загрузки (только один раз)
  useEffect(() => {
    if (!loading && contentRef.current && progress > 0 && initialLoadRef.current) {
      const element = contentRef.current;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      const targetScroll = (progress / 100) * (scrollHeight - clientHeight);
      
      element.scrollTop = targetScroll;
      console.log(`🔄 Восстановлен скролл: ${progress}%`);
      initialLoadRef.current = false;
    }
  }, [loading, progress]);

  // Обработка скролла
  const handleScroll = () => {
    if (!contentRef.current || !initialLoadRef.current) return;
    
    const element = contentRef.current;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    if (scrollHeight <= clientHeight) return;
    
    const scrollPercent = element.scrollTop / (scrollHeight - clientHeight);
    const currentProgress = Math.floor(Math.min(99, Math.max(0, scrollPercent * 100)));
    
    // Обновляем состояние только если значение изменилось
    if (currentProgress !== progress) {
      setProgress(currentProgress);
      
      // Сохраняем с задержкой 1.5 секунды после остановки скролла
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveProgress(currentProgress);
      }, 1500);
    }
  };

  // Выход с сохранением
  const handleExit = async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    await saveProgress(progress);
    navigate(`/book/${id}`);
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