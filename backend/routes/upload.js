const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Папки для хранения (на уровень выше — backend/data/uploads/)
const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');
const COVERS_DIR = path.join(UPLOADS_DIR, 'covers');
const TEXTS_DIR = path.join(UPLOADS_DIR, 'texts');

// Создаём папки, если их нет
[UPLOADS_DIR, COVERS_DIR, TEXTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer: сохраняем в зависимости от типа файла
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
    cb(new Error('Only images (jpg, png, gif) and txt files allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 МБ
  fileFilter
});

// POST /api/upload — загрузка обложки или текста
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const isText = req.file.mimetype === 'text/plain';
  const subfolder = isText ? 'texts' : 'covers';
  
  // Формируем URL: /api/uploads/covers/файл.jpg или /api/uploads/texts/файл.txt
  const fileUrl = `/api/uploads/${subfolder}/${req.file.filename}`;

  console.log(`✅ File saved: ${fileUrl}`);
  res.json({ url: fileUrl });
});

module.exports = router;
