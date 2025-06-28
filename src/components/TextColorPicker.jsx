import React, { useState, useEffect } from 'react';

const TextColorPicker = ({ onColorChange }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [savedSelection, setSavedSelection] = useState(null);
  
  const colors = [
    '#ffffff', // white
    '#ff6b6b', // red
    '#ffa502', // orange
    '#ffd43b', // yellow
    '#69db7c', // green
    '#4dabf7', // blue
    '#cc5de8', // purple
    '#868e96', // gray
  ];

  // Save the current selection when opening the color picker
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

  // Toggle color picker and save selection when opening
  const toggleColorPicker = () => {
    if (!showColorPicker) {
      // Save selection when opening the picker
      const currentSelection = saveSelection();
      setSavedSelection(currentSelection);
    }
    setShowColorPicker(!showColorPicker);
  };

  const handleColorClick = (color) => {
    setSelectedColor(color);
    
    // Restore the selection before applying the color
    restoreSelection(savedSelection);
    
    // Apply the color to the restored selection
    onColorChange(color);
    
    setShowColorPicker(false);
  };

  return (
    <div className="text-color-picker-container" style={{ position: 'relative' }}>
      <button 
        className="toolbar-button" 
        title="Text Color"
        onClick={toggleColorPicker}
        style={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span style={{ 
          display: 'inline-block', 
          width: '16px', 
          height: '16px', 
          backgroundColor: selectedColor,
          border: '1px solid #666',
          borderRadius: '3px'
        }}></span>
        <span style={{ marginLeft: '4px' }}>A</span>
      </button>
      
      {showColorPicker && (
        <div 
          className="color-picker-dropdown"
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
          {colors.map((color) => (
            <div
              key={color}
              onClick={() => handleColorClick(color)}
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: color,
                borderRadius: '4px',
                cursor: 'pointer',
                border: color === selectedColor ? '2px solid #fff' : '1px solid #666'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TextColorPicker;
