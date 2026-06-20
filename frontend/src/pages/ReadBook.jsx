import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import ReaderSettings from '../components/ReaderSettings';
import './ReadBook.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SETTINGS_STORAGE_KEY = 'reader_settings';

const defaultSettings = {
  fontSize: 'normal',
  fontWeight: 'normal',
  lineHeight: 'normal',
  textAlign: 'justify'
};

// Ripple эффект для кнопок
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

export default function ReadBook() {
  const { id, pageNum } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPageChanging, setIsPageChanging] = useState(false);
  const [currentPage, setCurrentPage] = useState(parseInt(pageNum) || 1);
  const [totalPages, setTotalPages] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [readerSettings, setReaderSettings] = useState(defaultSettings);
  const [uiVisible, setUiVisible] = useState(true);
  const contentRef = useRef(null);

  // Загрузка сохранённых настроек
  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setReaderSettings({ ...defaultSettings, ...parsed });
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
  }, []);

  // Загрузка страницы
  const fetchPage = useCallback(async (page) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/books/${id}/page/${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data;
      setBook(prev => ({ ...prev, ...data }));
      setTotalPages(data.totalPages);
      
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      }, 0);
    } catch (err) {
      console.error('Ошибка:', err);
      navigate('/');
    } finally {
      setLoading(false);
      setIsPageChanging(false);
    }
  }, [id, navigate]);

  // Загрузка при монтировании
  useEffect(() => {
    setLoading(true);
    fetchPage(currentPage);
    
    document.body.classList.add('read-mode');
    return () => {
      document.body.classList.remove('read-mode');
    };
  }, [currentPage, fetchPage]);

  // Сохранение прогресса
  const saveProgress = async (page) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/books/${id}/progress`, 
        { position: `${page}.0` },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Ошибка сохранения:', err);
    }
  };

  // Переход на предыдущую страницу
  const goToPrevPage = () => {
    if (currentPage > 1 && !isPageChanging) {
      setIsPageChanging(true);
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      saveProgress(newPage);
    }
  };

  // Переход на следующую страницу
  const goToNextPage = () => {
    if (currentPage < totalPages && !isPageChanging) {
      setIsPageChanging(true);
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      saveProgress(newPage);
    }
  };

  // Выход
  const handleExit = async () => {
    await saveProgress(currentPage);
    navigate(`/book/${id}`);
  };

  // Применение настроек из модалки
  const handleApplySettings = (newSettings) => {
    setReaderSettings(newSettings);
  };

  // Переключение видимости UI (ручное управление)
  const toggleUi = () => {
    setUiVisible(!uiVisible);
  };

  // Сохранение при закрытии
  useEffect(() => {
    const handleBeforeUnload = () => {
      const token = localStorage.getItem('token');
      if (token) {
        const url = `${API_URL}/api/books/${id}/progress`;
        const data = JSON.stringify({ position: `${currentPage}.0` });
        navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }));
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [id, currentPage]);

  // Генерация классов для настроек
  const getContentClasses = () => {
    const classes = ['read-content'];
    if (isPageChanging) classes.push('fade-out');
    classes.push(`font-size-${readerSettings.fontSize}`);
    classes.push(`font-weight-${readerSettings.fontWeight}`);
    classes.push(`line-height-${readerSettings.lineHeight}`);
    classes.push(`text-align-${readerSettings.textAlign}`);
    return classes.join(' ');
  };

  if (loading && !book) {
    return (
      <div className="read-container">
        <div className="read-header visible">
          <button className="back-btn" onClick={handleExit} onMouseDown={createRipple}>
            <ArrowLeft size={20} />
          </button>
          <div className="read-title">
            <h2>Загрузка...</h2>
          </div>
        </div>
        <div className="read-content loading-content">
          <div className="loader">Загрузка текста...</div>
        </div>
        <div className="read-footer visible">
          <button className="nav-btn disabled" disabled>
            <ChevronLeft size={20} />
          </button>
          <div className="page-info">-- / --</div>
          <button className="nav-btn disabled" disabled>
            <ChevronRight size={20} />
          </button>
          <button className="settings-btn" onMouseDown={createRipple}>
            <Settings size={20} />
          </button>
        </div>
      </div>
    );
  }

  if (!book) return null;

  const paragraphs = book.text?.split('\n') || [];

  return (
    <div className="read-container">
      <div className={`read-header ${uiVisible ? 'visible' : 'hidden'}`}>
        <button className="back-btn" onClick={handleExit} onMouseDown={createRipple}>
          <ArrowLeft size={20} />
        </button>
        <div className="read-title">
          <h2>{book.title}</h2>
          <p>{book.author}</p>
        </div>
      </div>

      <div 
        className={getContentClasses()} 
        ref={contentRef}
        onClick={toggleUi}
      >
        {isPageChanging ? (
          <div className="page-loader">
            <div className="loader">Загрузка страницы...</div>
          </div>
        ) : (
          paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))
        )}
      </div>

      <div className={`read-footer ${uiVisible ? 'visible' : 'hidden'}`}>
        <button 
          className={`nav-btn ${currentPage === 1 || isPageChanging ? 'disabled' : ''}`}
          onClick={goToPrevPage}
          disabled={currentPage === 1 || isPageChanging}
          onMouseDown={createRipple}
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="page-info">
          {currentPage} / {totalPages}
        </div>
        
        <button 
          className={`nav-btn ${currentPage === totalPages || isPageChanging ? 'disabled' : ''}`}
          onClick={goToNextPage}
          disabled={currentPage === totalPages || isPageChanging}
          onMouseDown={createRipple}
        >
          <ChevronRight size={20} />
        </button>
        
        <button 
          className="settings-btn" 
          onClick={() => setShowSettings(true)}
          onMouseDown={createRipple}
        >
          <Settings size={20} />
        </button>
      </div>

      {showSettings && (
        <ReaderSettings 
          onClose={() => setShowSettings(false)}
          onApply={handleApplySettings}
        />
      )}
    </div>
  );
}