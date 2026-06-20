const express = require('express');
const { Pool } = require('pg');
const { getBookTextAsync } = require('../utils/bookParser');
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
  if (!matches || matches.length === 0) return [text];
  return matches;
}

// ============================================
// 1. ПОЛУЧИТЬ ВСЕ КНИГИ
// ============================================
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

// ============================================
// 2. ПОЛУЧИТЬ КНИГУ ПО ID
// ============================================
router.get('/:id', async (req, res) => {
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

// ============================================
// 3. ПОЛУЧИТЬ СТРАНИЦУ КНИГИ
// ============================================
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
    const fullText = await getBookTextAsync(book.file_path);
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

// ============================================
// 4. СОХРАНИТЬ ПРОГРЕСС
// ============================================
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
    res.json({ success: true, progress: position });
  } catch (err) {
    console.error('Error saving progress:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// ============================================
// 5. УСТАНОВИТЬ СТАТУС КНИГИ
// ============================================
router.post('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (status === null) {
    try {
      await pool.query('DELETE FROM user_book_status WHERE user_id = $1 AND book_id = $2', [userId, id]);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
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

// ============================================
// 6. ПОЛУЧИТЬ СТАТУС КНИГИ
// ============================================
router.get('/:id/status', async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await pool.query('SELECT status FROM user_book_status WHERE user_id = $1 AND book_id = $2', [userId, id]);
    res.json({ status: result.rows[0]?.status || null });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// 7. ПОЛУЧИТЬ ПРОГРЕСС
// ============================================
router.get('/:id/progress', async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await pool.query('SELECT last_read_position FROM user_book_status WHERE user_id = $1 AND book_id = $2', [userId, id]);
    const progress = result.rows[0]?.last_read_position || '1.0';
    res.json({ progress });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// 8. ПОЛУЧИТЬ ОТЗЫВЫ ДЛЯ КНИГИ (С ЛАЙКАМИ)
// ============================================
router.get('/:id/reviews', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        r.likes,
        r.dislikes,
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
// 9. ДОБАВИТЬ ОТЗЫВ
// ============================================
router.post('/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    await pool.query('DELETE FROM reviews WHERE user_id = $1 AND book_id = $2', [userId, id]);
    await pool.query(`
      INSERT INTO reviews (user_id, book_id, rating, comment, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [userId, id, rating, comment || null]);
    
    await pool.query(`
      UPDATE books 
      SET rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE book_id = $1),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE book_id = $1)
      WHERE id = $1
    `, [id]);
    
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

// ============================================
// 10. УДАЛИТЬ ОТЗЫВ
// ============================================
router.delete('/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    await pool.query('DELETE FROM reviews WHERE user_id = $1 AND book_id = $2', [userId, id]);
    await pool.query(`
      UPDATE books 
      SET rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE book_id = $1),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE book_id = $1)
      WHERE id = $1
    `, [id]);
    await pool.query('UPDATE user_book_status SET rating = NULL WHERE user_id = $1 AND book_id = $2', [userId, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ============================================
// 11. ПОСЛЕДНИЕ ОТЗЫВЫ ДЛЯ ГЛАВНОЙ
// ============================================
router.get('/reviews/latest', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        r.likes,
        r.dislikes,
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

// ============================================
// 12. КНИГИ ПО ТЕГУ
// ============================================
router.get('/tag/:tag', async (req, res) => {
  const { tag } = req.params;
  const tagMapping = {
    'classic': 'Классика',
    'psychological': 'Психологический роман',
    'russian': 'Русская литература',
    'english': 'Английская литература',
    'german': 'Немецкая литература',
    'japanese': 'Японская литература',
    'italian': 'Итальянская литература',
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
      FROM books WHERE tags LIKE $1 ORDER BY id
    `, [`%${russianTag}%`]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// 13. ПОСТАВИТЬ ЛАЙК/ДИЗЛАЙК
// ============================================
router.post('/reviews/:reviewId/react', async (req, res) => {
  const { reviewId } = req.params;
  const { reaction } = req.body;
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const existing = await pool.query(
      'SELECT reaction_type FROM review_reactions WHERE user_id = $1 AND review_id = $2',
      [userId, reviewId]
    );
    
    await pool.query('BEGIN');
    
    if (existing.rows.length > 0) {
      const oldReaction = existing.rows[0].reaction_type;
      if (oldReaction === reaction) {
        await pool.query('DELETE FROM review_reactions WHERE user_id = $1 AND review_id = $2', [userId, reviewId]);
        if (reaction === 'like') {
          await pool.query('UPDATE reviews SET likes = likes - 1 WHERE id = $1', [reviewId]);
        } else {
          await pool.query('UPDATE reviews SET dislikes = dislikes - 1 WHERE id = $1', [reviewId]);
        }
      } else {
        await pool.query('UPDATE review_reactions SET reaction_type = $1 WHERE user_id = $2 AND review_id = $3', [reaction, userId, reviewId]);
        if (reaction === 'like') {
          await pool.query('UPDATE reviews SET likes = likes + 1, dislikes = dislikes - 1 WHERE id = $1', [reviewId]);
        } else {
          await pool.query('UPDATE reviews SET likes = likes - 1, dislikes = dislikes + 1 WHERE id = $1', [reviewId]);
        }
      }
    } else {
      await pool.query('INSERT INTO review_reactions (user_id, review_id, reaction_type) VALUES ($1, $2, $3)', [userId, reviewId, reaction]);
      if (reaction === 'like') {
        await pool.query('UPDATE reviews SET likes = likes + 1 WHERE id = $1', [reviewId]);
      } else {
        await pool.query('UPDATE reviews SET dislikes = dislikes + 1 WHERE id = $1', [reviewId]);
      }
    }
    
    await pool.query('COMMIT');
    const result = await pool.query('SELECT likes, dislikes FROM reviews WHERE id = $1', [reviewId]);
    res.json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error processing reaction:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// 14. ПОЛУЧИТЬ РЕАКЦИЮ ПОЛЬЗОВАТЕЛЯ
// ============================================
router.get('/reviews/:reviewId/reaction', async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.userId;
  if (!userId) return res.json({ reaction: null });
  try {
    const result = await pool.query('SELECT reaction_type FROM review_reactions WHERE user_id = $1 AND review_id = $2', [userId, reviewId]);
    res.json({ reaction: result.rows[0]?.reaction_type || null });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;