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
    
    console.log(`✅ New user registered: ${username} (id: ${result.rows[0].id})`);
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
    
    console.log(`✅ User logged in: ${username} (id: ${user.id})`);
    res.json({ 
      user: { id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url }, 
      token 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить текущего пользователя
router.get('/me', async (req, res) => {
  const userId = req.user?.userId;
  
  console.log('🔍 /me called, userId:', userId);
  
  if (!userId) {
    console.log('❌ No userId in token');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await pool.query(
      'SELECT id, username, email, avatar_url, created_at FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found in database:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ User found:', result.rows[0].username);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Обновить профиль
router.put('/profile', async (req, res) => {
  const userId = req.user?.userId;
  const { username, avatar_url } = req.body;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await pool.query(
      'UPDATE users SET username = $1, avatar_url = $2 WHERE id = $3 RETURNING id, username, email, avatar_url, created_at',
      [username, avatar_url, userId]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;