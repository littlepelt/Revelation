import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function BookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState(null);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/books/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBook(response.data);
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

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Загрузка книги...</div>;
  if (!book) return null;

  return (
    <div className="container" style={{ padding: '20px 0' }}>
      <button onClick={() => navigate('/')} className="btn-outline" style={{ marginBottom: '24px' }}>
        ← Назад
      </button>
      
      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        <img 
          src={book.cover_url || 'https://via.placeholder.com/300x450?text=No+Cover'} 
          alt={book.title}
          style={{ width: '280px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        />
        
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '32px', marginBottom: '8px', fontWeight: '600' }}>{book.title}</h1>
          <h2 style={{ fontSize: '20px', color: '#666', marginBottom: '16px', fontWeight: '400' }}>{book.author}</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <span style={{ background: '#F5F5F5', padding: '4px 12px', borderRadius: '20px', fontSize: '14px' }}>
              {book.publication_year}
            </span>
            <span style={{ marginLeft: '12px', color: '#003BFF', fontWeight: '500' }}>
              ★ {book.rating_avg || 'Нет оценок'} ({book.rating_count || 0} оценок)
            </span>
          </div>
          
          <div style={{ margin: '24px 0', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              className={userStatus === 'reading' ? 'btn-primary' : 'btn-outline'}
              onClick={() => setUserStatus('reading')}
            >
              Читаю
            </button>
            <button 
              className={userStatus === 'read' ? 'btn-primary' : 'btn-outline'}
              onClick={() => setUserStatus('read')}
            >
              Прочитано
            </button>
            <button 
              className={userStatus === 'want_to_read' ? 'btn-primary' : 'btn-outline'}
              onClick={() => setUserStatus('want_to_read')}
            >
              Буду читать
            </button>
          </div>
          
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '12px', fontWeight: '500' }}>Описание</h3>
            <p style={{ lineHeight: '1.6', color: '#333' }}>{book.description || 'Описание отсутствует'}</p>
          </div>
          
          <button 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '32px', padding: '14px' }}
            onClick={() => navigate(`/read/${id}`)}
          >
            Читать книгу
          </button>
        </div>
      </div>
    </div>
  );
}