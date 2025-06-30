import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import './Editor.css';
import SlashCommandMenu from '../SlashCommandMenu/SlashCommandMenu';
import ContextMenu from '../ContextMenu/ContextMenu';
import AISidebar from '../AISidebar';
import AIPopover from '../AIPopover';
import { processWithGemini } from '../../utils/geminiApi';

/**
 * Main Editor component that integrates all editor functionality
 */
const Editor = forwardRef(({ content, onContentChange, pageIndex, onEditorFocus, isLocked = false }, ref) => {
  // Refs
  const editorRef = useRef(null);
  const isUpdatingRef = useRef(false);
  const savedSelectionRef = useRef(null);

  // State
  const [isEmpty, setIsEmpty] = useState(true);
  const [placeholderText] = useState('Start writing...');
  const [slashCommandMenu, setSlashCommandMenu] = useState({ visible: false, position: { x: 0, y: 0 } });
  const [contextMenu, setContextMenu] = useState({ visible: false, position: { x: 0, y: 0 }, hasSelectedText: false });
  const [selectedText, setSelectedText] = useState('');
  const [aiSidebar, setAiSidebar] = useState({
    visible: false,
    activeAction: null,
    processedText: '',
    isLoading: false,
    selectedText: '',
    previewActive: false,
    previewRange: null
  });
  const [aiPopover, setAiPopover] = useState({
    visible: false,
    position: null
  });
  const [proofreadingIssues, setProofreadingIssues] = useState([]);

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
      onEditorFocus(editorRef.current);
    }
  }, [onEditorFocus]);
  
  // Save current selection
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);
  
  // Restore saved selection
  const restoreSelection = useCallback(() => {
    const savedSelection = savedSelectionRef.current;
    if (savedSelection && editorRef.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelection);
      return true;
    }
    return false;
  }, []);
  
  // Handle selection change
  const handleSelectionChange = useCallback(() => {
    if (isUpdatingRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Check if selection is within editor
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;
    
    // Save the selection
    saveSelection();
    
    // Get selected text
    const text = selection.toString();
    setSelectedText(text);
  }, [saveSelection]);
  
  // Handle context menu
  const handleContextMenu = useCallback((e) => {
    if (isLocked) return;
    
    // Prevent default context menu
    e.preventDefault();
    
    // Save the current selection
    saveSelection();
    
    // Get selected text
    const selection = window.getSelection();
    const hasSelectedText = selection && selection.toString().trim().length > 0;
    
    // Show context menu
    setContextMenu({
      visible: true,
      position: { x: e.clientX, y: e.clientY },
      hasSelectedText
    });
  }, [isLocked, saveSelection]);
  
  // Handle closing the context menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({
      visible: false,
      position: { x: 0, y: 0 },
      hasSelectedText: false
    });
  }, []);
  
  // Handle keydown events
  const handleKeyDown = useCallback((e) => {
    if (e.key === '/' && !slashCommandMenu.visible) {
      // Check if cursor is at the start of a line
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Get the current node and check if it's at the start of a line
        const node = selection.anchorNode;
        const offset = selection.anchorOffset;
        
        // Only show slash menu if at start of line or paragraph
        if (offset === 0 || (node.nodeType === Node.TEXT_NODE && node.textContent.substring(0, offset).trim() === '')) {
          e.preventDefault(); // Prevent the '/' character from being inserted
          
          setSlashCommandMenu({
            visible: true,
            position: { x: rect.left, y: rect.bottom + 5 }
          });
        }
      }
    }
  }, [slashCommandMenu.visible]);
  
  // Handle closing the slash command menu
  const handleCloseSlashCommandMenu = useCallback(() => {
    setSlashCommandMenu({
      visible: false,
      position: { x: 0, y: 0 }
    });
  }, []);
  
  // Handle context menu actions
  const handleContextMenuAction = useCallback((action) => {
    // Close the menu first
    handleCloseContextMenu();
    
    // Focus the editor
    editorRef.current.focus();
    
    // Restore the selection
    restoreSelection();
    
    // Handle different actions
    switch (action) {
      case 'rewrite':
      case 'proofread':
        // Show AI sidebar with the selected text and action
        setAiSidebar(prev => ({
          ...prev,
          visible: true,
          activeAction: action,
          selectedText: selectedText,
          processedText: '',
          isLoading: false,
          previewActive: false,
          previewRange: null
        }));
        break;
        
      default:
        break;
    }
  }, [handleCloseContextMenu, restoreSelection, selectedText]);
  
  // Handle generate request from AI sidebar
  const handleGenerateRequest = useCallback(async (customInstructions, tone) => {
    // Get the current AI sidebar state
    let currentSelectedText = '';
    let currentAction = '';
    
    setAiSidebar(prev => {
      currentSelectedText = prev.selectedText;
      currentAction = prev.activeAction;
      
      // Update loading state
      return {
        ...prev,
        isLoading: true
      };
    });
    
    if (!currentSelectedText || currentSelectedText.trim().length === 0) {
      // Reset loading state if no text to process
      setAiSidebar(prev => ({
        ...prev,
        isLoading: false
      }));
      return;
    }
    
    try {
      // Process the text with Gemini API
      const processedText = await processWithGemini(
        currentSelectedText,
        currentAction,
        customInstructions,
        tone
      );
      
      // Update AI sidebar with processed text
      setAiSidebar(prev => ({
        ...prev,
        processedText,
        isLoading: false
      }));
      
      // Apply the preview
      applyPreview(processedText);
    } catch (error) {
      console.error('Error processing text with Gemini:', error);
      setAiSidebar(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to process text. Please try again.'
      }));
    }
  }, []);
  
  // Apply the AI-generated text as a preview in the editor
  const applyPreview = useCallback((processedText) => {
    if (!processedText || !editorRef.current) return;
    
    // Set flag to prevent selection change handlers from firing
    isUpdatingRef.current = true;
    
    // Try to restore the selection
    if (!restoreSelection()) {
      isUpdatingRef.current = false;
      return;
    }
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      isUpdatingRef.current = false;
      return;
    }
    
    // Get the current selection range
    const range = selection.getRangeAt(0);
    
    // Create a span with the AI preview text
    const previewSpan = document.createElement('span');
    previewSpan.className = 'ai-preview-text';
    previewSpan.textContent = processedText;
    
    // Replace the selected text with the preview span
    range.deleteContents();
    range.insertNode(previewSpan);
    
    // Save the range for later reference
    const previewRange = range.cloneRange();
    
    // Get position for the AI popover
    const rect = previewSpan.getBoundingClientRect();
    
    // Show the AI popover
    setAiPopover({
      visible: true,
      position: {
        x: rect.left,
        y: rect.top - 40 // Position above the text
      }
    });
    
    // Update AI sidebar state
    setAiSidebar(prev => ({
      ...prev,
      previewActive: true,
      previewRange: previewRange
    }));
    
    // Reset the updating flag
    isUpdatingRef.current = false;
  }, [restoreSelection]);
  
  // Handle approving the AI changes
  const handleApproveChanges = useCallback(() => {
    // Find all AI preview elements
    const previewElements = editorRef.current.querySelectorAll('.ai-preview-text');
    
    if (previewElements.length === 0) return;
    
    // Set flag to prevent selection change handlers from firing
    isUpdatingRef.current = true;
    
    // Replace each preview element with its text content
    previewElements.forEach(element => {
      const textNode = document.createTextNode(element.textContent);
      element.parentNode.replaceChild(textNode, element);
    });
    
    // Hide the AI popover
    setAiPopover({
      visible: false,
      position: null
    });
    
    // Update AI sidebar state
    setAiSidebar(prev => ({
      ...prev,
      visible: false,
      previewActive: false,
      previewRange: null
    }));
    
    // Reset the updating flag
    isUpdatingRef.current = false;
    
    // Trigger content change
    if (onContentChange) {
      onContentChange({ type: 'aiApprove' }, editorRef.current.innerHTML);
    }
  }, [onContentChange]);
  
  // Handle regenerating the AI content
  const handleRegenerate = useCallback(async () => {
    // Get the selected text and active action from the AI sidebar state
    let selectedText = '';
    let activeAction = '';
    
    // Get current values from state
    setAiSidebar(prev => {
      selectedText = prev.selectedText;
      activeAction = prev.activeAction;
      return prev; // Don't change state
    });
    
    if (!selectedText || selectedText.trim().length === 0) return;
    
    // Remove existing preview
    // First hide the AI popover
    setAiPopover({
      visible: false,
      position: null
    });
    
    // Remove any existing preview elements
    const previewElements = editorRef.current.querySelectorAll('.ai-preview-text');
    if (previewElements.length > 0) {
      // Set flag to prevent selection change handlers from firing
      isUpdatingRef.current = true;
      
      // Replace each preview element with the original selected text
      previewElements.forEach(element => {
        const textNode = document.createTextNode(selectedText);
        element.parentNode.replaceChild(textNode, element);
      });
      
      // Reset the updating flag
      isUpdatingRef.current = false;
    }
    
    // Update loading state
    setAiSidebar(prev => ({
      ...prev,
      visible: true,
      isLoading: true,
      previewActive: false,
      previewRange: null
    }));
    
    try {
      // Process the text with Gemini API
      const processedText = await processWithGemini(
        selectedText,
        activeAction
      );
      
      // Update AI sidebar with processed text
      setAiSidebar(prev => ({
        ...prev,
        processedText,
        isLoading: false
      }));
      
      // Apply the preview
      applyPreview(processedText);
    } catch (error) {
      console.error('Error processing text with Gemini:', error);
      setAiSidebar(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to process text. Please try again.'
      }));
    }
  }, [applyPreview]);
  
  // Handle proofreading the entire chapter
  const handleProofreadChapter = useCallback(async () => {
    if (!editorRef.current || isLocked) return;
    
    // Get the entire content of the editor
    const content = editorRef.current.innerHTML;
    const textContent = editorRef.current.textContent;
    
    if (!textContent || textContent.trim().length === 0) return;
    
    // Set loading state
    setAiSidebar(prev => ({
      ...prev,
      visible: true,
      activeAction: 'proofread',
      selectedText: textContent,
      processedText: '',
      isLoading: true,
      previewActive: false,
      previewRange: null
    }));
    
    try {
      // Process the text with Gemini API for proofreading
      const processedText = await processWithGemini(
        textContent,
        'proofread'
      );
      
      // Parse the proofreading issues (simplified for now)
      const issues = [
        {
          id: 'issue-1',
          type: 'grammar',
          description: 'Grammar issue detected',
          suggestion: processedText
        }
      ];
      
      // Update proofreading issues
      setProofreadingIssues(issues);
      
      // Update AI sidebar
      setAiSidebar(prev => ({
        ...prev,
        processedText,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error proofreading chapter:', error);
      setAiSidebar(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to proofread text. Please try again.'
      }));
    }
  }, [isLocked]);
  
  // Handle canceling AI changes
  const handleCancelAI = useCallback(() => {
    // Find all AI preview elements
    const previewElements = editorRef.current.querySelectorAll('.ai-preview-text');
    
    if (previewElements.length === 0) {
      // If no preview elements, just hide the sidebar and popover
      setAiSidebar(prev => ({
        ...prev,
        visible: false,
        previewActive: false,
        previewRange: null
      }));
      
      setAiPopover({
        visible: false,
        position: null
      });
      
      return;
    }
    
    // Set flag to prevent selection change handlers from firing
    isUpdatingRef.current = true;
    
    // Get the selected text from state
    let selectedText = '';
    setAiSidebar(prev => {
      selectedText = prev.selectedText;
      return prev; // Don't change state
    });
    
    // Replace each preview element with the original selected text
    previewElements.forEach(element => {
      const textNode = document.createTextNode(selectedText);
      element.parentNode.replaceChild(textNode, element);
    });
    
    // Hide the AI popover
    setAiPopover({
      visible: false,
      position: null
    });
    
    // Update AI sidebar state
    setAiSidebar(prev => ({
      ...prev,
      visible: false,
      previewActive: false,
      previewRange: null
    }));
    
    // Reset the updating flag
    isUpdatingRef.current = false;
  }, []);
  
  // Handle slash command actions
  const handleSlashCommandAction = useCallback((action) => {
    // Close the menu first
    handleCloseSlashCommandMenu();
    
    // Focus the editor
    editorRef.current.focus();
    
    // Get current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    // Create a new range at the current position
    const range = selection.getRangeAt(0);
    
    // Set flag to prevent selection change handlers from firing
    isUpdatingRef.current = true;
    
    // Handle different actions
    switch (action) {
      case 'heading':
        // Insert a heading element
        const heading = document.createElement('h2');
        heading.setAttribute('data-placeholder', 'Heading');
        heading.innerHTML = '<br>';
        range.insertNode(heading);
        
        // Move cursor inside the heading
        range.selectNodeContents(heading);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        break;
        
      case 'bullet-list':
        // Insert a bullet list
        const ul = document.createElement('ul');
        const li = document.createElement('li');
        li.setAttribute('data-placeholder', 'List item');
        li.innerHTML = '<br>';
        ul.appendChild(li);
        range.insertNode(ul);
        
        // Move cursor inside the list item
        range.selectNodeContents(li);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        break;
        
      case 'numbered-list':
        // Insert a numbered list
        const ol = document.createElement('ol');
        const oli = document.createElement('li');
        oli.setAttribute('data-placeholder', 'List item');
        oli.innerHTML = '<br>';
        ol.appendChild(oli);
        range.insertNode(ol);
        
        // Move cursor inside the list item
        range.selectNodeContents(oli);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        break;
        
      case 'blockquote':
        // Insert a blockquote
        const blockquote = document.createElement('blockquote');
        blockquote.setAttribute('data-placeholder', 'Quote');
        blockquote.innerHTML = '<br>';
        range.insertNode(blockquote);
        
        // Move cursor inside the blockquote
        range.selectNodeContents(blockquote);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        break;
        
      default:
        break;
    }
    
    // Reset the updating flag
    isUpdatingRef.current = false;
    
    // Trigger content change
    if (onContentChange) {
      onContentChange({ type: 'slashCommand', action }, editorRef.current.innerHTML);
    }
  }, [handleCloseSlashCommandMenu, onContentChange]);

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

  // Set up selection change listener
  useEffect(() => {
    const handleDocSelectionChange = () => {
      handleSelectionChange();
    };

    document.addEventListener('selectionchange', handleDocSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleDocSelectionChange);
    };
  }, [handleSelectionChange]);
  
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

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    proofreadChapter: () => {
      console.log('Proofreading chapter...');
      // This is a placeholder for the actual proofreading functionality
    }
  }), []);

  return (
    <div className="editor-container">
      <div 
        className={`editor ${isLocked ? 'locked' : ''}`}
        contentEditable={!isLocked}
        ref={editorRef}
        onInput={handleInput}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        suppressContentEditableWarning={true}
        data-placeholder={placeholderText}
      />
      
      {/* Context Menu */}
      {contextMenu.visible && (
        <ContextMenu 
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
          onAction={handleContextMenuAction}
          hasSelectedText={contextMenu.hasSelectedText}
        />
      )}
      
      {/* Slash Command Menu */}
      {slashCommandMenu.visible && (
        <SlashCommandMenu
          position={slashCommandMenu.position}
          onClose={handleCloseSlashCommandMenu}
          onAction={handleSlashCommandAction}
        />
      )}
      
      {/* AI Sidebar */}
      <AISidebar
        isVisible={aiSidebar.visible}
        activeAction={aiSidebar.activeAction}
        selectedText={aiSidebar.selectedText}
        processedText={aiSidebar.processedText}
        isLoading={aiSidebar.isLoading}
        onApply={handleApproveChanges}
        onCancel={handleCancelAI}
        onRegenerate={handleRegenerate}
        onGenerateRequest={handleGenerateRequest}
        proofreadingIssues={proofreadingIssues}
      />
      
      {/* AI Popover */}
      {aiPopover.visible && aiPopover.position && (
        <AIPopover
          position={aiPopover.position}
          onApprove={handleApproveChanges}
          onDiscard={handleCancelAI}
          onRegenerate={handleRegenerate}
        />
      )}
    </div>
  );
});

export default Editor;
