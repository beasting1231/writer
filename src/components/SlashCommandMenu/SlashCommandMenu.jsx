import React, { useRef, useEffect, useState } from 'react';
import './SlashCommandMenu.css';

const SlashCommandMenu = ({ position, onClose, onAction }) => {
  const menuRef = useRef(null);

  // Log position when component mounts or updates
  useEffect(() => {
    console.log('SlashCommandMenu received position:', position);
  }, [position]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleAction = (action) => {
    onAction(action);
    onClose();
  };

  // Calculate position to ensure menu is visible within viewport
  const [menuPosition, setMenuPosition] = useState({ top: position.y, left: position.x });
  
  // Adjust position to ensure menu stays within viewport boundaries
  useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Start with the provided position (now at the beginning of the line)
      let newTop = position.y;
      let newLeft = position.x;
      
      // Check if menu extends beyond right edge of viewport
      if (position.x + menuRect.width > viewportWidth) {
        newLeft = viewportWidth - menuRect.width - 10; // 10px padding from edge
      }
      
      // Check if menu extends beyond bottom edge of viewport
      if (position.y + menuRect.height > viewportHeight) {
        newTop = position.y - 10; // Keep at the same vertical position with slight adjustment
      }
      
      setMenuPosition({ top: newTop, left: newLeft });
    }
  }, [position]);
  
  const menuStyle = {
    position: 'fixed', // Use fixed positioning relative to viewport
    top: `${menuPosition.top}px`,
    left: `${menuPosition.left}px`,
  };

  return (
    <div 
      className="slash-command-menu" 
      ref={menuRef}
      style={menuStyle}
    >
      <div className="slash-command-item" onClick={() => handleAction('heading')}>
        <div className="slash-command-icon">H</div>
        <div className="slash-command-content">
          <div className="slash-command-title">Heading</div>
          <div className="slash-command-shortcut">#</div>
        </div>
      </div>
      <div className="slash-command-item" onClick={() => handleAction('list')}>
        <div className="slash-command-icon">•</div>
        <div className="slash-command-content">
          <div className="slash-command-title">List item</div>
          <div className="slash-command-shortcut">-</div>
        </div>
      </div>
      <div className="slash-command-item" onClick={() => handleAction('task')}>
        <div className="slash-command-icon">☐</div>
        <div className="slash-command-content">
          <div className="slash-command-title">Task item</div>
          <div className="slash-command-shortcut">[]</div>
        </div>
      </div>
      <div className="slash-command-item" onClick={() => handleAction('blockquote')}>
        <div className="slash-command-icon">❝</div>
        <div className="slash-command-content">
          <div className="slash-command-title">Block quote</div>
          <div className="slash-command-shortcut">{">"}</div>
        </div>
      </div>
      <div className="slash-command-item" onClick={() => handleAction('image')}>
        <div className="slash-command-icon">🖼️</div>
        <div className="slash-command-content">
          <div className="slash-command-title">Image</div>
          <div className="slash-command-shortcut">/i</div>
        </div>
      </div>
      <div className="slash-command-item" onClick={() => handleAction('gallery')}>
        <div className="slash-command-icon">🖼️🖼️</div>
        <div className="slash-command-content">
          <div className="slash-command-title">ImageGallery</div>
          <div className="slash-command-shortcut">/g</div>
        </div>
      </div>
      <div className="slash-command-item" onClick={() => handleAction('hr')}>
        <div className="slash-command-icon">—</div>
        <div className="slash-command-content">
          <div className="slash-command-title">Horizontal rule</div>
          <div className="slash-command-shortcut">---</div>
        </div>
      </div>
    </div>
  );
};

export default SlashCommandMenu;
