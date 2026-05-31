const express = require('express');
const { Pool } = require('pg');
const { getBookText } = require('../utils/bookParser');
const router = express.Router();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const SENTENCES_PER_PAGE = 30;

function splitIntoSentences(text) {
  const sentenceRegex = /[^.!?]+[.!?]+["']?\s*/g;
  const matches = text.match(sentenceRegex);
  if (!matches || matches.length === 0) {
    return [text];
  }
  return matches;
}

// Получить страницу книги (требует авторизации для прогресса)
router.get('/:id/page/:pageNum', async (req, res) => {
  const { id, pageNum } = req.params;
  const userId = req.userId;
  const pageNumber = parseInt(pageNum);
  
  try {
    const bookResult = await pool.query(`
      SELECT title, author, file_path 
      FROM books 
      WHERE id = $1
    `, [id]);
    
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    const book = bookResult.rows[0];
    const fullText = getBookText(book.file_path);
    
    const sentences = splitIntoSentences(fullText);
    const totalSentences = sentences.length;
    const totalPages = Math.ceil(totalSentences / SENTENCES_PER_PAGE);
    
    if (pageNumber < 1 || pageNumber > totalPages) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    const startIdx = (pageNumber - 1) * SENTENCES_PER_PAGE;
    const endIdx = Math.min(startIdx + SENTENCES_PER_PAGE, totalSentences);
    const pageSentences = sentences.slice(startIdx, endIdx);
    const pageText = pageSentences.join('');
    
    let savedPage = 1;
    
    if (userId) {
      const progressResult = await pool.query(`
        SELECT last_read_position 
        FROM user_book_status 
        WHERE user_id = $1 AND book_id = $2
      `, [userId, id]);
      
      if (progressResult.rows[0] && progressResult.rows[0].last_read_position) {
        const rawProgress = progressResult.rows[0].last_read_position;
        const progressStr = String(rawProgress);
        const parts = progressStr.split('.');
        savedPage = parseInt(parts[0]) || 1;
      }
    }
    
    res.json({
      id: parseInt(id),
      title: book.title,
      author: book.author,
      pageNumber: pageNumber,
      totalPages: totalPages,
      text: pageText,
      savedPage: savedPage
    });
  } catch (err) {
    console.error('Error fetching page:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Сохранить прогресс
router.post('/:id/progress', async (req, res) => {
  const { id } = req.params;
  const { position } = req.body;
  const userId = req.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    await pool.query(`
      INSERT INTO user_book_status (user_id, book_id, last_read_position, updated_at, status)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'reading')
      ON CONFLICT (user_id, book_id) 
      DO UPDATE SET last_read_position = $3, updated_at = CURRENT_TIMESTAMP, status = 'reading'
    `, [userId, id, position]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving progress:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// Установить статус книги
router.post('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.userId;
  
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

// Получить статус книги
router.get('/:id/status', async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await pool.query(`
      SELECT status FROM user_book_status WHERE user_id = $1 AND book_id = $2
    `, [userId, id]);
    
    res.json({ status: result.rows[0]?.status || null });
  } catch (err) {
    console.error('Error fetching status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить прогресс
router.get('/:id/progress', async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await pool.query(`
      SELECT last_read_position FROM user_book_status WHERE user_id = $1 AND book_id = $2
    `, [userId, id]);
    
    const progress = result.rows[0]?.last_read_position || '1.0';
    res.json({ progress });
  } catch (err) {
    console.error('Error fetching progress:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Добавить отзыв
router.post('/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userId = req.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Invalid rating' });
  }
  
  try {
    // Удаляем старый отзыв
    await pool.query('DELETE FROM reviews WHERE user_id = $1 AND book_id = $2', [userId, id]);
    
    // Добавляем новый
    await pool.query(`
      INSERT INTO reviews (user_id, book_id, rating, comment, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [userId, id, rating, comment || null]);
    
    // Обновляем средний рейтинг книги
    await pool.query(`
      UPDATE books 
      SET rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE book_id = $1),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE book_id = $1)
      WHERE id = $1
    `, [id]);
    
    // Обновляем user_book_status
    await pool.query(`
      INSERT INTO user_book_status (user_id, book_id, rating, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, book_id) 
      DO UPDATE SET rating = $3, updated_at = CURRENT_TIMESTAMP
    `, [userId, id, rating]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving review:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

router.delete('/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Удаляем отзыв
    await pool.query(
      'DELETE FROM reviews WHERE user_id = $1 AND book_id = $2',
      [userId, id]
    );
    
    // Обновляем средний рейтинг книги
    await pool.query(`
      UPDATE books 
      SET rating_avg = (
        SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE book_id = $1
      ),
      rating_count = (
        SELECT COUNT(*) FROM reviews WHERE book_id = $1
      )
      WHERE id = $1
    `, [id]);
    
    // Обнуляем рейтинг в user_book_status
    await pool.query(`
      UPDATE user_book_status 
      SET rating = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND book_id = $2
    `, [userId, id]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ============================================
// 11. ПОЛУЧИТЬ ПОСЛЕДНИЕ ОТЗЫВЫ ДЛЯ ГЛАВНОЙ СТРАНИЦЫ
// ============================================
router.get('/reviews/latest', async (req, res) => {
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

module.exports = router;