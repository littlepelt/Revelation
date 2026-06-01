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

const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const adminRoutes = require('./routes/admin');
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

app.get('/api/books/tag/:tag', async (req, res) => {
  const { tag } = req.params;
  
  const tagMapping = {
    'classic': 'Классика',
    'psychological': 'Психологический роман',
    'russian': 'Русская литература',
    'english': 'Английская литература',
    'ancient': 'Древняя литература',
    'poem': 'Поэма',
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
// Админ-маршруты (требуют авторизации и прав админа)
// ============================================
app.use('/api/admin', authMiddleware, adminRoutes);

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

app.get('/api/debug-book/:id', async (req, res) => {
  const { id } = req.params;
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
    const result = await pool.query('SELECT id, title, file_path FROM books WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/make-admin', async (req, res) => {
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
    await pool.query("UPDATE users SET is_admin = TRUE WHERE username = 'admin'");
    res.json({ success: true, message: "Admin user updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reset-db', async (req, res) => {
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
    await pool.query('DROP TABLE IF EXISTS review_reactions CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_book_status CASCADE');
    await pool.query('DROP TABLE IF EXISTS reviews CASCADE');
    await pool.query('DROP TABLE IF EXISTS books CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_url TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        description TEXT,
        cover_url TEXT,
        publication_year INTEGER,
        file_path VARCHAR(255),
        tags TEXT,
        rating_avg DECIMAL(3,2) DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        likes INTEGER DEFAULT 0,
        dislikes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE user_book_status (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
        status VARCHAR(20) CHECK (status IN ('read', 'reading', 'want_to_read')),
        last_read_position DECIMAL(5,2) DEFAULT 0,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, book_id)
      );
      
      CREATE TABLE review_reactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
        reaction_type VARCHAR(10) CHECK (reaction_type IN ('like', 'dislike')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, review_id)
      );
    `);
    
    res.json({ success: true, message: 'Database reset complete' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: err.message });
  }
});