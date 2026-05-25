require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { syncBooks } = require('./utils/bookParser');
const app = express();

app.use(cors());
app.use(express.json());

syncBooks().catch(console.error);

const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
app.use('/api/books', authMiddleware, booksRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);



app.get('/', (req, res) => {
  res.json({ message: 'Book Social API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});