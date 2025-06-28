import React, { useState } from 'react';

const TextHighlighter = ({ onHighlightChange }) => {
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState('#ffff00'); // Default yellow
  const [savedSelection, setSavedSelection] = useState(null);
  
  const highlightColors = [
    '#ffff00', // yellow
    '#ff6b6b', // red
    '#ffa502', // orange
    '#69db7c', // green
    '#4dabf7', // blue
    '#cc5de8', // purple
    '#e2e2e2', // light gray
    '#ffffff', // white (remove highlight)
  ];

  // Save the current selection when opening the highlight picker
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      return selection.getRangeAt(0).cloneRange();
    }
    return null;
  };

  // Restore the saved selection
  const restoreSelection = (savedRange) => {
    if (savedRange) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
  };

  // Toggle highlight picker and save selection when opening
  const toggleHighlightPicker = () => {
    if (!showHighlightPicker) {
      // Save selection when opening the picker
      const currentSelection = saveSelection();
      setSavedSelection(currentSelection);
    }
    setShowHighlightPicker(!showHighlightPicker);
  };

  const handleHighlightClick = (color) => {
    setSelectedHighlight(color);
    
    // Restore the selection before applying the highlight
    restoreSelection(savedSelection);
    
    // Apply the highlight to the restored selection
    onHighlightChange(color);
    
    setShowHighlightPicker(false);
  };

  return (
    <div className="text-highlighter-container" style={{ position: 'relative' }}>
      <button 
        className="toolbar-button" 
        title="Highlight Text"
        onClick={toggleHighlightPicker}
        style={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
        <span 
          style={{ 
            marginLeft: '4px',
            backgroundColor: selectedHighlight,
            padding: '0 4px',
            borderRadius: '2px',
            color: selectedHighlight === '#ffffff' || selectedHighlight === '#ffff00' ? '#000' : '#fff'
          }}
        >
          A
        </span>
      </button>
      
      {showHighlightPicker && (
        <div 
          className="highlight-picker-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            backgroundColor: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: '8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}
        >
          {highlightColors.map((color) => (
            <div
              key={color}
              onClick={() => handleHighlightClick(color)}
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: color,
                borderRadius: '4px',
                cursor: 'pointer',
                border: color === selectedHighlight ? '2px solid #fff' : '1px solid #666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {color === '#ffffff' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TextHighlighter;
