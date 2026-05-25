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

// Получить все книги (для ленты)
router.get('/', async (req, res) => {
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

// Получить одну книгу по ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT id, title, author, description, cover_url, publication_year, rating_avg, rating_count 
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

// (Позже) Установить статус книги для пользователя
router.post('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user?.userId; // Будет после добавления middleware для JWT
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    await pool.query(`
      INSERT INTO user_book_status (user_id, book_id, status, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, book_id) 
      DO UPDATE SET status = $3, updated_at = CURRENT_TIMESTAMP
    `, [userId, id, status]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;