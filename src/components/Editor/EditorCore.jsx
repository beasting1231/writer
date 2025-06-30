import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import './EditorCore.css';

/**
 * Core editor component that handles basic editing functionality
 */
const EditorCore = forwardRef(({ 
  content, 
  onContentChange, 
  onEditorFocus, 
  isLocked = false,
  onSelectionChange,
  onKeyDown
}, ref) => {
  const [isEmpty, setIsEmpty] = useState(true);
  const [placeholderText, setPlaceholderText] = useState('Start writing...');
  const editorRef = useRef(null);
  const isUpdatingRef = useRef(false);
  
  // Check if editor is empty and handle placeholders
  const checkIfEmpty = useCallback(() => {
    if (!editorRef.current) return;
    
    const editorContent = editorRef.current.innerText.trim();
    const wasEmpty = isEmpty;
    const nowEmpty = editorContent.length === 0;
    
    if (wasEmpty !== nowEmpty) {
      setIsEmpty(nowEmpty);
    }
  }, [isEmpty]);

  // Handle input events
  const handleInput = useCallback((e) => {
    if (isLocked) return;
    
    checkIfEmpty();
    
    // Update content if not being updated by AI
    if (!isUpdatingRef.current && onContentChange) {
      onContentChange(e, editorRef.current.innerHTML);
    }
  }, [checkIfEmpty, isLocked, onContentChange]);

  // Handle focus events
  const handleFocus = useCallback((e) => {
    if (onEditorFocus) {
      onEditorFocus();
    }
  }, [onEditorFocus]);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && content !== undefined && !isUpdatingRef.current) {
      // Only update if content has changed
      if (editorRef.current.innerHTML !== content) {
        editorRef.current.innerHTML = content || '';
        // Check if editor is empty after content update
        checkIfEmpty();
        
        // Initialize placeholders for paragraphs
        setTimeout(() => {
          const paragraphs = editorRef.current.querySelectorAll('p');
          paragraphs.forEach(para => {
            if (!para.hasAttribute('data-placeholder')) {
              para.setAttribute('data-placeholder', 'Type "/" for commands');
            }
          });
        }, 0);
      }
    }
  }, [content, checkIfEmpty]);

  // Apply default font when editor is initialized and set up mutation observer
  useEffect(() => {
    if (editorRef.current) {
      // Set default font to Helvetica
      editorRef.current.style.fontFamily = 'Helvetica, Arial, sans-serif';
      
      // Set up a mutation observer to detect when new paragraphs are added
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check for newly added paragraphs
            mutation.addedNodes.forEach((node) => {
              if (node.nodeName === 'P' && !node.hasAttribute('data-placeholder')) {
                node.setAttribute('data-placeholder', 'Type "/" for commands');
              }
            });
          }
        });
      });
      
      // Start observing the editor for changes
      observer.observe(editorRef.current, { childList: true, subtree: true });
      
      // Clean up the observer when component unmounts
      return () => observer.disconnect();
    }
  }, []);

  // Expose editor methods to parent components
  useImperativeHandle(ref, () => ({
    getEditorRef: () => editorRef.current,
    getIsUpdatingRef: () => isUpdatingRef,
    setIsUpdating: (value) => {
      isUpdatingRef.current = value;
    },
    checkIfEmpty
  }), [checkIfEmpty]);

  return (
    <div 
      className={`editor ${isLocked ? 'locked' : ''}`}
      contentEditable={!isLocked}
      ref={editorRef}
      onInput={handleInput}
      onFocus={handleFocus}
      onContextMenu={onSelectionChange}
      onKeyDown={onKeyDown}
      suppressContentEditableWarning={true}
      data-placeholder="Start writing..."
    />
  );
});

export default EditorCore;
