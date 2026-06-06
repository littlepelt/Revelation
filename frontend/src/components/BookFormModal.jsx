import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Upload, Check } from 'lucide-react';
import './BookFormModal.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const createRipple = (event) => {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(button.clientWidth, button.clientHeight);
  
  ripple.classList.add('ripple');
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
  
  const oldRipples = button.querySelectorAll('.ripple');
  oldRipples.forEach(r => r.remove());
  
  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
};

export default function BookFormModal({ onClose, onSubmit, book, loading }) {
  const isEdit = !!book;
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    publication_year: '',
    tags: ''
  });
  const [coverFile, setCoverFile] = useState(null);
  const [textFile, setTextFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        author: book.author || '',
        description: book.description || '',
        publication_year: book.publication_year || '',
        tags: book.tags || ''
      });
      setCoverPreview(book.cover_url || '');
    }
  }, [book]);

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTextFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.author) {
      alert('Название и автор обязательны');
      return;
    }
    
    if (!isEdit && !textFile) {
      alert('Для новой книги необходимо загрузить текстовый файл (.txt)');
      return;
    }
    
    setUploading(true);
    
    let coverUrl = book?.cover_url || '';
    let textUrl = book?.file_path || '';
    
    if (coverFile) {
      const coverFormData = new FormData();
      coverFormData.append('file', coverFile);
      try {
        const coverRes = await axios.post(`${API_URL}/api/upload`, coverFormData, {
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        coverUrl = coverRes.data.url;
      } catch (err) {
        console.error('Cover upload error:', err);
        alert('Ошибка загрузки обложки');
        setUploading(false);
        return;
      }
    }
    
    if (textFile) {
      const textFormData = new FormData();
      textFormData.append('file', textFile);
      try {
        const textRes = await axios.post(`${API_URL}/api/upload`, textFormData, {
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        textUrl = textRes.data.url;
        console.log('Text uploaded to:', textUrl);
      } catch (err) {
        console.error('Text upload error:', err);
        alert('Ошибка загрузки текста');
        setUploading(false);
        return;
      }
    }
    
    onSubmit({
      ...formData,
      publication_year: parseInt(formData.publication_year) || null,
      cover_url: coverUrl,
      file_url: textUrl
    });
    
    setUploading(false);
  };

  return (
    <div className="book-modal-overlay" onClick={onClose}>
      <div className="book-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="book-modal-header">
          <h3>{isEdit ? 'Редактировать книгу' : 'Добавить книгу'}</h3>
          <button className="book-modal-close" onClick={onClose} onMouseDown={createRipple}>
            <X size={20} />
          </button>
        </div>

        <div className="book-modal-body">
          <div className="book-form-field">
            <label>Название *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Название книги"
            />
          </div>

          <div className="book-form-field">
            <label>Автор *</label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              placeholder="Автор"
            />
          </div>

          <div className="book-form-field">
            <label>Год публикации</label>
            <input
              type="number"
              value={formData.publication_year}
              onChange={(e) => setFormData({ ...formData, publication_year: e.target.value })}
              placeholder="Год"
            />
          </div>

          <div className="book-form-field">
            <label>Теги (через запятую)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="Классика, Роман, Драма"
            />
          </div>

          <div className="book-form-field">
            <label>Обложка (JPG/PNG)</label>
            <input type="file" accept="image/*" onChange={handleCoverChange} />
            {coverPreview && (
              <div className="book-cover-preview">
                <img src={coverPreview} alt="Preview" />
              </div>
            )}
          </div>

          <div className="book-form-field">
            <label>Текст книги (TXT) {!isEdit && '*'}</label>
            <input type="file" accept=".txt" onChange={handleTextChange} />
            {isEdit && textFile && <span className="file-selected">Выбран новый файл</span>}
          </div>

          <div className="book-form-field">
            <label>Описание</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Описание книги"
              rows={4}
            />
          </div>
        </div>

        <div className="book-modal-footer">
          <button className="book-cancel-btn" onClick={onClose} onMouseDown={createRipple}>
            Отмена
          </button>
          <button 
            className="book-submit-btn" 
            onClick={handleSubmit}
            disabled={loading || uploading}
            onMouseDown={createRipple}
          >
            <Check size={16} />
            {uploading ? 'Загрузка...' : (loading ? 'Сохранение...' : (isEdit ? 'Сохранить' : 'Создать'))}
          </button>
        </div>
      </div>
    </div>
  );
}