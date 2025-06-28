import React, { useRef, useEffect, useCallback, useState } from 'react';
import './Editor.css';
import ContextMenu from './ContextMenu';
import AISidebar from './AISidebar';
import { processWithGemini } from '../utils/geminiApi';

const Editor = ({ content, onContentChange, pageIndex, onEditorFocus, isLocked = false }) => {
  const [contextMenu, setContextMenu] = useState({ visible: false, position: { x: 0, y: 0 } });
  const [selectedText, setSelectedText] = useState('');
  const [aiSidebar, setAiSidebar] = useState({
    visible: false,
    activeAction: null,
    processedText: '',
    isLoading: false,
    selectedText: ''
  });
  const [selectedRange, setSelectedRange] = useState(null);
  const editorRef = useRef(null);
  const isUpdatingRef = useRef(false);
  const savedSelectionRef = useRef(null);

  // Save the current selection
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      savedSelectionRef.current = range;
      setSelectedRange(range.cloneRange());
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
        
        // Get the selected text
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0 && 
            editorRef.current && editorRef.current.contains(selection.anchorNode)) {
          setSelectedText(selection.toString());
        } else {
          setSelectedText('');
        }
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

  const handleContextMenu = (e) => {
    // Only show context menu if there is selected text
    if (selectedText.trim().length > 0) {
      e.preventDefault();
      setContextMenu({
        visible: true,
        position: { x: e.clientX, y: e.clientY }
      });
    }
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleContextMenuAction = async (action, capturedText) => {
    // Close the context menu
    setContextMenu({ ...contextMenu, visible: false });
    
    // Use the captured text passed from the context menu
    const textToProcess = capturedText || selectedText;
    
    // Show the AI sidebar with loading state and the selected text
    setAiSidebar({
      visible: true,
      activeAction: action,
      processedText: '',
      isLoading: true,
      selectedText: textToProcess
    });
    
    try {
      // Process the text with Gemini API
      const result = await processWithGemini(textToProcess, action);
      
      // Update the sidebar with the processed text
      setAiSidebar(prev => ({
        ...prev,
        processedText: result,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error processing text:', error);
      setAiSidebar(prev => ({
        ...prev,
        processedText: `Error: ${error.message || 'Failed to process text'}`,
        isLoading: false
      }));
    }
  };

  const handleApplyAIChanges = () => {
    if (!selectedRange || !aiSidebar.processedText) return;
    
    // Apply the changes to the editor
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(selectedRange);
    
    // Create a document fragment with the processed text
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = aiSidebar.processedText;
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
    
    // Replace the selected text with the processed text
    selectedRange.deleteContents();
    selectedRange.insertNode(fragment);
    
    // Trigger the onContentChange callback
    if (onContentChange) {
      onContentChange(pageIndex, editorRef.current.innerHTML, editorRef.current);
    }
    
    // Close the AI sidebar
    handleCancelAI();
  };
  
  const handleCancelAI = () => {
    setAiSidebar({
      visible: false,
      activeAction: null,
      processedText: '',
      isLoading: false,
      selectedText: ''
    });
  };

  return (
    <div className="editor-container">
      <div 
        className={`editor ${isLocked ? 'locked' : ''}`}
        contentEditable={!isLocked}
        ref={editorRef}
        onInput={handleInput}
        onFocus={handleFocus}
        onContextMenu={handleContextMenu}
        suppressContentEditableWarning={true}
      />
      {contextMenu.visible && (
        <ContextMenu 
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
          onAction={handleContextMenuAction}
        />
      )}
      {aiSidebar.visible && (
        <AISidebar
          isVisible={aiSidebar.visible}
          activeAction={aiSidebar.activeAction}
          selectedText={aiSidebar.selectedText}
          processedText={aiSidebar.processedText}
          isLoading={aiSidebar.isLoading}
          onApply={handleApplyAIChanges}
          onCancel={handleCancelAI}
        />
      )}
    </div>
  );
};

export default Editor;
