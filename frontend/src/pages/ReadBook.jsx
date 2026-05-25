import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ReadBook.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SAVE_INTERVAL = 60000; // 60 секунд

export default function ReadBook() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const contentRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const isSavingRef = useRef(false);
  const restoredRef = useRef(false);
  const lastSavedProgressRef = useRef(0);

  

  // Сохранение прогресса
  const saveProgress = useCallback(async (position) => {
    // Не делаем повторный запрос, если уже идет сохранение
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    try {
        const token = localStorage.getItem('token');
        // КРИТИЧЕСКИ ВАЖНО: Проверьте, что токен существует
        if (!token) {
            console.error("❌ Токен не найден в localStorage");
            return;
        }

        console.log(`📤 Отправка прогресса (${position}%) с токеном:`, token.substring(0, 20) + '...');

        const response = await axios.post(`${API_URL}/api/books/${id}/progress`,
            { position },
            {
                headers: {
                    'Authorization': `Bearer ${token}`, // <- ПРОВЕРЬТЕ ЭТУ СТРОКУ
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.status === 200) {
            console.log(`✅ Прогресс (${position}%) успешно сохранен на сервере`);
        }
    } catch (err) {
        // Более детальное логирование ошибки
        if (err.response) {
            console.error(`❌ Ошибка сохранения (${err.response.status}):`, err.response.data);
        } else {
            console.error('❌ Ошибка сети или другая:', err.message);
        }
    } finally {
        isSavingRef.current = false;
    }
}, [id]);

  // Восстановление позиции прокрутки по сохранённому прогрессу
  const restoreScrollPosition = useCallback((savedProgress) => {
    if (!contentRef.current || restoredRef.current) return;
    
    const element = contentRef.current;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    if (scrollHeight > clientHeight && savedProgress > 0) {
      const targetScroll = (savedProgress / 100) * (scrollHeight - clientHeight);
      element.scrollTop = targetScroll;
      console.log(`🔄 Восстановлена позиция: ${savedProgress}%, scrollTop = ${targetScroll}`);
      restoredRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!loading && contentRef.current && book && progress > 0) {
        const element = contentRef.current;
        // Небольшая задержка, чтобы DOM точно отрисовался
        const timer = setTimeout(() => {
            const scrollHeight = element.scrollHeight;
            const clientHeight = element.clientHeight;
            const targetScroll = (progress / 100) * (scrollHeight - clientHeight);
            element.scrollTop = targetScroll;
            console.log(`🔄 Скролл восстановлен на позицию ${targetScroll} (${progress}%)`);
            lastSavedProgressRef.current = progress;
        }, 100);
        return () => clearTimeout(timer);
    }
}, [loading, book, progress]); // Зависимость ТОЛЬКО от loading, book, progress

// 3. Эффект для авто-сохранения прогресса (без влияния на скролл)
useEffect(() => {
    if (!contentRef.current || loading) return;
    
    const saveCurrentProgress = () => {
        const element = contentRef.current;
        const scrollPercent = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
        const currentProgress = Math.floor(Math.min(99, Math.max(0, scrollPercent)));
        
        if (currentProgress !== lastSavedProgressRef.current) {
            console.log(`🔄 Скролл изменился: ${currentProgress}%`);
            lastSavedProgressRef.current = currentProgress;
            saveProgress(currentProgress); // Ваша функция сохранения
        }
    };

    // Сохраняем прогресс при скролле (без задержек)
    const handleScrollDirect = () => {
        requestAnimationFrame(saveCurrentProgress);
    };
    
    const element = contentRef.current;
    element.addEventListener('scroll', handleScrollDirect);
    
    // Запускаем интервал для подстраховки (каждые 30 секунд)
    const intervalId = setInterval(saveCurrentProgress, 30000);
    
    return () => {
        element.removeEventListener('scroll', handleScrollDirect);
        clearInterval(intervalId);
    };
}, [loading, saveProgress]); // Зависит от loading и стабильной функции saveProgress

  // Загрузка книги и прогресса
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/books/${id}/read`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const bookData = response.data;
        setBook(bookData);
        setProgress(bookData.progress || 0);
        
        console.log(`📖 Загружена книга: ${bookData.title}, прогресс: ${bookData.progress || 0}%`);
        
      } catch (err) {
        console.error('Ошибка загрузки:', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBook();
    document.body.classList.add('read-mode');
    
    return () => {
      document.body.classList.remove('read-mode');
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [id, navigate]);

  // Восстанавливаем позицию после того, как DOM обновился
  useEffect(() => {
    if (!loading && contentRef.current && !restoredRef.current) {
      // Даём время на полный рендер текста
      const timeoutId = setTimeout(() => {
        restoreScrollPosition(progress);
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [loading, progress, restoreScrollPosition]);

  // Автосохранение каждую минуту
  useEffect(() => {
    if (!loading && book) {
      saveIntervalRef.current = setInterval(() => {
        if (contentRef.current) {
          const element = contentRef.current;
          const scrollPercent = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
          const currentProgress = Math.floor(Math.min(99, Math.max(0, scrollPercent)));
          
          if (currentProgress !== progress) {
            setProgress(currentProgress);
            saveProgress(currentProgress);
          }
        }
      }, SAVE_INTERVAL);
    }
    
    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [loading, book, progress, saveProgress]);

  // Обработка скролла с сохранением
  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;
    
    const element = contentRef.current;
    const scrollPercent = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
    const currentProgress = Math.floor(Math.min(99, Math.max(0, scrollPercent)));
    
    setProgress(currentProgress);
  }, []);

  // Выход из читалки
  const handleExit = useCallback(async () => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
    }
    
    // Сохраняем финальный прогресс
    if (contentRef.current) {
      const element = contentRef.current;
      const scrollPercent = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
      const finalProgress = Math.floor(Math.min(99, Math.max(0, scrollPercent)));
      await saveProgress(finalProgress);
    }
    
    navigate(`/book/${id}`);
  }, [id, navigate, saveProgress]);

  if (loading) return <div className="loading">Загрузка книги...</div>;
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