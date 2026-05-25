import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Feed() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/books`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBooks(response.data);
      } catch (err) {
        console.error('Error fetching books:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Загрузка книг...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>📚 Лента книг</h2>
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {books.map(book => (
          <Link to={`/book/${book.id}`} key={book.id} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}>
              <img 
                src={book.cover_url || 'https://via.placeholder.com/200x300?text=No+Cover'} 
                alt={book.title}
                style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '4px' }}
              />
              <h3 style={{ margin: '10px 0 5px' }}>{book.title}</h3>
              <p style={{ color: '#666', margin: 0 }}>{book.author}</p>
              <p style={{ color: '#888', fontSize: '14px' }}>{book.publication_year}</p>
              <p>⭐ {book.rating_avg || 'Нет оценок'}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}