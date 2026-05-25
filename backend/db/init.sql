CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Новая таблица для книг
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  description TEXT,
  cover_url TEXT,
  publication_year INTEGER,
  file_url TEXT, -- ссылка на текст книги (пока заглушка)
  rating_avg DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для статусов книг пользователя (прочитано/читаю/буду читать)
CREATE TABLE IF NOT EXISTS user_book_status (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  status VARCHAR(20) CHECK (status IN ('read', 'reading', 'want_to_read')),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, book_id)
);

-- Удаляем старые книги (если есть)
TRUNCATE books RESTART IDENTITY CASCADE;

-- Добавляем книги с рабочими обложками (через надежный источник)
INSERT INTO books (title, author, description, publication_year, cover_url) VALUES
  ('Преступление и наказание', 'Фёдор Достоевский', 'Роман о моральных дилеммах и раскаянии студента Родиона Раскольникова.', 1866, 'https://fantlab.ru/images/editions/orig/463411?r=1753468218'),
  ('Война и мир', 'Лев Толстой', 'Эпопея о жизни русского общества в эпоху Наполеоновских войск.', 1869, 'https://fantlab.ru/images/editions/orig/218817?r=1519022067'),
  ('Анна Каренина', 'Лев Толстой', 'Трагическая история любви замужней женщины и офицера.', 1877, 'https://fantlab.ru/images/editions/orig/405228?r=1702369338'),
  ('Мёртвые души', 'Николай Гоголь', 'Сатирическая поэма о чиновнике, скупающем мёртвые крестьянские души.', 1842, 'https://fantlab.ru/images/editions/orig/316344?r=1619693055'),
  ('Отцы и дети', 'Иван Тургенев', 'Роман о конфликте поколений и нигилизме.', 1862, 'https://fantlab.ru/images/editions/orig/220128?r=1520712585')
ON CONFLICT (id) DO NOTHING;