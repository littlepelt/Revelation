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
    <div className="container" style={{ padding: '20px 0' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px', fontWeight: '600' }}>Лента книг</h1>
      <div style={{ 
        display: 'grid', 
        gap: '24px', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' 
      }}>
        {books.map(book => (
          <Link to={`/book/${book.id}`} key={book.id} style={{ textDecoration: 'none' }}>
            <div className="book-card">
              <img 
                src={book.cover_url || 'https://via.placeholder.com/300x450?text=No+Cover'} 
                alt={book.title}
                style={{ width: '100%', height: '320px', objectFit: 'cover' }}
              />
              <div style={{ padding: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: '#1A1A1A' }}>
                  {book.title}
                </h3>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>{book.author}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#888', fontSize: '13px' }}>{book.publication_year}</span>
                  <span style={{ color: '#003BFF', fontWeight: '500', fontSize: '14px' }}>
                    ★ {book.rating_avg || 'Нет оценок'}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}