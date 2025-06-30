import { useCallback } from 'react';

/**
 * Hook for handling editor commands (slash commands and context menu)
 */
const useEditorCommands = (
  editorRef, 
  setContextMenu, 
  setSlashCommandMenu, 
  setAiSidebar,
  restoreSelection,
  savedSelectionRef
) => {
  // Handle context menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    
    const selection = window.getSelection();
    const hasSelectedText = selection && 
                           selection.toString().trim().length > 0 && 
                           editorRef.current.contains(selection.anchorNode);
    
    setContextMenu({
      visible: true,
      position: { x: e.clientX, y: e.clientY },
      hasSelectedText
    });
  }, [editorRef, setContextMenu]);

  // Close context menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [setContextMenu]);

  // Close slash command menu
  const handleCloseSlashCommandMenu = useCallback(() => {
    setSlashCommandMenu(prev => ({ ...prev, visible: false }));
  }, [setSlashCommandMenu]);

  // Handle slash command actions
  const handleSlashCommandAction = useCallback((action) => {
    if (!editorRef.current) return;
    
    // Make sure we have the right selection
    restoreSelection();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Execute the command based on action type
    switch (action) {
      case 'heading':
        document.execCommand('formatBlock', false, 'h2');
        break;
      case 'list':
        document.execCommand('insertUnorderedList', false, null);
        break;
      case 'task':
        // Insert a task checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        
        // Insert the checkbox at the current position
        range.insertNode(checkbox);
        
        // Move cursor after the checkbox
        range.setStartAfter(checkbox);
        range.setEndAfter(checkbox);
        selection.removeAllRanges();
        selection.addRange(range);
        break;
      case 'blockquote':
        document.execCommand('formatBlock', false, 'blockquote');
        break;
      case 'image':
        // Open file picker to insert image
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const img = document.createElement('img');
              img.src = event.target.result;
              img.className = 'editor-image';
              
              // Insert the image at the current position
              restoreSelection();
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                selection.getRangeAt(0).insertNode(img);
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        break;
      case 'hr':
        document.execCommand('insertHorizontalRule', false, null);
        break;
      default:
        break;
    }
  }, [editorRef, restoreSelection]);

  // Handle context menu actions
  const handleContextMenuAction = useCallback((action, capturedText) => {
    // Close the context menu
    setContextMenu(prev => ({ ...prev, visible: false }));
    
    // Get the selected text
    const selection = window.getSelection();
    const selectedText = capturedText || (selection ? selection.toString() : '');
    
    if (!selectedText || selectedText.trim().length === 0) return;
    
    // Handle different actions
    switch (action) {
      case 'rewrite':
        // Show AI sidebar for rewriting
        setAiSidebar({
          visible: true,
          activeAction: 'rewrite',
          selectedText,
          processedText: '',
          isLoading: true,
          previewActive: false,
          previewRange: null
        });
        break;
      case 'proofread':
        // Show AI sidebar for proofreading
        setAiSidebar({
          visible: true,
          activeAction: 'proofread',
          selectedText,
          processedText: '',
          isLoading: true,
          previewActive: false,
          previewRange: null
        });
        break;
      default:
        break;
    }
  }, [setContextMenu, setAiSidebar]);

  // Handle keydown events for special keys
  const handleKeyDown = useCallback((e) => {
    // Check for Enter key to add placeholder to new paragraphs
    if (e.key === 'Enter') {
      // Use setTimeout to run after the new paragraph is created
      setTimeout(() => {
        const paragraphs = editorRef.current.querySelectorAll('p');
        paragraphs.forEach(para => {
          // Set placeholder attribute for all paragraphs
          if (!para.hasAttribute('data-placeholder')) {
            para.setAttribute('data-placeholder', 'Type "/" for commands');
          }
        });
      }, 0);
    }
    
    // Check for slash key to show command menu
    if (e.key === '/' && !setSlashCommandMenu.visible) {
      // Get current selection and cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Always prevent the '/' character from being inserted
        e.preventDefault();
        
        // Find the current line/paragraph containing the cursor
        let currentNode = selection.anchorNode;
        
        // If we're in a text node, get its parent element
        if (currentNode.nodeType === Node.TEXT_NODE) {
          currentNode = currentNode.parentNode;
        }
        
        // Find the block-level element (paragraph, div, etc.)
        while (currentNode && 
               currentNode !== editorRef.current && 
               currentNode.nodeType === Node.ELEMENT_NODE && 
               !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE'].includes(currentNode.tagName)) {
          currentNode = currentNode.parentNode;
        }
        
        // If we couldn't find a block element, use the editor itself
        if (!currentNode || currentNode === document.body) {
          currentNode = editorRef.current;
        }
        
        // Get the position of the beginning of the current line
        const rect = currentNode.getBoundingClientRect();
        
        // Create a temporary marker at the beginning of the line to get precise position
        const tempMarker = document.createElement('span');
        tempMarker.innerHTML = '&nbsp;';
        
        // Store the original selection
        const originalRange = range.cloneRange();
        
        // Move to the beginning of the current block element
        range.setStart(currentNode, 0);
        range.collapse(true);
        range.insertNode(tempMarker);
        
        // Get the exact position of the beginning of the line
        const markerRect = tempMarker.getBoundingClientRect();
        
        // Remove the temporary marker
        tempMarker.parentNode.removeChild(tempMarker);
        
        // Restore the original selection
        selection.removeAllRanges();
        selection.addRange(originalRange);
        
        // Show slash command menu at the beginning of the current line
        setSlashCommandMenu({
          visible: true,
          position: { x: markerRect.left, y: markerRect.top }
        });
      }
    }
  }, [editorRef, restoreSelection, setSlashCommandMenu]);

  return {
    handleContextMenu,
    handleCloseContextMenu,
    handleCloseSlashCommandMenu,
    handleSlashCommandAction,
    handleContextMenuAction,
    handleKeyDown
  };
};

export default useEditorCommands;
