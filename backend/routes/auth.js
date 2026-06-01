const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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

// Регистрация
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );
    
    const token = jwt.sign(
      { userId: result.rows[0].id, username: result.rows[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ user: result.rows[0], token });
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// Логин
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      user: { id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url }, 
      token 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Middleware для проверки токена (только для защищённых маршрутов внутри auth)
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Получить текущего пользователя (защищённый)
router.get('/me', authMiddleware, async (req, res) => {
  const userId = req.userId;
  
  try {
    const result = await pool.query(
      'SELECT id, username, email, avatar_url, created_at FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить пользователя по username (публичный)
router.get('/user/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT id, username, avatar_url, created_at FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить книги пользователя по полке (публичный)
router.get('/user/:username/shelf/:shelf', async (req, res) => {
  const { username, shelf } = req.params;
  const validShelves = ['reading', 'read', 'want_to_read'];
  
  if (!validShelves.includes(shelf)) {
    return res.status(400).json({ error: 'Invalid shelf' });
  }
  
  try {
    const userResult = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Получаем книги с полки, рейтинг берём из отзывов
    const booksResult = await pool.query(`
      SELECT 
        b.id, 
        b.title, 
        b.author, 
        b.cover_url, 
        b.publication_year,
        COALESCE(r.rating, 0) as user_rating,
        ubs.updated_at
      FROM user_book_status ubs
      JOIN books b ON ubs.book_id = b.id
      LEFT JOIN reviews r ON r.user_id = ubs.user_id AND r.book_id = ubs.book_id
      WHERE ubs.user_id = $1 AND ubs.status = $2
      ORDER BY ubs.updated_at DESC
    `, [userId, shelf]);
    
    res.json(booksResult.rows);
  } catch (err) {
    console.error('Error fetching shelf:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Обновить профиль
router.put('/profile', authMiddleware, async (req, res) => {
  const userId = req.userId;
  const { username, avatar_url } = req.body;
  
  console.log('Updating profile for user:', userId);
  console.log('New username:', username);
  console.log('New avatar_url:', avatar_url);
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await pool.query(
      'UPDATE users SET username = $1, avatar_url = $2 WHERE id = $3 RETURNING id, username, email, avatar_url, created_at',
      [username, avatar_url, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('Profile updated successfully:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// В конец файла добавить:

// ============================================
// АДМИН-МАРШРУТЫ
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

// Получить всех пользователей (только для админа)
router.get('/admin/users', authMiddleware, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, avatar_url, is_admin, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Удалить пользователя (только для админа)
router.delete('/admin/users/:id', authMiddleware, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Проверяем, не удаляем ли мы самого админа
    const currentUser = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
    if (currentUser.rows[0]?.is_admin && parseInt(id) === req.userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить все отзывы (только для админа)
router.get('/admin/reviews', authMiddleware, isAdmin, async (req, res) => {
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

// Удалить отзыв (только для админа)
router.delete('/admin/reviews/:id', authMiddleware, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Получаем book_id для обновления рейтинга
    const reviewResult = await pool.query('SELECT book_id FROM reviews WHERE id = $1', [id]);
    const bookId = reviewResult.rows[0]?.book_id;
    
    await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
    
    // Обновляем средний рейтинг книги
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

module.exports = router;