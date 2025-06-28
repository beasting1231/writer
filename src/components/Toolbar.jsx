import React from 'react';
import TextSizeControl from './TextSizeControl';
import { applyFontSize } from '../utils/textFormatting';

const Toolbar = ({ executeEditorCommand, editorRef }) => {
  const formatDoc = (command, value = null) => {
    console.log(`Formatting command: ${command} with value: ${value}`);
    executeEditorCommand(command, value);
  };

  // Link functionality removed as requested

  const handleFontChange = (event) => {
    const selectedFont = event.target.value;
    if (selectedFont) {
      formatDoc('fontName', selectedFont);
    }
  };

  const handleButtonClick = (action, value = null) => {
    // Execute the action and prevent default button behavior
    if (typeof action === 'function') {
      // Save the current selection before executing the action
      const selection = window.getSelection();
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      
      // If we have an editor reference, save the current selection
      if (editorRef && editorRef.current) {
        const editor = editorRef.current;
        if (range && editor.contains(range.commonAncestorContainer)) {
          // Save the selection relative to the editor
          const savedRange = range.cloneRange();
          action();
          
          // Restore the selection
          try {
            selection.removeAllRanges();
            selection.addRange(savedRange);
            editor.focus();
          } catch (e) {
            console.error('Error restoring selection:', e);
          }
          return;
        }
      }
      
      // Fallback for when we don't have a valid editor reference
      action();
    }
  };

  return (
    <div className="toolbar-container">
      <div className="toolbar-group">
        <button onClick={() => handleButtonClick(() => formatDoc('undo'))} className="toolbar-button" title="Undo">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8z" />
            <path d="M12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
          </svg>
        </button>
        <button onClick={() => handleButtonClick(() => formatDoc('redo'))} className="toolbar-button" title="Redo">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M12 5a1 1 0 100 2h-5.586l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 1.414L6.414 5H12z" />
            <path d="M8 15a1 1 0 100-2h5.586l-1.293-1.293a1 1 0 011.414-1.414l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L14.586 15H8z" />
          </svg>
        </button>
      </div>

      <div className="toolbar-group">
        <select 
          onChange={handleFontChange} 
          className="toolbar-select" 
          title="Font Family"
          defaultValue="Helvetica"
        >
          <option value="" disabled>Font</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Courier New">Courier New</option>
          <option value="Verdana">Verdana</option>
          <option value="Trebuchet MS">Trebuchet MS</option>
          <option value="Impact">Impact</option>
          <option value="Comic Sans MS">Comic Sans MS</option>
        </select>
      </div>

      {/* Line Height Selector */}
      <div className="toolbar-group">
        <input
          type="number"
          min="1"
          max="3"
          step="0.05"
          defaultValue="1.6"
          className="toolbar-lineheight-input"
          title="Line Height"
          style={{ width: '80px', background: '#4f4f4f', color: '#f0f0f0', border: 'none', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '14px' }}
          onChange={e => formatDoc('lineHeight', e.target.value)}
          onBlur={e => formatDoc('lineHeight', e.target.value)}
          placeholder="Line Height"
        />
      </div>

      <div className="toolbar-group">
        <button onClick={() => handleButtonClick(() => formatDoc('bold'))} className="toolbar-button" title="Bold"><b>B</b></button>
        <button onClick={() => handleButtonClick(() => formatDoc('italic'))} className="toolbar-button" title="Italic"><i>I</i></button>
        <button onClick={() => handleButtonClick(() => formatDoc('underline'))} className="toolbar-button" title="Underline"><u>U</u></button>
      </div>

      <TextSizeControl onSizeChange={(size) => {
        if (editorRef && editorRef.current) {
          applyFontSize(editorRef.current, size);
        }
      }} />

      <div className="toolbar-group">
        <button onClick={() => handleButtonClick(() => formatDoc('justifyleft'))} className="toolbar-button" title="Align Left">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
          </svg>
        </button>
        <button onClick={() => handleButtonClick(() => formatDoc('justifycenter'))} className="toolbar-button" title="Align Center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3 5a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd"/>
          </svg>
        </button>
        <button onClick={() => handleButtonClick(() => formatDoc('justifyright'))} className="toolbar-button" title="Align Right">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
          </svg>
        </button>
      </div>

      <div className="toolbar-group">
        <button onClick={() => handleButtonClick(() => formatDoc('insertorderedlist'))} className="toolbar-button" title="Ordered List">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 4a1 1 0 00-2 0v1h-1a1 1 0 000 2h1v1a1 1 0 002 0V7h1a1 1 0 100-2H5V4zM5 11a1 1 0 100-2H4a1 1 0 100 2h1zm-1 3a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2H4v-1zm11-8a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1zm0 5a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1zm0 5a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1z" clipRule="evenodd"/>
          </svg>
        </button>
        <button onClick={() => handleButtonClick(() => formatDoc('insertunorderedlist'))} className="toolbar-button" title="Unordered List">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
          </svg>
        </button>
      </div>

      {/* Link button removed as requested */}
    </div>
  );
};

export default Toolbar;
