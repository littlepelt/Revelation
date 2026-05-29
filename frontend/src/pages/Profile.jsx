import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import EditProfileModal from '../components/EditProfileModal';
import './Profile.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);

  if (!user) return null;

  const shelves = [
    { id: 'reading', name: 'Читаю', count: 0, color: '#003BFF' },
    { id: 'read', name: 'Прочитано', count: 0, color: '#10B981' },
    { id: 'want_to_read', name: 'Буду читать', count: 0, color: '#F59E0B' }
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          <img 
            src={user.avatar_url || 'https://via.placeholder.com/120x120?text=Avatar'} 
            alt={user.username}
          />
          <button className="edit-avatar-btn" onClick={() => setShowEditModal(true)}>
            ✎
          </button>
        </div>
        <div className="profile-info">
          <h1>{user.username}</h1>
          <p className="profile-email">{user.email}</p>
          <p className="profile-joined">
            Присоединился: {new Date(user.created_at).toLocaleDateString('ru-RU')}
          </p>
          <button className="edit-profile-btn" onClick={() => setShowEditModal(true)}>
            Редактировать профиль
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </div>

      <div className="profile-shelves">
        <h2>Мои полки</h2>
        <div className="shelves-grid">
          {shelves.map(shelf => (
            <div key={shelf.id} className="shelf-card">
              <div className="shelf-color" style={{ backgroundColor: shelf.color }} />
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