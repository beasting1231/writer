import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './SlashCommandMenu.css';

const SlashCommandMenu = ({ position, onClose, onAction }) => {
  const menuRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(-1); // -1 means no selection
  
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

  // Focus the menu when it appears and set initial selection
  useEffect(() => {
    if (menuRef.current) {
      menuRef.current.focus();
      setSelectedIndex(0); // Select the first item by default
    }
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const totalItems = 9; // Total number of menu items (5 headings + 4 other items)
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prevIndex => {
          // If we're in the heading row and need to move down
          if (prevIndex < 5) {
            return 5; // Move to the first item in the list section
          }
          // Otherwise move to the next item or wrap around
          return (prevIndex + 1) % totalItems;
        });
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prevIndex => {
          // If we're in the first item of the list section and need to move up
          if (prevIndex === 5) {
            return 0; // Move to the first heading
          }
          // Otherwise move to the previous item or wrap around
          return prevIndex <= 0 ? totalItems - 1 : prevIndex - 1;
        });
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        // If in heading row, move right within headings
        if (selectedIndex < 5) {
          setSelectedIndex(prevIndex => (prevIndex + 1) % 5);
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        // If in heading row, move left within headings
        if (selectedIndex < 5) {
          setSelectedIndex(prevIndex => prevIndex <= 0 ? 4 : prevIndex - 1);
        }
        break;
        
      case 'Enter':
      case 'Return':
        e.preventDefault();
        if (selectedIndex >= 0) {
          // Map selected index to action
          const actions = ['h1', 'h2', 'h3', 'h4', 'h5', 'list', 'task', 'blockquote', 'hr'];
          handleAction(actions[selectedIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
        
      default:
        break;
    }
  };

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
      tabIndex={0} // Make the menu focusable
      onKeyDown={handleKeyDown} // Add keyboard event handler
    >
      <div className="slash-command-heading-row">
        <div 
          className={`slash-command-heading-item ${selectedIndex === 0 ? 'selected' : ''}`} 
          onClick={() => handleAction('h1')}
        >
          <span className="material-symbols-outlined">format_h1</span>
        </div>
        <div 
          className={`slash-command-heading-item ${selectedIndex === 1 ? 'selected' : ''}`} 
          onClick={() => handleAction('h2')}
        >
          <span className="material-symbols-outlined">format_h2</span>
        </div>
        <div 
          className={`slash-command-heading-item ${selectedIndex === 2 ? 'selected' : ''}`} 
          onClick={() => handleAction('h3')}
        >
          <span className="material-symbols-outlined">format_h3</span>
        </div>
        <div 
          className={`slash-command-heading-item ${selectedIndex === 3 ? 'selected' : ''}`} 
          onClick={() => handleAction('h4')}
        >
          <span className="material-symbols-outlined">format_h4</span>
        </div>
        <div 
          className={`slash-command-heading-item ${selectedIndex === 4 ? 'selected' : ''}`} 
          onClick={() => handleAction('h5')}
        >
          <span className="material-symbols-outlined">format_h5</span>
        </div>
      </div>
      <div 
        className={`slash-command-item ${selectedIndex === 5 ? 'selected' : ''}`} 
        onClick={() => handleAction('list')}
      >
        <div className="slash-command-icon">
          <span className="material-icons">format_list_bulleted</span>
        </div>
        <div className="slash-command-content">
          <div className="slash-command-title">List item</div>
          <div className="slash-command-shortcut">-</div>
        </div>
      </div>
      <div 
        className={`slash-command-item ${selectedIndex === 6 ? 'selected' : ''}`} 
        onClick={() => handleAction('task')}
      >
        <div className="slash-command-icon">
          <span className="material-icons">check_box_outline_blank</span>
        </div>
        <div className="slash-command-content">
          <div className="slash-command-title">Task item</div>
          <div className="slash-command-shortcut">[]</div>
        </div>
      </div>
      <div 
        className={`slash-command-item ${selectedIndex === 7 ? 'selected' : ''}`} 
        onClick={() => handleAction('blockquote')}
      >
        <div className="slash-command-icon">
          <span className="material-icons">format_quote</span>
        </div>
        <div className="slash-command-content">
          <div className="slash-command-title">Block quote</div>
          <div className="slash-command-shortcut">{">"}</div>
        </div>
      </div>
      <div 
        className={`slash-command-item ${selectedIndex === 8 ? 'selected' : ''}`} 
        onClick={() => handleAction('hr')}
      >
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
