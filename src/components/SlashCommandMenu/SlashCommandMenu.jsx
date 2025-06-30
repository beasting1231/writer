import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './SlashCommandMenu.css';

const SlashCommandMenu = ({ position, onClose, onAction }) => {
  const menuRef = useRef(null);
  
  // Handle click outside to close the menu
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

  // Handle menu item click
  const handleAction = (action) => {
    onAction(action);
    onClose();
  };
  
  // Calculate menu style directly from props without state
  // This avoids the infinite update loop
  const getMenuStyle = () => {
    return {
      position: 'fixed',
      top: `${position.y}px`,
      left: `${position.x}px`,
      zIndex: 9999
    };
  };
  
  // Create a portal to render the menu directly in the document body
  return createPortal(
    <div 
      className="slash-command-menu" 
      ref={menuRef}
      style={getMenuStyle()}
    >
      <div className="slash-command-heading-row">
        <div className="slash-command-heading-item" onClick={() => handleAction('h1')}>
          <span className="material-symbols-outlined">format_h1</span>
        </div>
        <div className="slash-command-heading-item" onClick={() => handleAction('h2')}>
          <span className="material-symbols-outlined">format_h2</span>
        </div>
        <div className="slash-command-heading-item" onClick={() => handleAction('h3')}>
          <span className="material-symbols-outlined">format_h3</span>
        </div>
        <div className="slash-command-heading-item" onClick={() => handleAction('h4')}>
          <span className="material-symbols-outlined">format_h4</span>
        </div>
        <div className="slash-command-heading-item" onClick={() => handleAction('h5')}>
          <span className="material-symbols-outlined">format_h5</span>
        </div>
      </div>
      <div className="slash-command-item" onClick={() => handleAction('list')}>
        <div className="slash-command-icon">
          <span className="material-icons">format_list_bulleted</span>
        </div>
        <div className="slash-command-content">
          <div className="slash-command-title">List item</div>
          <div className="slash-command-shortcut">-</div>
        </div>
      </div>
      <div className="slash-command-item" onClick={() => handleAction('task')}>
        <div className="slash-command-icon">
          <span className="material-icons">check_box_outline_blank</span>
        </div>
        <div className="slash-command-content">
          <div className="slash-command-title">Task item</div>
          <div className="slash-command-shortcut">[]</div>
        </div>
      </div>
      <div className="slash-command-item" onClick={() => handleAction('blockquote')}>
        <div className="slash-command-icon">
          <span className="material-icons">format_quote</span>
        </div>
        <div className="slash-command-content">
          <div className="slash-command-title">Block quote</div>
          <div className="slash-command-shortcut">{">"}</div>
        </div>
      </div>
      <div className="slash-command-item" onClick={() => handleAction('hr')}>
        <div className="slash-command-icon">
          <span className="material-icons">horizontal_rule</span>
        </div>
        <div className="slash-command-content">
          <div className="slash-command-title">Horizontal rule</div>
          <div className="slash-command-shortcut">---</div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SlashCommandMenu;
