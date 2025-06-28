import React, { useRef, useEffect } from 'react';

const Editor = ({ content, onContentChange, pageIndex, onEditorFocus }) => {
  const editorRef = useRef(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content && !isUpdatingRef.current) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const handleInput = (e) => {
    if (onContentChange) {
      isUpdatingRef.current = true;
      onContentChange(pageIndex, e.target.innerHTML, editorRef.current);
      // Reset the flag after a short delay to allow for formatting operations
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }
  };

  const handleFocus = (e) => {
    console.log("Editor focused", pageIndex);
    if (onEditorFocus) {
      onEditorFocus(editorRef.current);
    }
  };

  return (
    <div 
      className="editor"
      contentEditable="true"
      ref={editorRef}
      onInput={handleInput}
      onFocus={handleFocus}
      suppressContentEditableWarning={true}
    />
  );
};

export default Editor;
