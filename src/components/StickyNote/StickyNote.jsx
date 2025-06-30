import React, { useState, useRef, useEffect } from 'react';
import './StickyNote.css';

const StickyNote = ({ id, initialPosition, onClose, pageIndex }) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState({ width: 200, height: 200 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const noteRef = useRef(null);
  const contentRef = useRef(null);

  // Handle dragging the note
  const handleMouseDown = (e) => {
    if (e.target.classList.contains('sticky-note-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  // Handle resizing from bottom-right corner only
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  // Handle mouse movement for both dragging and resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      } else if (isResizing) {
        const newWidth = Math.max(150, resizeStart.width + (e.clientX - resizeStart.x));
        const newHeight = Math.max(100, resizeStart.height + (e.clientY - resizeStart.y));
        setSize({
          width: newWidth,
          height: newHeight
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, resizeStart]);

  // Toggle minimize state
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <div
      ref={noteRef}
      className={`sticky-note ${isMinimized ? 'minimized' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isMinimized ? 'auto' : `${size.height}px`
      }}
      onMouseDown={handleMouseDown}
      data-page-index={pageIndex}
    >
      <div className="sticky-note-header">
        <div className="sticky-note-controls">
          <button className="sticky-note-minimize" onClick={toggleMinimize}>
            {isMinimized ? '□' : '−'}
          </button>
          <button className="sticky-note-close" onClick={() => onClose(id)}>×</button>
        </div>
      </div>
      
      {!isMinimized && (
        <div 
          className="sticky-note-content" 
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning={true}
        ></div>
      )}
      
      {!isMinimized && (
        <div className="resize-handle" onMouseDown={handleResizeStart}></div>
      )}
    </div>
  );
};

export default StickyNote;
