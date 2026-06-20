const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Папка внутри books/_uploads (books уже есть в проекте)
const UPLOADS_DIR = path.join(__dirname, '..', 'books', '_uploads');
const COVERS_DIR = path.join(UPLOADS_DIR, 'covers');
const TEXTS_DIR = path.join(UPLOADS_DIR, 'texts');

[UPLOADS_DIR, COVERS_DIR, TEXTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, file.mimetype === 'text/plain' ? TEXTS_DIR : COVERS_DIR);
  },
  filename: (req, file, cb) => {
    const ts = Date.now();
    const rnd = Math.round(Math.random() * 1e9);
    cb(null, `${ts}-${rnd}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'text/plain'];
    cb(ok.includes(file.mimetype) ? null : new Error('Bad type'), ok.includes(file.mimetype));
  }
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const sub = req.file.mimetype === 'text/plain' ? 'texts' : 'covers';
  const host = req.get('host'); // revelation-api.onrender.com
  const fileUrl = `https://${host}/api/uploads/${sub}/${req.file.filename}`;

  console.log(`✅ Saved: ${fileUrl}`);
  res.json({ url: fileUrl });
});

module.exports = router;
