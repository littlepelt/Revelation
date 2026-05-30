const express = require('express');
const multer = require('multer');
const ImageKit = require('imagekit');
const router = express.Router();

// Настройка multer для работы в памяти
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

// Инициализация ImageKit SDK
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

router.post('/', upload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `avatar-${timestamp}-${random}.${fileExtension}`;

    // Загружаем файл в ImageKit Media Library
    const result = await imagekit.upload({
      file: req.file.buffer.toString('base64'),
      fileName: fileName,
      useUniqueFileName: true,
      folder: '/avatars',
    });

    res.json({ url: result.url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

module.exports = router;