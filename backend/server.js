require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const authMiddleware = require('./middleware/auth');

const uploadRoutes = require('./routes/upload');
app.use('/api/upload', authMiddleware, uploadRoutes);
app.use('/uploads', express.static('uploads'));

// ============================================
// Все маршруты auth (но middleware применяем только к защищённым)
// ============================================
app.use('/api/auth', authRoutes);

// Защищённые маршруты (только для книг)
app.use('/api/books', authMiddleware, booksRoutes);

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