import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import './ReadBook.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CHARS_PER_PAGE = 2000;

export default function ReadBook() {
  const { id, pageNum } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(parseInt(pageNum) || 1);
  const [totalPages, setTotalPages] = useState(0);
  const contentRef = useRef(null);
  const restoredRef = useRef(false);

  // Загрузка страницы
  useEffect(() => {
    const fetchPage = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/books/${id}/page/${currentPage}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = response.data;
        setBook(data);
        setTotalPages(data.totalPages);
        
        // Всегда начинаем с 0%
        restoredRef.current = false;
        
      } catch (err) {
        console.error('Ошибка:', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPage();
    document.body.classList.add('read-mode');
    
    return () => {
      document.body.classList.remove('read-mode');
    };
  }, [id, currentPage, navigate]);

  // Скролл всегда в начало при смене страницы
  useEffect(() => {
    if (!loading && contentRef.current) {
      contentRef.current.scrollTop = 0;
      restoredRef.current = true;
    }
  }, [currentPage, loading]);

  // Сохранение прогресса (только номер страницы)
  const saveProgress = async (page) => {
    try {
      const token = localStorage.getItem('token');
      // Сохраняем как "страница.0" (0% всегда)
      const positionValue = `${page}.0`;
      await axios.post(`${API_URL}/api/books/${id}/progress`, 
        { position: positionValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(`💾 Сохранена страница: ${page}`);
    } catch (err) {
      console.error('❌ Ошибка сохранения:', err.response?.status);
    }
  };

  // Навигация по страницам
  const goToPrevPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      saveProgress(newPage);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
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

  // Сохранение при закрытии
  useEffect(() => {
    const handleBeforeUnload = () => {
      const positionValue = `${currentPage}.0`;
      const token = localStorage.getItem('token');
      if (token) {
        const url = `${API_URL}/api/books/${id}/progress`;
        const data = JSON.stringify({ position: positionValue });
        navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }));
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [id, currentPage]);

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!book) return null;

  const paragraphs = book.text?.split('\n') || [];

  return (
    <div className="read-container">
      <div className="read-header">
        <button className="back-btn" onClick={handleExit}>
          <ArrowLeft size={20} />
        </button>
        <div className="read-title">
          <h2>{book.title}</h2>
          <p>{book.author}</p>
        </div>
      </div>

      <div className="read-content" ref={contentRef}>
        {paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      <div className="read-footer">
        <button 
          className={`nav-btn ${currentPage === 1 ? 'disabled' : ''}`}
          onClick={goToPrevPage}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="page-info">
          {currentPage} / {totalPages}
        </div>
        
        <button 
          className={`nav-btn ${currentPage === totalPages ? 'disabled' : ''}`}
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
        >
          <ChevronRight size={20} />
        </button>
        
        <button className="settings-btn">
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}