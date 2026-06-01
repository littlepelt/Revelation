const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

// Middleware для проверки прав администратора
const isAdmin = async (req, res, next) => {
  const userId = req.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    if (!result.rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  } catch (err) {
    console.error('Admin check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ============================================
// АДМИН-МАРШРУТЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ
// ============================================

router.get('/users', isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, avatar_url, is_admin, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/users/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const currentUser = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
    if (currentUser.rows[0]?.is_admin && parseInt(id) === req.userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    const userReviews = await pool.query('SELECT book_id FROM reviews WHERE user_id = $1', [id]);
    
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    
    for (const review of userReviews.rows) {
      await pool.query(`
        UPDATE books 
        SET rating_avg = (
          SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE book_id = $1
        ),
        rating_count = (
          SELECT COUNT(*) FROM reviews WHERE book_id = $1
        )
        WHERE id = $1
      `, [review.book_id]);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// АДМИН-МАРШРУТЫ ДЛЯ ОТЗЫВОВ
// ============================================

router.get('/reviews', isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.username as user_username,
        b.title as book_title
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN books b ON r.book_id = b.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/reviews/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const reviewResult = await pool.query('SELECT book_id FROM reviews WHERE id = $1', [id]);
    const bookId = reviewResult.rows[0]?.book_id;
    
    await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
    
    if (bookId) {
      await pool.query(`
        UPDATE books 
        SET rating_avg = (
          SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE book_id = $1
        ),
        rating_count = (
          SELECT COUNT(*) FROM reviews WHERE book_id = $1
        )
        WHERE id = $1
      `, [bookId]);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// АДМИН-МАРШРУТЫ ДЛЯ КНИГ
// ============================================

router.post('/books', isAdmin, async (req, res) => {
  const { title, author, description, publication_year, cover_url, file_url, tags } = req.body;
  
  console.log('Creating book with data:', { title, author, description, publication_year, cover_url, file_url, tags });
  
  if (!title || !author) {
    return res.status(400).json({ error: 'Title and author are required' });
  }
  
  try {
    const result = await pool.query(`
      INSERT INTO books (title, author, description, publication_year, cover_url, file_path, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [title, author, description, publication_year, cover_url, file_url, tags]);
    
    console.log('Book created:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating book:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/books/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, author, description, publication_year, cover_url, file_url, tags } = req.body;
  
  try {
    const result = await pool.query(`
      UPDATE books 
      SET title = $1, author = $2, description = $3, publication_year = $4, cover_url = $5, file_path = $6, tags = $7
      WHERE id = $8
      RETURNING *
    `, [title, author, description, publication_year, cover_url, file_url, tags, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating book:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/books/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query('DELETE FROM reviews WHERE book_id = $1', [id]);
    await pool.query('DELETE FROM user_book_status WHERE book_id = $1', [id]);
    await pool.query('DELETE FROM books WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;