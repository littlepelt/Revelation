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

// ============================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: разбить текст на предложения
// ============================================
function splitIntoSentences(text) {
  const sentenceRegex = /[^.!?]+[.!?]+["']?\s*/g;
  const matches = text.match(sentenceRegex);
  
  if (!matches || matches.length === 0) {
    return [text];
  }
  
  return matches;
}

// ============================================
// 1. ПОЛУЧИТЬ ВСЕ КНИГИ (для ленты)
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
// 2. ПОЛУЧИТЬ КНИГУ ПО ID (без текста)
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
// 3. ПОЛУЧИТЬ СТРАНИЦУ КНИГИ (разбивка по предложениям)
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

// ============================================
// 4. СОХРАНИТЬ ПРОГРЕСС (только номер страницы)
// ============================================
router.post('/:id/progress', async (req, res) => {
  const { id } = req.params;
  const { position } = req.body;
  const userId = req.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!position || typeof position !== 'string') {
    return res.status(400).json({ error: 'Invalid position format' });
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
// 5. УСТАНОВИТЬ СТАТУС КНИГИ (read/reading/want_to_read или null)
// ============================================
router.post('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Если status === null — удаляем только статус, НЕ удаляем отзыв
  if (status === null) {
    try {
      await pool.query(
        'DELETE FROM user_book_status WHERE user_id = $1 AND book_id = $2',
        [userId, id]
      );
      return res.json({ success: true });
    } catch (err) {
      console.error('Error deleting status:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  if (!status || !['read', 'reading', 'want_to_read'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
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
// 6. ПОЛУЧИТЬ СТАТУС КНИГИ ДЛЯ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
// ============================================
router.get('/:id/status', async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await pool.query(`
      SELECT status 
      FROM user_book_status 
      WHERE user_id = $1 AND book_id = $2
    `, [userId, id]);
    
    res.json({ status: result.rows[0]?.status || null });
  } catch (err) {
    console.error('Error fetching status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// 7. ПОЛУЧИТЬ ПРОГРЕСС КНИГИ ДЛЯ ПОЛЬЗОВАТЕЛЯ
// ============================================
router.get('/:id/progress', async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await pool.query(`
      SELECT last_read_position 
      FROM user_book_status 
      WHERE user_id = $1 AND book_id = $2
    `, [userId, id]);
    
    const progress = result.rows[0]?.last_read_position || '1.0';
    res.json({ progress: progress });
  } catch (err) {
    console.error('Error fetching progress:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// 8. ПОЛУЧИТЬ ОТЗЫВЫ ДЛЯ КНИГИ
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
      SET rating_avg = (
        SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE book_id = $1
      ),
      rating_count = (
        SELECT COUNT(*) FROM reviews WHERE book_id = $1
      )
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

// ============================================
// 10. УДАЛИТЬ ОТЗЫВ
// ============================================
router.delete('/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    await pool.query(
      'DELETE FROM reviews WHERE user_id = $1 AND book_id = $2',
      [userId, id]
    );
    
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

// ============================================
// 12. ПОЛУЧИТЬ КНИГИ ПО ТЕГУ
// ============================================
router.get('/tag/:tag', async (req, res) => {
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

// В конец файла добавить:

// ============================================
// АДМИН-МАРШРУТЫ ДЛЯ КНИГ
// ============================================

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

// Создать книгу
router.post('/admin/books', authMiddleware, isAdmin, async (req, res) => {
  const { title, author, description, publication_year, cover_url, file_url, tags } = req.body;
  
  if (!title || !author) {
    return res.status(400).json({ error: 'Title and author are required' });
  }
  
  try {
    const result = await pool.query(`
      INSERT INTO books (title, author, description, publication_year, cover_url, file_path, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [title, author, description, publication_year, cover_url, file_url, tags]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating book:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Обновить книгу
router.put('/admin/books/:id', authMiddleware, isAdmin, async (req, res) => {
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

// Удалить книгу
router.delete('/admin/books/:id', authMiddleware, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Удаляем связанные отзывы и статусы
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