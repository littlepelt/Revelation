require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статическая папка для загруженных файлов
app.use('/avatars', express.static(path.join(__dirname, 'data/uploads')));
app.use('/covers', express.static(path.join(__dirname, 'books/covers')));

const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const uploadRoutes = require('./routes/upload');
const authMiddleware = require('./middleware/auth');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

// ============================================
// Публичные маршруты (без middleware)
// ============================================
app.use('/api/auth', authRoutes);

// Публичные GET маршруты для книг
app.get('/api/books', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, author, cover_url, rating_avg, publication_year 
      FROM books 
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/books/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT id, title, author, description, cover_url, publication_year, rating_avg, rating_count, tags
      FROM books 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching book:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/books/:id/reviews', async (req, res) => {
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

app.get('/api/books/reviews/latest', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        r.book_id,
        u.id as user_id,
        u.username,
        u.avatar_url,
        b.title as book_title,
        b.author as book_author,
        b.cover_url as book_cover_url
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN books b ON r.book_id = b.id
      ORDER BY r.created_at DESC
      LIMIT 3
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching latest reviews:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.get('/api/check-tags', async (req, res) => {
  const { Pool } = require('pg');
  const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'books'
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Публичные GET маршруты для книг по тегам
app.get('/api/books/tag/:tag', async (req, res) => {
  const { tag } = req.params;
  const { Pool } = require('pg');
  const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });
  
  const tagMapping = {
    'classic': 'Классика',
    'psychological': 'Психологический роман',
    'russian': 'Русская литература',
    'english': 'Английская литература',
    'drama': 'Драма',
    'romance': 'Роман',
    'philosophy': 'Философия',
    'adventure': 'Приключения',
    'fantasy': 'Фантастика',
    'detective': 'Детектив'
  };
  
  const russianTag = tagMapping[tag] || tag;
  
  try {
    const result = await pool.query(`
      SELECT id, title, author, cover_url, rating_avg, publication_year
      FROM books 
      WHERE tags LIKE $1
      ORDER BY id
    `, [`%${russianTag}%`]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching books by tag:', err);
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