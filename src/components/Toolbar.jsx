import React from 'react';

const Toolbar = ({ executeEditorCommand }) => {
  const formatDoc = (command, value = null) => {
    console.log(`Formatting command: ${command} with value: ${value}`);
    executeEditorCommand(command, value);
  };

  const addLink = () => {
    const url = prompt('Enter the URL:');
    if (url) {
      formatDoc('createLink', url);
    }
  };

  const handleFontChange = (event) => {
    const selectedFont = event.target.value;
    if (selectedFont) {
      formatDoc('fontName', selectedFont);
    }
  };

  const handleButtonClick = (action, value = null) => {
    // Execute the action and prevent default button behavior
    if (typeof action === 'function') {
      action();
    }
  };

  return (
    <div className="toolbar-container">
      <div className="toolbar-group">
        <button onClick={() => handleButtonClick(() => formatDoc('undo'))} className="toolbar-button" title="Undo">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 10.707V17a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1h5.293l-1-1a1 1 0 010-1.414zM15 10.707L10 5.707V17h5v-6.293zM8 17V5.707L3 10.707V17h5z" clipRule="evenodd"/>
          </svg>
        </button>
        <button onClick={() => handleButtonClick(() => formatDoc('redo'))} className="toolbar-button" title="Redo">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.707 2.293a1 1 0 010 1.414l-1 1H16a1 1 0 011 1v13a1 1 0 01-1 1H4a1 1 0 01-1-1v-6.293l-1.707 1.707a1 1 0 01-1.414-1.414l7-7a1 1 0 011.414 0zM5 10.707L10 5.707V17H5v-6.293z" clipRule="evenodd"/>
          </svg>
        </button>
      </div>

      <div className="toolbar-group">
        <select 
          onChange={handleFontChange} 
          className="toolbar-select" 
          title="Font Family"
          defaultValue=""
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

      <div className="toolbar-group">
        <button onClick={() => handleButtonClick(() => formatDoc('formatBlock', 'h1'))} className="toolbar-button" title="Heading 1">H1</button>
        <button onClick={() => handleButtonClick(() => formatDoc('formatBlock', 'h2'))} className="toolbar-button" title="Heading 2">H2</button>
        <button onClick={() => handleButtonClick(() => formatDoc('formatBlock', 'h3'))} className="toolbar-button" title="Heading 3">H3</button>
        <button onClick={() => handleButtonClick(() => formatDoc('formatBlock', 'p'))} className="toolbar-button" title="Paragraph">P</button>
      </div>

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

      <div className="toolbar-group">
        <button onClick={() => handleButtonClick(addLink)} className="toolbar-button" title="Add Link">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
