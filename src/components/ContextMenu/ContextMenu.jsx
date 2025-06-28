import React, { useRef, useEffect } from 'react';
import './ContextMenu.css';

const ContextMenu = ({ position, onClose, onAction }) => {
  // Store the selected text when the component mounts
  const selectedTextRef = useRef(window.getSelection().toString());
  const menuRef = useRef(null);

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
    // Pass the stored selected text to the action handler
    onAction(action, selectedTextRef.current);
    onClose();
  };

  return (
    <div 
      className="context-menu" 
      ref={menuRef}
      style={{ 
        top: `${position.y}px`, 
        left: `${position.x}px` 
      }}
    >
      <div className="context-menu-item" onClick={() => handleAction('rewrite')}>
        <div className="context-menu-icon">✏️</div>
        <span>Re-write with AI</span>
      </div>
      <div className="context-menu-item" onClick={() => handleAction('proofread')}>
        <div className="context-menu-icon">🔍</div>
        <span>Proofread with AI</span>
      </div>
    </div>
  );
};

export default ContextMenu;
