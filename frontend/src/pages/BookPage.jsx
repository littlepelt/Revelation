import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function BookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Загрузка книги...</div>;
  if (!book) return null;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>← Назад</button>
      
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        <img 
          src={book.cover_url || 'https://via.placeholder.com/300x450?text=No+Cover'} 
          alt={book.title}
          style={{ width: '250px', objectFit: 'cover', borderRadius: '8px' }}
        />
        
        <div style={{ flex: 1 }}>
          <h1>{book.title}</h1>
          <h3>{book.author}</h3>
          <p><strong>Год публикации:</strong> {book.publication_year}</p>
          <p><strong>Рейтинг:</strong> ⭐ {book.rating_avg || 'Нет оценок'} ({book.rating_count || 0} оценок)</p>
          
          <div style={{ margin: '20px 0' }}>
            <button 
              onClick={() => alert('Книга будет добавлена в "Читаю"')}
              style={{ padding: '10px 20px', marginRight: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              📖 Читаю
            </button>
            <button 
              onClick={() => alert('Книга будет добавлена в "Прочитано"')}
              style={{ padding: '10px 20px', marginRight: '10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              ✅ Прочитано
            </button>
            <button 
              onClick={() => alert('Книга будет добавлена в "Буду читать"')}
              style={{ padding: '10px 20px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              📚 Буду читать
            </button>
          </div>
          
          <div style={{ marginTop: '30px' }}>
            <h3>Описание</h3>
            <p>{book.description || 'Описание отсутствует'}</p>
          </div>
          
          <button 
            onClick={() => alert('Читательский интерфейс будет здесь')}
            style={{ padding: '15px 30px', marginTop: '20px', background: '#000', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%' }}
          >
            📖 Читать книгу
          </button>
        </div>
      </div>
    </div>
  );
}