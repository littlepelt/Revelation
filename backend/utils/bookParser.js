const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const BOOKS_DIR = path.join(__dirname, '../books');

function parseBookFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const metadataMatch = content.match(/===МЕТАДАННЫЕ===\n([\s\S]*?)\n===КОНЕЦ МЕТАДАННЫХ===\n/);
  if (!metadataMatch) {
    throw new Error('No metadata found in ' + filePath);
  }
  
  const metadata = {};
  const lines = metadataMatch[1].split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      if (key && value) {
        metadata[key] = value;
      }
    }
  }
  
  const text = content.replace(/===МЕТАДАННЫЕ===\n[\s\S]*?\n===КОНЕЦ МЕТАДАННЫХ===\n/, '');
  
  // Формируем URL обложки
  let coverUrl = null;
  if (metadata['Обложка']) {
    if (metadata['Обложка'].startsWith('/covers/')) {
      // Локальная обложка
      const coverFileName = path.basename(metadata['Обложка']);
      coverUrl = `${process.env.API_URL || 'https://revelation-5zzx.onrender.com'}/covers/${coverFileName}`;
    } else {
      // Внешний URL
      coverUrl = metadata['Обложка'];
    }
  }
  
  return {
    title: metadata['Название'] || 'Unknown',
    author: metadata['Автор'] || 'Unknown',
    year: parseInt(metadata['Год']) || null,
    coverUrl: coverUrl,
    description: metadata['Описание'] || null,
    text: text,
    fileName: path.basename(filePath)
  };
}

async function syncBooks() {
  if (!fs.existsSync(BOOKS_DIR)) {
    console.log('❌ Папка books не найдена, создаём...');
    fs.mkdirSync(BOOKS_DIR, { recursive: true });
    return;
  }
  
  const files = fs.readdirSync(BOOKS_DIR).filter(f => f.endsWith('.txt'));
  
  if (files.length === 0) {
    console.log('⚠️ В папке books нет .txt файлов');
    return;
  }
  
  for (const file of files) {
    const filePath = path.join(BOOKS_DIR, file);
    const book = parseBookFile(filePath);
    
    const result = await pool.query('SELECT id FROM books WHERE title = $1', [book.title]);
    
    if (result.rows.length === 0) {
      await pool.query(`
        INSERT INTO books (title, author, publication_year, cover_url, file_path, description)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [book.title, book.author, book.year, book.coverUrl, book.fileName, book.description]);
      console.log(`✅ Добавлена книга: ${book.title}`);
    } else {
      console.log(`⏭️ Книга уже существует: ${book.title}`);
    }
  }
}

function getBookText(fileName) {
  const filePath = path.join(BOOKS_DIR, fileName);
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.replace(/===МЕТАДАННЫЕ===\n[\s\S]*?\n===КОНЕЦ МЕТАДАННЫХ===\n/, '');
}

module.exports = { syncBooks, getBookText, parseBookFile };