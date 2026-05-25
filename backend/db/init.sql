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

-- Добавляем начальные книги (общественное достояние)
INSERT INTO books (title, author, description, publication_year, cover_url) VALUES
  ('Преступление и наказание', 'Фёдор Достоевский', 'Роман о моральных дилеммах и раскаянии студента Родиона Раскольникова.', 1866, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Crime_and_Punishment_cover.jpg/200px-Crime_and_Punishment_cover.jpg'),
  ('Война и мир', 'Лев Толстой', 'Эпопея о жизни русского общества в эпоху Наполеоновских войн.', 1869, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/War_and_peace_cover.jpg/200px-War_and_peace_cover.jpg'),
  ('Анна Каренина', 'Лев Толстой', 'Трагическая история любви замужней женщины и офицера.', 1877, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Anna_Karenina_cover.jpg/200px-Anna_Karenina_cover.jpg'),
  ('Мёртвые души', 'Николай Гоголь', 'Сатирическая поэма о чиновнике, скупающем мёртвые крестьянские души.', 1842, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Dead_Souls_cover.jpg/200px-Dead_Souls_cover.jpg'),
  ('Отцы и дети', 'Иван Тургенев', 'Роман о конфликте поколений и нигилизме.', 1862, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Fathers_and_Sons_cover.jpg/200px-Fathers_and_Sons_cover.jpg')
ON CONFLICT (id) DO NOTHING;

-- Таблица для статусов книг пользователя (прочитано/читаю/буду читать)
CREATE TABLE IF NOT EXISTS user_book_status (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  status VARCHAR(20) CHECK (status IN ('read', 'reading', 'want_to_read')),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, book_id)
);