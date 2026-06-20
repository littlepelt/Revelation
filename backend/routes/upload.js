const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Папка для загрузок — используем ту же папку books, что уже есть в проекте
const UPLOADS_DIR = path.join(__dirname, '..', 'books', '_uploads');
const COVERS_DIR = path.join(UPLOADS_DIR, 'covers');
const TEXTS_DIR = path.join(UPLOADS_DIR, 'texts');

// Создаём папки, если их нет
[UPLOADS_DIR, COVERS_DIR, TEXTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isText = file.mimetype === 'text/plain';
    cb(null, isText ? TEXTS_DIR : COVERS_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-${random}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'text/plain'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images and txt files allowed'), false);
  }
};

const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 }, fileFilter });

// POST /api/upload
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const isText = req.file.mimetype === 'text/plain';
  const subfolder = isText ? 'texts' : 'covers';
  const fileName = req.file.filename;

  // Полный URL — чтобы фронтенд и bookParser могли достать файл
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const fileUrl = `${baseUrl}/api/uploads/${subfolder}/${fileName}`;

  console.log(`✅ File saved: ${fileUrl}`);
  res.json({ url: fileUrl });
});

module.exports = router;
