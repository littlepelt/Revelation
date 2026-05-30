const express = require('express');
const upload = require('../config/multer');
const router = express.Router();

router.post('/', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Используем HTTPS принудительно
  const protocol = 'https';
  const fileUrl = `${protocol}://${req.get('host')}/avatars/${req.file.filename}`;
  res.json({ url: fileUrl });
});

module.exports = router;