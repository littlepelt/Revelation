const express = require('express');
const multer = require('multer');
const ImageKit = require('imagekit');
const router = express.Router();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'text/plain'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images and txt files allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter
});

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const fileExtension = req.file.originalname.split('.').pop();
    const fileType = req.file.mimetype === 'text/plain' ? 'texts' : 'covers';
    const fileName = `${timestamp}-${random}.${fileExtension}`;

    let fileBuffer = req.file.buffer;
    let isBase64 = false;

    if (req.file.mimetype === 'text/plain') {
      fileBuffer = req.file.buffer.toString('base64');
      isBase64 = true;
    }

    const result = await imagekit.upload({
      file: isBase64 ? fileBuffer : fileBuffer.toString('base64'),
      fileName: fileName,
      useUniqueFileName: false,
      folder: `/${fileType}`,
    });

    // Генерируем подписанный URL (работает даже с включённым Restrict unsigned URLs)
    const signedUrl = imagekit.url({
      src: result.url,
      signed: true,
      expireSeconds: 31536000, // 1 год
    });

    res.json({ url: signedUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

module.exports = router;