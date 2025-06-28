import React from 'react';
import './PageHeader.css';

const PageHeader = ({ pageNumber, isLocked, onDuplicate, onDelete, onToggleLock }) => {
  return (
    <div className="page-header">
      <div className="page-number">
        Page {pageNumber}
      </div>
      <div className="page-actions">
        <button 
          className="page-action-btn"
          onClick={onDuplicate}
          title="Duplicate page"
        >
          <span className="material-icons">content_copy</span>
        </button>
        <button 
          className="page-action-btn"
          onClick={onDelete}
          title="Delete page"
        >
          <span className="material-icons">delete</span>
        </button>
        <button 
          className={`page-action-btn ${isLocked ? 'locked' : ''}`}
          onClick={onToggleLock}
          title={isLocked ? "Unlock page" : "Lock page"}
        >
          <span className="material-icons">
            {isLocked ? 'lock' : 'lock_open'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default PageHeader; 