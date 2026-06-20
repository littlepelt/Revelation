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

    const result = await imagekit.upload({
      file: req.file.buffer.toString('base64'),
      fileName: fileName,
      useUniqueFileName: false,
      folder: `/${fileType}`,
    });

    console.log('Uploaded to ImageKit:', result.url);
    res.json({ url: result.url });
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

module.exports = router;
