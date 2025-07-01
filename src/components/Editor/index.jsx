import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import './Editor.css';
import SlashCommandMenu from '../SlashCommandMenu/SlashCommandMenu';
import ContextMenu from '../ContextMenu/ContextMenu';
import AISidebar from '../AISidebar';
import AIPopover from '../AIPopover';
import { processWithGemini } from '../../utils/geminiApi';
import { normalizeHTML } from '../../utils/domUtils';

/**
 * Main Editor component that integrates all editor functionality
 */
const Editor = forwardRef(({ content, chapterId, onContentChange, pageIndex, onEditorFocus, isLocked = false }, ref) => {
  // Refs
  const editorRef = useRef(null);
  const isUpdatingRef = useRef(false);
  const savedSelectionRef = useRef(null);

  // State
  const [isEmpty, setIsEmpty] = useState(true);
  const [placeholderText] = useState('Type "/" for commands');
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

  // Check if editor is empty
  const checkIfEmpty = useCallback(() => {
    console.log('Checking if editor is empty');
    if (!editorRef.current) {
      console.log('Editor ref is null, cannot check if empty');
      return;
    }

    const editorContent = editorRef.current.innerText.trim();
    const nowEmpty = editorContent.length === 0;
    console.log('Editor content length:', editorContent.length, 'Empty:', nowEmpty);

    // By using the functional update form of setState, we can get the previous
    // state without having to list `isEmpty` as a dependency of `useCallback`.
    // This makes `checkIfEmpty` a stable function across re-renders,
    // which prevents the infinite loop in the `useEffect` that uses it.
    setIsEmpty(prevIsEmpty => {
      if (prevIsEmpty !== nowEmpty) {
        console.log('Empty state changed from', prevIsEmpty, 'to', nowEmpty);
        return nowEmpty;
      }
      return prevIsEmpty;
    });
  }, []); // Empty dependency array makes this function stable

const updateActivePlaceholder = useCallback(() => {
    console.log('--- updateActivePlaceholder START ---');
    if (!editorRef.current) {
      console.log('Editor ref is null, exiting');
      return;
    }
    
    // First, ensure the editor has at least one paragraph if it's empty
    if (editorRef.current.innerHTML.trim() === '') {
      console.log('Editor is completely empty, adding initial paragraph');
      editorRef.current.innerHTML = '<p><br></p>';
    }
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.log('No selection or range, exiting');
      return;
    }

    const range = selection.getRangeAt(0);
    console.log('Selection range:', {
      startContainer: range.startContainer.nodeName,
      startOffset: range.startOffset,
      endContainer: range.endContainer.nodeName,
      endOffset: range.endOffset,
      collapsed: range.collapsed
    });

    // Find the nearest block element (P or DIV) within the editor
    let node = range.startContainer;
    console.log('Initial node:', node.nodeName, 'nodeType:', node.nodeType);
    
    // If we're in a text node, we need to get its parent
    if (node.nodeType === Node.TEXT_NODE) {
      console.log('Node is a text node, content:', JSON.stringify(node.textContent));
      node = node.parentNode;
    }
    
    // Continue traversing up until we find a P or DIV
    while (node && node !== editorRef.current && !(node.nodeName === 'P' || node.nodeName === 'DIV')) {
      console.log('Traversing up from', node.nodeName, 'to', node.parentNode ? node.parentNode.nodeName : 'null');
      node = node.parentNode;
    }
    
    // If we didn't find a suitable block element, create one
    if (!node || node === editorRef.current) {
      console.log('No suitable block element found, creating one');
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      
      // Insert at cursor position
      range.deleteContents();
      range.insertNode(p);
      
      // Set the node to our new paragraph
      node = p;
      
      // Move cursor into the paragraph
      const newRange = document.createRange();
      newRange.setStart(p, 0);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    console.log('Found containing block:', node ? node.nodeName : 'null');
    if (node) {
      console.log('Block content:', JSON.stringify(node.innerText));
      console.log('Block HTML:', JSON.stringify(node.innerHTML));
      console.log('Is empty?', node.innerText.trim() === '' || node.innerHTML === '<br>' || node.innerHTML === '');
    }

    // Log all elements with placeholders before removing
    console.log('Elements with placeholders before clearing:');
    editorRef.current.querySelectorAll('[data-placeholder]').forEach((el, i) => {
      console.log(`Element ${i}:`, el.nodeName, 'placeholder:', el.getAttribute('data-placeholder'));
    });

    // Remove placeholders from all blocks
    editorRef.current.querySelectorAll('[data-placeholder]').forEach(el => {
      console.log('Removing placeholder from:', el.nodeName);
      el.removeAttribute('data-placeholder');
    });

    // Add placeholder only to the active block/line if it is empty
    if (node && node !== editorRef.current && (node.innerText.trim() === '' || node.innerHTML === '<br>' || node.innerHTML === '')) {
      console.log('Adding placeholder to node:', node.nodeName);
      
      // Check if this is the first paragraph in the editor
      const isFirstParagraph = isNodeFirstParagraph(node);
      console.log('Is first paragraph:', isFirstParagraph);
      
      // Use different placeholder text for first paragraph
      const placeholderText = isFirstParagraph ? 'Start writing...' : 'Type "/" for commands';
      node.setAttribute('data-placeholder', placeholderText);
    } else {
      console.log('Not adding placeholder because:', {
        nodeExists: !!node,
        isEditorRef: node === editorRef.current,
        isEmpty: node ? (node.innerText.trim() === '' || node.innerHTML === '<br>' || node.innerHTML === '') : false
      });
    }
    
    // Log all elements with placeholders after adding
    console.log('Elements with placeholders after update:');
    editorRef.current.querySelectorAll('[data-placeholder]').forEach((el, i) => {
      console.log(`Element ${i}:`, el.nodeName, 'placeholder:', el.getAttribute('data-placeholder'));
    });
    
    console.log('--- updateActivePlaceholder END ---');
  }, []);
  
  // Helper function to check if a node is the first paragraph in the editor
  const isNodeFirstParagraph = useCallback((node) => {
    if (!node || !editorRef.current) return false;
    
    // Get all block elements in the editor
    const blocks = Array.from(editorRef.current.querySelectorAll('p, div'));
    
    // If there are no blocks or this is the first block
    return blocks.length === 0 || node === blocks[0];
  }, []);

  // Handle input events
  const handleInput = useCallback((e) => {
    console.log('Input event detected');
    // Update placeholders on any input change
    console.log('Editor HTML before updateActivePlaceholder:', editorRef.current.innerHTML);
    
    // Delay the placeholder update slightly to ensure the DOM is updated
    setTimeout(() => {
      updateActivePlaceholder();
    }, 0);
    
    if (isLocked || isUpdatingRef.current) {
      console.log('Editor is locked or updating, skipping content change');
      return;
    }
    
    checkIfEmpty();
    
    if (onContentChange) {
      console.log('Calling onContentChange');
      onContentChange(pageIndex, editorRef.current.innerHTML);
    }
  }, [checkIfEmpty, isLocked, onContentChange, pageIndex, updateActivePlaceholder]);

  // Handle focus events
  const handleFocus = useCallback((e) => {
    console.log('Editor focused');
    if (onEditorFocus) {
      onEditorFocus(editorRef.current);
    }
    // Update placeholder when editor is focused
    updateActivePlaceholder();
  }, [onEditorFocus, updateActivePlaceholder]);
  
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
  

  const handleSelectionChange = useCallback(() => {
    console.log('--- handleSelectionChange START ---');
    // If the selection is changing due to a programmatic update, we reset the
    // flag and ignore the event. This is the key to breaking the infinite loop.
    if (isUpdatingRef.current) {
      console.log('isUpdatingRef is true, resetting and ignoring event');
      isUpdatingRef.current = false;
      return;
    }
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.log('No selection or range, exiting handleSelectionChange');
      return;
    }
    
    const range = selection.getRangeAt(0);
    console.log('Selection range in handleSelectionChange:', {
      startContainer: range.startContainer.nodeName,
      startOffset: range.startOffset,
      endContainer: range.endContainer.nodeName,
      endOffset: range.endOffset,
      collapsed: range.collapsed
    });
    
    // Check if selection is within editor
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      console.log('Selection is outside editor, exiting handleSelectionChange');
      return;
    }
    
    // Save the selection
    console.log('Saving selection');
    saveSelection();

    // Update placeholders so only the active empty block shows the hint
    console.log('Calling updateActivePlaceholder from handleSelectionChange');
    updateActivePlaceholder();
    
    // Get selected text
    const text = selection.toString();
    console.log('Selected text:', JSON.stringify(text));
    setSelectedText(text);

    console.log('--- handleSelectionChange END ---');
  }, [saveSelection, updateActivePlaceholder]);
  
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
    // Close the slash command menu when pressing Enter/Return
    if ((e.key === 'Enter' || e.key === 'Return') && slashCommandMenu.visible) {
      e.preventDefault();
      setSlashCommandMenu({
        visible: false,
        position: slashCommandMenu.position
      });
      return;
    }
    
    // Close the slash command menu when typing any character except for arrow keys, shift, ctrl, etc.
    if (slashCommandMenu.visible && 
        e.key.length === 1 && // Single character keys (letters, numbers, symbols)
        !e.ctrlKey && !e.metaKey && !e.altKey) {
      setSlashCommandMenu({
        visible: false,
        position: slashCommandMenu.position
      });
      // Don't prevent default here so the character gets typed
    }
    
    // Open the slash command menu when typing '/' at the beginning of a line
    if (e.key === '/' && !slashCommandMenu.visible) {
      // Get the current selection
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Check if we're at the beginning of a line
        const isAtLineStart = isSelectionAtLineStart(selection);
        
        // Only proceed if we're at the beginning of a line
        if (isAtLineStart) {
          // For empty lines or when getBoundingClientRect() returns zero dimensions
          // we need to use the caret position instead
          let rect = range.getBoundingClientRect();
          
          // Check if we have a valid rect with dimensions
          if (rect.width === 0 && rect.height === 0) {
            // Create a temporary span to get the position
            const span = document.createElement('span');
            span.innerHTML = '&nbsp;'; // Non-breaking space
            
            // Insert the span at the current selection
            range.insertNode(span);
            
            // Get the position of the span
            rect = span.getBoundingClientRect();
            
            // Remove the span
            span.parentNode.removeChild(span);
            
            // Restore the selection
            selection.removeAllRanges();
            selection.addRange(range);
          }
          
          // Calculate position with a small offset below the cursor
          const cursorX = rect.left;
          const cursorY = rect.bottom + 5; // Position below the cursor
          
          // Prevent the '/' character from being inserted
          e.preventDefault();
          
          // Save the current caret position to restore later
          saveSelection();
          
          // Show the slash command menu at the cursor position
          setSlashCommandMenu({
            visible: true,
            position: { x: cursorX, y: cursorY }
          });
        }
      }
    }
  }, [slashCommandMenu.visible, slashCommandMenu.position, saveSelection]);
  
  // Helper function to check if selection is at the beginning of a line
  const isSelectionAtLineStart = (selection) => {
    if (!selection || selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    const offset = range.startOffset;
    
    // If we're in a text node
    if (node.nodeType === Node.TEXT_NODE) {
      // At the beginning of the text node
      if (offset === 0) {
        // Check if there's a BR or block element before this node
        let currentNode = node;
        let previousNode = null;
        
        // Traverse up to find the nearest block-level parent
        while (currentNode && currentNode.parentNode) {
          previousNode = currentNode.previousSibling;
          
          // If we found a previous sibling
          if (previousNode) {
            // Check if it's a BR or a block element
            if (previousNode.nodeName === 'BR' || 
                previousNode.nodeName === 'DIV' || 
                previousNode.nodeName === 'P') {
              return true;
            }
            
            // If it's a text node with a newline at the end
            if (previousNode.nodeType === Node.TEXT_NODE && 
                previousNode.textContent.endsWith('\n')) {
              return true;
            }
            
            // Otherwise, we're not at the start of a line
            return false;
          }
          
          // Move up to parent
          currentNode = currentNode.parentNode;
        }
        
        // If we've reached the top without finding a previous sibling, we're at the start
        return true;
      }
      
      // Check if there's a newline character right before the cursor
      if (offset > 0) {
        const textBefore = node.textContent.substring(0, offset);
        return textBefore.endsWith('\n') || textBefore.trim() === '';
      }
    }
    
    // If we're at the beginning of an element node
    if (node.nodeType === Node.ELEMENT_NODE) {
      // If we're at the start of the element
      if (offset === 0) {
        return true;
      }
      
      // If we're inside a contentEditable div at the beginning of a line
      if (node.getAttribute && node.getAttribute('contenteditable') === 'true') {
        // Check if we're after a BR element
        const childNodes = Array.from(node.childNodes);
        if (offset > 0 && childNodes[offset - 1] && 
            (childNodes[offset - 1].nodeName === 'BR' || 
             childNodes[offset - 1].nodeName === 'DIV' || 
             childNodes[offset - 1].nodeName === 'P')) {
          return true;
        }
      }
    }
    
    return false;
  };
  
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
    
    // Restore the saved caret position
    restoreSelection();
    
    // Get current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    // Create a new range at the current position
    const range = selection.getRangeAt(0);
    
    // Set flag to prevent selection change handlers from firing
    isUpdatingRef.current = true;
    
    // Handle different actions
    switch (action) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
        // Insert a heading element of the specified level
        const headingLevel = action; // h1, h2, h3, h4, or h5
        const heading = document.createElement(headingLevel);
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
        
      case 'hr':
        // Insert a horizontal rule
        const hr = document.createElement('hr');
        range.insertNode(hr);
        
        // Insert a new paragraph after the horizontal rule for continued typing
        const pAfterHr = document.createElement('p');
        pAfterHr.innerHTML = '<br>';
        if (hr.nextSibling) {
          hr.parentNode.insertBefore(pAfterHr, hr.nextSibling);
        } else {
          hr.parentNode.appendChild(pAfterHr);
        }
        
        // Move cursor into the new paragraph
        range.setStart(pAfterHr, 0);
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
  }, [handleCloseSlashCommandMenu, restoreSelection, onContentChange]);

  // Sync content from props
  useEffect(() => {
    if (editorRef.current) {
      // To prevent infinite loops, we compare normalized versions of the HTML.
      // Browsers can change the innerHTML string (e.g., add <br> tags), causing
      // a strict comparison to fail even when the content is semantically the same.
      const normalizedDOM = normalizeHTML(editorRef.current.innerHTML);
      const normalizedContent = normalizeHTML(content);

      if (normalizedDOM !== normalizedContent) {
        // Set a flag to signal a programmatic update. The `handleSelectionChange`
        // event handler will see this flag, reset it, and ignore the event, which
        // is the key to preventing the infinite re-render loop.
        isUpdatingRef.current = true;

        saveSelection();
        editorRef.current.innerHTML = content || '<p><br></p>';
        restoreSelection();
        updateActivePlaceholder();
        // The flag is now left `true` and will be reset by `handleSelectionChange`.
      }
    }
  }, [content, chapterId, saveSelection, restoreSelection, updateActivePlaceholder]);

  // Set up selection change listener
  useEffect(() => {
    const handleDocSelectionChange = () => {
      console.log('Selection change detected');
      handleSelectionChange();
      updateActivePlaceholder();
    };

    console.log('Adding selectionchange event listener');
    document.addEventListener('selectionchange', handleDocSelectionChange);
    return () => {
      console.log('Removing selectionchange event listener');
      document.removeEventListener('selectionchange', handleDocSelectionChange);
    };
  }, [handleSelectionChange]);
  
  // Apply default font when editor is initialized and set up mutation observer
  useEffect(() => {
    console.log('Editor initialization effect running');
    if (editorRef.current) {
      console.log('Editor ref exists, initializing');
      // Set default font to Helvetica
      editorRef.current.style.fontFamily = 'Helvetica, Arial, sans-serif';
      
      // Initialize with a paragraph if empty
      if (editorRef.current.innerHTML.trim() === '') {
        console.log('Editor is empty on init, adding initial paragraph');
        editorRef.current.innerHTML = '<p><br></p>';
      }
      
      // Set up a mutation observer to detect when new paragraphs are added
      const observer = new MutationObserver((mutations) => {
        console.log('Mutation detected:', mutations.length, 'mutations');
        let shouldUpdatePlaceholder = false;
        
        mutations.forEach((mutation) => {
          console.log('Mutation type:', mutation.type);
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            console.log('Added nodes:', mutation.addedNodes.length);
            // Check for newly added paragraphs
            mutation.addedNodes.forEach((node) => {
              console.log('Added node:', node.nodeName);
            });
            shouldUpdatePlaceholder = true;
          } else if (mutation.type === 'characterData') {
            console.log('Character data changed');
            shouldUpdatePlaceholder = true;
          }
        });
        
        // Only update placeholders if relevant mutations occurred
        if (shouldUpdatePlaceholder) {
          console.log('Calling updateActivePlaceholder after mutation');
          updateActivePlaceholder();
        }
      });
      
      // Start observing the editor for changes
      console.log('Starting mutation observer');
      observer.observe(editorRef.current, { childList: true, subtree: true, characterData: true });

      // Ensure the correct placeholder is shown on initial mount
      console.log('Initial updateActivePlaceholder call');
      updateActivePlaceholder();
      
      // Clean up the observer when component unmounts
      return () => {
        console.log('Disconnecting mutation observer');
        observer.disconnect();
      };
    } else {
      console.log('Editor ref does not exist yet');
    }
  }, [updateActivePlaceholder]);

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    getContent: () => {
      return editorRef.current ? editorRef.current.innerHTML : '';
    },
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
        onClick={() => {
          console.log('Editor clicked, updating placeholder');
          updateActivePlaceholder();
        }}
        suppressContentEditableWarning={true}
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
