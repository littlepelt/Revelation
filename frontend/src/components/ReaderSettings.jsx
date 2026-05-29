import { useState, useEffect } from 'react';
import { X, AlignLeft, AlignCenter, AlignRight, AlignJustify, RefreshCw, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './ReaderSettings.css';

const STORAGE_KEY = 'reader_settings';

const defaultSettings = {
  fontSize: 'normal',
  fontWeight: 'normal',
  lineHeight: 'normal',
  textAlign: 'justify'
};

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

export default function ReaderSettings({ onClose, onApply }) {
  const [settings, setSettings] = useState(defaultSettings);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
  }, []);

  const applySettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    onApply(newSettings);
  };

  const handleFontSizeChange = (value) => {
    applySettings({ ...settings, fontSize: value });
  };

  const handleFontWeightChange = (value) => {
    applySettings({ ...settings, fontWeight: value });
  };

  const handleLineHeightChange = (value) => {
    applySettings({ ...settings, lineHeight: value });
  };

  const handleTextAlignChange = (value) => {
    applySettings({ ...settings, textAlign: value });
  };

  const resetSettings = () => {
    applySettings(defaultSettings);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Настройки чтения</h3>
          <button className="close-btn" onClick={onClose} onMouseDown={createRipple}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-section">
          {/* Переключение темы */}
          <div className="setting-item">
            <div className="setting-label">
              {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
              <span>Тема оформления</span>
            </div>
            <div className="setting-control">
              <button 
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => { if (theme !== 'light') toggleTheme(); }}
                onMouseDown={createRipple}
              >
                <Sun size={16} />
                Светлая
              </button>
              <button 
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                onMouseDown={createRipple}
              >
                <Moon size={16} />
                Тёмная
              </button>
            </div>
          </div>

          <div className="setting-divider"></div>

          <div className="setting-item">
            <div className="setting-label">
              <span style={{ fontSize: '18px' }}>Aa</span>
              <span>Размер шрифта</span>
            </div>
            <div className="setting-control">
              <button 
                className={`size-btn ${settings.fontSize === 'small' ? 'active' : ''}`}
                onClick={() => handleFontSizeChange('small')}
                onMouseDown={createRipple}
              >
                Маленький
              </button>
              <button 
                className={`size-btn ${settings.fontSize === 'normal' ? 'active' : ''}`}
                onClick={() => handleFontSizeChange('normal')}
                onMouseDown={createRipple}
              >
                Средний
              </button>
              <button 
                className={`size-btn ${settings.fontSize === 'large' ? 'active' : ''}`}
                onClick={() => handleFontSizeChange('large')}
                onMouseDown={createRipple}
              >
                Большой
              </button>
              <button 
                className={`size-btn ${settings.fontSize === 'xlarge' ? 'active' : ''}`}
                onClick={() => handleFontSizeChange('xlarge')}
                onMouseDown={createRipple}
              >
                Очень большой
              </button>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span style={{ fontWeight: 'bold' }}>B</span>
              <span>Насыщенность</span>
            </div>
            <div className="setting-control">
              <button 
                className={`weight-btn ${settings.fontWeight === 'normal' ? 'active' : ''}`}
                onClick={() => handleFontWeightChange('normal')}
                onMouseDown={createRipple}
              >
                Обычный
              </button>
              <button 
                className={`weight-btn ${settings.fontWeight === 'medium' ? 'active' : ''}`}
                onClick={() => handleFontWeightChange('medium')}
                onMouseDown={createRipple}
              >
                Полужирный
              </button>
              <button 
                className={`weight-btn ${settings.fontWeight === 'bold' ? 'active' : ''}`}
                onClick={() => handleFontWeightChange('bold')}
                onMouseDown={createRipple}
              >
                Жирный
              </button>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span style={{ fontSize: '18px' }}>⇅</span>
              <span>Межстрочный интервал</span>
            </div>
            <div className="setting-control">
              <button 
                className={`line-btn ${settings.lineHeight === 'compact' ? 'active' : ''}`}
                onClick={() => handleLineHeightChange('compact')}
                onMouseDown={createRipple}
              >
                Уплотнённый
              </button>
              <button 
                className={`line-btn ${settings.lineHeight === 'normal' ? 'active' : ''}`}
                onClick={() => handleLineHeightChange('normal')}
                onMouseDown={createRipple}
              >
                Обычный
              </button>
              <button 
                className={`line-btn ${settings.lineHeight === 'loose' ? 'active' : ''}`}
                onClick={() => handleLineHeightChange('loose')}
                onMouseDown={createRipple}
              >
                Разреженный
              </button>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <AlignLeft size={18} />
              <span>Выравнивание</span>
            </div>
            <div className="setting-control align-control">
              <button 
                className={`align-btn ${settings.textAlign === 'left' ? 'active' : ''}`}
                onClick={() => handleTextAlignChange('left')}
                onMouseDown={createRipple}
              >
                <AlignLeft size={18} />
              </button>
              <button 
                className={`align-btn ${settings.textAlign === 'center' ? 'active' : ''}`}
                onClick={() => handleTextAlignChange('center')}
                onMouseDown={createRipple}
              >
                <AlignCenter size={18} />
              </button>
              <button 
                className={`align-btn ${settings.textAlign === 'right' ? 'active' : ''}`}
                onClick={() => handleTextAlignChange('right')}
                onMouseDown={createRipple}
              >
                <AlignRight size={18} />
              </button>
              <button 
                className={`align-btn ${settings.textAlign === 'justify' ? 'active' : ''}`}
                onClick={() => handleTextAlignChange('justify')}
                onMouseDown={createRipple}
              >
                <AlignJustify size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="reset-btn" onClick={resetSettings} onMouseDown={createRipple}>
            <RefreshCw size={16} />
            Сбросить настройки форматирования
          </button>
        </div>
      </div>
    </div>
  );
}