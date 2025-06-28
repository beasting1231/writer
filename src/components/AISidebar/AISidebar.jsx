import React from 'react';
import './AISidebar.css';

const AISidebar = ({ isVisible, activeAction, selectedText, processedText, isLoading, onApply, onCancel }) => {
  if (!isVisible) return null;
  
  const getTitle = () => {
    switch (activeAction) {
      case 'rewrite':
        return 'Rewrite with AI';
      case 'proofread':
        return 'Proofread with AI';
      default:
        return 'AI Assistant';
    }
  };

  return (
    <div className="ai-sidebar">
      <div className="ai-sidebar-header">
        <h2>{getTitle()}</h2>
        <button className="ai-sidebar-close" onClick={onCancel}>×</button>
      </div>
      
      <div className="ai-sidebar-content">
        <div className="ai-sidebar-section">
          <h3>Original Text</h3>
          <div className="ai-text-container original">
            {selectedText && selectedText.trim() ? selectedText : 'No text selected'}
          </div>
        </div>
        
        <div className="ai-sidebar-section">
          <h3>{activeAction === 'rewrite' ? 'Rewritten Text' : 'Corrected Text'}</h3>
          <div className="ai-text-container result">
            {isLoading ? (
              <div className="ai-loading">
                <div className="ai-loading-spinner"></div>
                <p>Processing with Gemini Flash 2.5...</p>
              </div>
            ) : processedText}
          </div>
        </div>
      </div>
      
      <div className="ai-sidebar-footer">
        <button 
          className="ai-button secondary" 
          onClick={onCancel}
        >
          Cancel
        </button>
        <button 
          className="ai-button primary" 
          onClick={onApply}
          disabled={isLoading || !processedText}
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
};

export default AISidebar;
