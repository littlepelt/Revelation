import { useState } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './EditProfileModal.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Ripple эффект
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

export default function EditProfileModal({ onClose }) {
  const { user, token, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Здесь будет логика загрузки файла на сервер
      // Пока просто обновляем username
      const response = await axios.put(`${API_URL}/api/auth/profile`,
        { username, avatar_url: avatarPreview },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updateUser(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Редактировать профиль</h3>
          <button className="close-btn" onClick={onClose} onMouseDown={createRipple}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            <label>Имя пользователя</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="modal-field">
            <label>Аватар</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            {avatarPreview && (
              <div className="avatar-preview">
                <img src={avatarPreview} alt="Preview" />
              </div>
            )}
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={onClose}
              onMouseDown={createRipple}
            >
              Отмена
            </button>
            <button 
              type="submit" 
              className="save-btn" 
              disabled={loading}
              onMouseDown={createRipple}
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}