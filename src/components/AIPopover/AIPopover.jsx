import React, { useEffect, useRef } from 'react';
import './AIPopover.css';

/**
 * Popover component with action buttons for AI-generated text
 */
const AIPopover = ({ position, onApprove, onDiscard, onRegenerate }) => {
  const popoverRef = useRef(null);
  
  // Position the popover above the AI-generated text
  useEffect(() => {
    if (popoverRef.current && position) {
      const { top, left, width } = position;
      
      // Center the popover above the text
      popoverRef.current.style.top = `${top - 40}px`;
      popoverRef.current.style.left = `${left + (width / 2) - 50}px`;
    }
  }, [position]);

  return (
    <div className="ai-popover" ref={popoverRef}>
      <button 
        className="ai-popover-button discard" 
        onClick={onDiscard}
        title="Discard changes"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
      
      <button 
        className="ai-popover-button regenerate" 
        onClick={onRegenerate}
        title="Regenerate"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
      </button>
      
      <button 
        className="ai-popover-button approve" 
        onClick={onApprove}
        title="Approve changes"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      </button>
    </div>
  );
};

export default AIPopover;
