import React, { useState } from 'react';

const TextSizeControl = ({ onSizeChange }) => {
  const [size, setSize] = useState(16);
  
  // Text size options
  const textSizes = [12, 16, 24, 36];
  
  // Handle size selection
  const selectSize = (pixelSize) => {
    setSize(pixelSize);
    onSizeChange(pixelSize);
  };

  return (
    <div className="text-size-control" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ color: '#f0f0f0', fontSize: '14px', marginRight: '4px' }}>Size:</span>
      
      <div className="size-buttons" style={{ display: 'flex', gap: '4px' }}>
        {textSizes.map(pixelSize => (
          <button 
            key={pixelSize}
            onClick={() => selectSize(pixelSize)} 
            className="toolbar-button" 
            style={{ 
              fontSize: `${Math.min(pixelSize, 20)}px`, 
              padding: '4px 8px', 
              minWidth: '32px',
              fontWeight: size === pixelSize ? 'bold' : 'normal',
              backgroundColor: size === pixelSize ? '#444' : '#333',
              borderRadius: '4px',
              border: size === pixelSize ? '1px solid #666' : '1px solid #444',
            }}
            title={`${pixelSize}px`}
          >A</button>
        ))}
      </div>
    </div>
  );
};

export default TextSizeControl;
