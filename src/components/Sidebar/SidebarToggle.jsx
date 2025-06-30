import React from 'react';
import './SidebarToggle.css';
// Import Material UI icons as fallback
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';

const SidebarToggle = ({ isOpen, toggleSidebar }) => {
  // Use MUI icons instead of Material Symbols which aren't rendering correctly
  return (
    <button 
      className={`sidebar-toggle ${isOpen ? 'open' : ''}`} 
      onClick={toggleSidebar}
      aria-label="Toggle chapters sidebar"
    >
      {isOpen ? (
        <MenuOpenIcon className="toggle-icon" />
      ) : (
        <MenuIcon className="toggle-icon" />
      )}
    </button>
  );
};

export default SidebarToggle;
