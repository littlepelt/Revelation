require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статическая папка для загруженных файлов
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const uploadRoutes = require('./routes/upload');
const authMiddleware = require('./middleware/auth');

// ============================================
// Публичные маршруты (без middleware)
// ============================================
app.use('/api/auth', authRoutes);

// Публичные маршруты для книг (например, получение отзывов)
app.get('/api/books/:id/reviews', async (req, res) => {
  const { Pool } = require('pg');
  const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });
  
  const { id } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.id as user_id,
        u.username,
        u.avatar_url
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.book_id = $1
      ORDER BY r.created_at DESC
    `, [id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Защищённые маршруты (с middleware)
// ============================================
app.use('/api/books', authMiddleware, booksRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/', (req, res) => {
  res.json({ message: 'Book Social API is running' });
});

// Синхронизация книг
const { syncBooks } = require('./utils/bookParser');
syncBooks().catch(console.error);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});