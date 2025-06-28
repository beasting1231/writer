import React, { useRef, useEffect, useCallback } from 'react';
import './Editor.css';

const Editor = ({ content, onContentChange, pageIndex, onEditorFocus, isLocked = false }) => {
  const editorRef = useRef(null);
  const isUpdatingRef = useRef(false);
  const savedSelectionRef = useRef(null);

  // Save the current selection
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
      savedSelectionRef.current = selection.getRangeAt(0);
    }
  }, []);

  // Restore the saved selection
  const restoreSelection = useCallback(() => {
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelectionRef.current);
      return true;
    }
    return false;
  }, []);

  // Add event listeners to save selection when it changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleSelectionChange = () => {
      if (!isUpdatingRef.current) {
        saveSelection();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [saveSelection]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content && !isUpdatingRef.current) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  // Apply default font when editor is initialized
  useEffect(() => {
    if (editorRef.current) {
      // Set default font to Helvetica
      editorRef.current.style.fontFamily = 'Helvetica, Arial, sans-serif';
    }
  }, []);

  const handleInput = (e) => {
    if (isLocked) return; // Prevent editing if locked
    
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
    <div className="editor-container">
      <div 
        className={`editor ${isLocked ? 'locked' : ''}`}
        contentEditable={!isLocked}
        ref={editorRef}
        onInput={handleInput}
        onFocus={handleFocus}
        suppressContentEditableWarning={true}
      />
    </div>
  );
};

export default Editor;
