import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import EditProfileModal from '../components/EditProfileModal';
import './Profile.css';

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

export default function Profile() {
  const { user, logout } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);

  if (!user) return null;

  const shelves = [
    { id: 'reading', name: 'Читаю', count: 0 },
    { id: 'read', name: 'Прочитано', count: 0 },
    { id: 'want_to_read', name: 'Буду читать', count: 0 }
  ];

  const handleLogout = () => {
    logout();
  };

  const handleShelfClick = (shelfId) => {
    // TODO: фильтрация книг по полке
    console.log('Shelf clicked:', shelfId);
  };

  const joinedDate = user.created_at 
    ? new Date(user.created_at).toLocaleDateString('ru-RU')
    : 'неизвестно';

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          <img 
            src={user.avatar_url || 'https://via.placeholder.com/120x120?text=Avatar'} 
            alt={user.username}
          />
        </div>
        <div className="profile-info">
          <h1>{user.username}</h1>
          <p className="profile-email">{user.email}</p>
          <p className="profile-joined">
            Присоединился: {joinedDate}
          </p>
          <button 
            className="edit-profile-btn" 
            onClick={() => setShowEditModal(true)}
            onMouseDown={createRipple}
          >
            Редактировать профиль
          </button>
          <button 
            className="logout-btn" 
            onClick={handleLogout}
            onMouseDown={createRipple}
          >
            Выйти
          </button>
        </div>
      </div>

      <div className="profile-shelves">
        <h2>Мои полки</h2>
        <div className="shelves-grid">
          {shelves.map(shelf => (
            <div 
              key={shelf.id} 
              className="shelf-card"
              onClick={() => handleShelfClick(shelf.id)}
              onMouseDown={createRipple}
            >
              <div className="shelf-info">
                <h3>{shelf.name}</h3>
                <p>{shelf.count} книг</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showEditModal && (
        <EditProfileModal onClose={() => setShowEditModal(false)} />
      )}
    </div>
  );
}