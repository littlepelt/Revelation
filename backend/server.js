require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const booksRoutes = require('./routes/books');
app.use('/api/books', booksRoutes);

const authMiddleware = require('./middleware/auth');
app.use('/api/books', authMiddleware, booksRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Book Social API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});