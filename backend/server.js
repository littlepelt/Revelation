require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Маршруты (подключаем ДО middleware, чтобы login/register были доступны)
const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const authMiddleware = require('./middleware/auth');

// Публичные маршруты (без middleware)
app.use('/api/auth', authRoutes);

// Защищённые маршруты (с middleware)
app.use('/api/books', authMiddleware, booksRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/', (req, res) => {
  res.json({ message: 'Book Social API is running' });
});

// Синхронизация книг (не блокирует запуск)
const { syncBooks } = require('./utils/bookParser');
syncBooks().catch(console.error);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});