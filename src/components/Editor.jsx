import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import './Editor.css';
import ContextMenu from './ContextMenu/ContextMenu';
import SlashCommandMenu from './SlashCommandMenu/SlashCommandMenu';
import AISidebar from './AISidebar';
import AIPopover from './AIPopover';
import StickyNote from './StickyNote';
import { processWithGemini } from '../utils/geminiApi';

const Editor = forwardRef(({ content, onContentChange, pageIndex, onEditorFocus, isLocked = false }, ref) => {
  const [contextMenu, setContextMenu] = useState({ visible: false, position: { x: 0, y: 0 }, hasSelectedText: false });
  const [slashCommandMenu, setSlashCommandMenu] = useState({ visible: false, position: { x: 0, y: 0 } });
  const [isEmpty, setIsEmpty] = useState(true);
  const [placeholderText, setPlaceholderText] = useState('Start writing...');
  const [selectedText, setSelectedText] = useState('');
  // Store sticky notes with page index to make them page-specific
  const [stickyNotes, setStickyNotes] = useState([]);
  const [aiSidebar, setAiSidebar] = useState({
    visible: false,
    activeAction: null,
    processedText: '',
    isLoading: false,
    selectedText: '',
    previewActive: false,
    previewRange: null
  });
  
  // State for proofreading issues
  const [proofreadingIssues, setProofreadingIssues] = useState([]);
  const [aiPopover, setAiPopover] = useState({
    visible: false,
    position: null
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
  }, [content]);

  // Apply default font when editor is initialized and set up mutation observer
  useEffect(() => {
    if (editorRef.current) {
      // Set default font to Helvetica
      editorRef.current.style.fontFamily = 'Helvetica, Arial, sans-serif';
      
      // Set up a mutation observer to detect when new paragraphs are added
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check each added node
            mutation.addedNodes.forEach((node) => {
              if (node.nodeName === 'P') {
                // Add placeholder attribute to new paragraphs
                if (!node.hasAttribute('data-placeholder')) {
                  node.setAttribute('data-placeholder', 'Type "/" for commands');
                }
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

  // Check if editor is empty and handle placeholders
  const checkIfEmpty = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      const isEmptyContent = !content || content === '<br>' || content === '' || content.trim() === '';
      setIsEmpty(isEmptyContent);
      
      // Find all paragraphs in the editor and add placeholder attributes
      const paragraphs = editorRef.current.querySelectorAll('p');
      paragraphs.forEach(para => {
        // Set placeholder attribute for empty paragraphs
        para.setAttribute('data-placeholder', 'Type "/" for commands');
      });
    }
  };

  const handleInput = (e) => {
    if (isLocked) return; // Prevent editing if locked
    
    // Check if editor is empty
    checkIfEmpty();
    
    // Check for slash command
    const text = e.target.textContent;
    const lastChar = text.charAt(text.length - 1);
    
    if (lastChar === '/' && !slashCommandMenu.visible) {
      // Get cursor position for slash command menu
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Show slash command menu at cursor position
        setSlashCommandMenu({
          visible: true,
          position: { x: rect.left, y: rect.bottom + 5 }
        });
      }
    }
    
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
    // Check if editor is empty when focused
    checkIfEmpty();
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    const hasText = selectedText.trim().length > 0;
    
    setContextMenu({
      visible: true,
      position: { x: e.clientX, y: e.clientY },
      hasSelectedText: hasText
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleCloseSlashCommandMenu = () => {
    setSlashCommandMenu(prev => ({ ...prev, visible: false }));
  };

  const handleSlashCommandAction = (action) => {
    // Remove the slash character that triggered the menu
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      const lastSlashIndex = content.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        const newContent = content.substring(0, lastSlashIndex) + content.substring(lastSlashIndex + 1);
        editorRef.current.innerHTML = newContent;
      }
    }
    
    // Apply the selected command
    switch (action) {
      case 'heading':
        document.execCommand('formatBlock', false, '<h1>');
        break;
      case 'list':
        document.execCommand('insertUnorderedList', false, null);
        break;
      case 'task':
        // Insert a checkbox
        document.execCommand('insertHTML', false, '<div><input type="checkbox"> Task</div>');
        break;
      case 'blockquote':
        document.execCommand('formatBlock', false, '<blockquote>');
        break;
      case 'image':
        // Placeholder for image insertion
        document.execCommand('insertHTML', false, '<div class="image-placeholder">[Image]</div>');
        break;
      case 'gallery':
        // Placeholder for gallery insertion
        document.execCommand('insertHTML', false, '<div class="gallery-placeholder">[Image Gallery]</div>');
        break;
      case 'hr':
        document.execCommand('insertHorizontalRule', false, null);
        break;
      default:
        break;
    }
    
    // Update content
    if (onContentChange) {
      onContentChange(pageIndex, editorRef.current.innerHTML, editorRef.current);
    }
  };

  const handleContextMenuAction = (action, capturedText) => {
    // Close the context menu
    setContextMenu({ ...contextMenu, visible: false });
    
    if (action === 'addStickyNote') {
      // Calculate position relative to the editor element
      const editorRect = editorRef.current.getBoundingClientRect();
      const relativePosition = {
        x: contextMenu.position.x - editorRect.left,
        y: contextMenu.position.y - editorRect.top + editorRef.current.scrollTop
      };
      
      // Add a new sticky note at the context menu position with page index
      const newNote = {
        id: Date.now().toString(),
        position: relativePosition,
        pageIndex: pageIndex
      };
      setStickyNotes([...stickyNotes, newNote]);
      return;
    }
    
    // Use the captured text passed from the context menu
    const textToProcess = capturedText || selectedText;
    
    // Get the current selection
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Store a more complete representation of the range
    const rangeInfo = {
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      startContainer: range.startContainer,
      endContainer: range.endContainer,
      selectedText: textToProcess,
      // Store the parent element to help with positioning later
      parentElement: range.commonAncestorContainer.nodeType === 3 ? 
                     range.commonAncestorContainer.parentElement : 
                     range.commonAncestorContainer
    };
    
    // Store the exact HTML content of the selected range for later restoration if needed
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(range.cloneContents());
    const exactSelectedHTML = tempDiv.innerHTML;
    
    setAiSidebar({
      visible: true,
      activeAction: action,
      processedText: '',
      isLoading: false,
      selectedText: textToProcess,
      previewActive: false,
      previewRange: rangeInfo,
      originalHTML: exactSelectedHTML
    });
  };

  // Handle generate request from sidebar
  const handleGenerateRequest = async (customInstructions, tone) => {
    const { selectedText, activeAction, previewRange } = aiSidebar;
    
    // Set loading state
    setAiSidebar(prev => ({
      ...prev,
      isLoading: true
    }));
    
    try {
      // Process the text with Gemini API including custom instructions and tone
      const result = await processWithGemini(
        selectedText, 
        activeAction, 
        customInstructions, 
        tone
      );
      
      // Update the sidebar with the processed text
      setAiSidebar(prev => ({
        ...prev,
        processedText: result,
        isLoading: false
      }));
      
      // Apply the preview to the editor content
      applyPreview(result);
    } catch (error) {
      console.error('Error processing text:', error);
      
      // Update the sidebar with the error
      setAiSidebar(prev => ({
        ...prev,
        processedText: `Error: ${error.message}`,
        isLoading: false
      }));
    }
  };

  // Apply the AI-generated text as a preview in the editor
  const applyPreview = (processedText) => {
    const { previewRange, selectedText, originalHTML } = aiSidebar;
    
    if (!previewRange || !processedText) return;
    
    try {
      // For multi-line text, we'll use the stored range directly instead of trying to find the text
      // This is more reliable for complex selections
      const editorContent = editorRef.current;
      if (!editorContent) return;
      
      // Check if the original containers are still in the document
      let startNode = previewRange.startContainer;
      let endNode = previewRange.endContainer;
      let startOffset = previewRange.startOffset;
      let endOffset = previewRange.endOffset;
      let parentElement = previewRange.parentElement;
      
      // If the nodes aren't in the document anymore, we need to find the text
      if (!document.contains(startNode) || !document.contains(endNode)) {
        console.log('Stored range nodes are no longer in the document, searching for text');
        
        // For multi-line text, we need a more sophisticated approach
        // We'll normalize the text by removing extra whitespace for comparison
        const normalizedSelectedText = selectedText.replace(/\s+/g, ' ').trim();
        
        // Function to get text content of a node and its children
        const getTextContent = (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            return node.nodeValue;
          }
          
          let text = '';
          const childNodes = node.childNodes;
          for (let i = 0; i < childNodes.length; i++) {
            text += getTextContent(childNodes[i]);
          }
          return text;
        };
        
        // Function to find a text match in the editor
        const findTextInEditor = () => {
          // First try exact match with TreeWalker
          const walker = document.createTreeWalker(
            editorContent,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );
          
          let currentNode;
          let textBuffer = '';
          let startTextNode = null;
          let endTextNode = null;
          let startPos = 0;
          let endPos = 0;
          
          // For multi-line text, we need to accumulate text across nodes
          const textNodes = [];
          while (currentNode = walker.nextNode()) {
            textNodes.push({
              node: currentNode,
              text: currentNode.nodeValue
            });
          }
          
          // Try to find the text in consecutive text nodes
          for (let i = 0; i < textNodes.length; i++) {
            let accumulatedText = '';
            let nodeStart = i;
            
            // Accumulate text until we have enough to compare
            for (let j = i; j < textNodes.length; j++) {
              accumulatedText += textNodes[j].text;
              
              // Normalize for comparison
              const normalizedText = accumulatedText.replace(/\s+/g, ' ').trim();
              
              // Check if we have a match
              if (normalizedText.includes(normalizedSelectedText)) {
                // Found a match!
                const matchIndex = normalizedText.indexOf(normalizedSelectedText);
                
                // Now we need to map this back to the original nodes
                let charCount = 0;
                let startNodeIndex = nodeStart;
                let startCharIndex = 0;
                
                // Find start node and offset
                for (let k = nodeStart; k <= j; k++) {
                  const nodeText = textNodes[k].text;
                  if (charCount + nodeText.length > matchIndex) {
                    // This node contains the start of our match
                    startNodeIndex = k;
                    startCharIndex = matchIndex - charCount;
                    break;
                  }
                  charCount += nodeText.length;
                }
                
                // Find end node and offset
                let endNodeIndex = j;
                let endCharIndex = 0;
                charCount = 0;
                
                for (let k = nodeStart; k <= j; k++) {
                  const nodeText = textNodes[k].text;
                  if (charCount + nodeText.length >= matchIndex + normalizedSelectedText.length) {
                    // This node contains the end of our match
                    endNodeIndex = k;
                    endCharIndex = matchIndex + normalizedSelectedText.length - charCount;
                    if (endCharIndex > nodeText.length) endCharIndex = nodeText.length;
                    break;
                  }
                  charCount += nodeText.length;
                }
                
                // Set our nodes and offsets
                startNode = textNodes[startNodeIndex].node;
                startOffset = startCharIndex;
                endNode = textNodes[endNodeIndex].node;
                endOffset = endCharIndex;
                return true;
              }
            }
          }
          
          return false;
        };
        
        // Try to find the text
        const found = findTextInEditor();
        
        if (!found) {
          console.error('Could not find the selected text in the document');
          return;
        }
      }
      
      // Create a range with our nodes
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      
      // Store the original content for restoration
      const originalContent = range.toString();
      console.log('Selected text:', originalContent);
      
      // Delete the selected content
      range.deleteContents();
      
      // Create a span element for the preview with special styling
      const previewSpan = document.createElement('span');
      previewSpan.className = 'ai-preview-text';
      previewSpan.textContent = processedText;
      previewSpan.dataset.aiGenerated = 'true';
      previewSpan.dataset.originalText = selectedText; // Store original text for restoration
      previewSpan.id = 'ai-preview-' + Date.now();
      
      // Insert the preview span
      range.insertNode(previewSpan);
      
      // Update the content to ensure changes are saved
      onContentChange(editorRef.current.innerHTML, pageIndex);
      
      // Update the sidebar state to indicate preview is active
      setAiSidebar(prev => ({
        ...prev,
        previewActive: true
      }));
      
      // Position and show the popover after a short delay to ensure the DOM is updated
      setTimeout(() => {
        const previewElement = document.getElementById(previewSpan.id);
        if (previewElement) {
          const rect = previewElement.getBoundingClientRect();
          setAiPopover({
            visible: true,
            position: {
              top: rect.top,
              left: rect.left,
              width: rect.width
            }
          });
        }
      }, 100);
    } catch (error) {
      console.error('Error applying preview:', error);
    }
  };

  // Handle approving the AI changes
  const handleApproveChanges = () => {
    // Find the preview element
    const previewElement = editorRef.current.querySelector('.ai-preview-text');
    
    if (previewElement) {
      // Get the approved text
      const approvedText = previewElement.textContent;
      
      // Replace the preview element with a regular text node (no special styling)
      const textNode = document.createTextNode(approvedText);
      previewElement.parentNode.replaceChild(textNode, previewElement);
      
      // Update the content state to save the changes
      onContentChange(editorRef.current.innerHTML, pageIndex);
      
      console.log('AI changes approved and applied:', approvedText);
    } else {
      console.error('No preview element found to approve changes');
    }
    
    // Hide the popover
    setAiPopover({ visible: false, position: null });
    
    // Close the AI sidebar
    setAiSidebar({
      visible: false,
      activeAction: null,
      processedText: '',
      isLoading: false,
      selectedText: '',
      previewActive: false,
      previewRange: null
    });
  };

  // Handle regenerating the AI content
  const handleRegenerate = () => {
    // Remove the current preview
    const previewElement = editorRef.current.querySelector('.ai-preview-text');
    
    if (previewElement) {
      // Get the original text if available, otherwise use the selected text
      const originalText = previewElement.dataset.originalText || aiSidebar.selectedText;
      
      // Replace the preview with the original text
      const textNode = document.createTextNode(originalText);
      previewElement.parentNode.replaceChild(textNode, previewElement);
      
      // Update the content state
      onContentChange(editorRef.current.innerHTML, pageIndex);
    }
    
    // Hide the popover
    setAiPopover({ visible: false, position: null });
    
    // Reset the sidebar state to allow for new instructions
    setAiSidebar(prev => ({
      ...prev,
      processedText: '',
      isLoading: false,
      previewActive: false
    }));
  };

  const handleCancelAI = () => {
    // Remove any preview elements if they exist
    const previewElement = editorRef.current.querySelector('.ai-preview-text');
    
    if (previewElement) {
      // Get the original text if available, otherwise use the selected text
      const originalText = previewElement.dataset.originalText || aiSidebar.selectedText;
      
      // Replace the preview with the original text
      const textNode = document.createTextNode(originalText);
      previewElement.parentNode.replaceChild(textNode, previewElement);
      
      // Update the content state
      onContentChange(editorRef.current.innerHTML, pageIndex);
    }
    
    // Hide the popover
    setAiPopover({ visible: false, position: null });
    
    // Close the AI sidebar
    setAiSidebar({
      visible: false,
      activeAction: null,
      processedText: '',
      isLoading: false,
      selectedText: '',
  
  if (previewElement) {
    // Get the original text if available, otherwise use the selected text
    const originalText = previewElement.dataset.originalText || aiSidebar.selectedText;
    
    // Replace the preview with the original text
    const textNode = document.createTextNode(originalText);
    previewElement.parentNode.replaceChild(textNode, previewElement);
    
    // Update the content state
    onContentChange(editorRef.current.innerHTML, pageIndex);
  }
  
  // Hide the popover
  setAiPopover({ visible: false, position: null });
  
  // Reset the sidebar state to allow for new instructions
  setAiSidebar(prev => ({
    ...prev,
    processedText: '',
    isLoading: false,
    previewActive: false
  }));
};

const handleCancelAI = () => {
  // Remove any preview elements if they exist
  const previewElement = editorRef.current.querySelector('.ai-preview-text');
  
  if (previewElement) {
    // Get the original text if available, otherwise use the selected text
    const originalText = previewElement.dataset.originalText || aiSidebar.selectedText;
    
    // Replace the preview with the original text
    const textNode = document.createTextNode(originalText);
    previewElement.parentNode.replaceChild(textNode, previewElement);
    
    // Update the content state
    onContentChange(editorRef.current.innerHTML, pageIndex);
  }
  
  // Hide the popover
  setAiPopover({ visible: false, position: null });
  
  // Close the AI sidebar
  setAiSidebar({
    visible: false,
    activeAction: null,
    processedText: '',
    isLoading: false,
    selectedText: '',
    previewActive: false,
    previewRange: null
  });
};

// Helper function to get selection coordinates
const getSelectionCoordinates = () => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;
  
  const range = selection.getRangeAt(0);
  const rects = range.getClientRects();
  
  if (rects.length > 0) {
    // Get the first rectangle from the range
    const rect = rects[0];
    return {
      x: rect.left,
      y: rect.top
    };
  }
  
  return null;
};

// Handle removing a sticky note
const handleRemoveStickyNote = (noteId) => {
  setStickyNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
};

// Handle proofreading the entire chapter
const handleProofreadChapter = async () => {
  // Show the AI sidebar with loading state
  setAiSidebar({
    visible: true,
    activeAction: 'proofreadChapter',
    processedText: '',
    isLoading: true,
    selectedText: '',
    previewActive: false,
    previewRange: null
  });
  
  try {
    // Get the entire chapter content
    const chapterContent = editorRef.current.innerText;
    
    if (!chapterContent || chapterContent.trim() === '') {
      setProofreadingIssues([]);
      setAiSidebar(prev => ({ ...prev, isLoading: false }));
      return;
    }
    
    // Process the chapter content with Gemini API for proofreading
    const prompt = `You are a professional proofreader with exceptional attention to detail. Your task is to thoroughly analyze the following text and identify ALL spelling, grammar, punctuation, and other language errors. Be extremely thorough and catch every single error, no matter how small.

    IMPORTANT: I've intentionally included some errors in the text. Please find them all.

    For each error you find, provide:
    1. The error type (spelling, grammar, punctuation, etc.)
    2. The exact original text containing the error (just the word or phrase with the error, not the entire sentence)
    3. A suggested correction
    4. A brief explanation of why it's an error
    
    Format your response as a JSON array of objects with the following structure:
    [
      {
        "type": "spelling",
        "original": "incorrekt",
        "suggestion": "incorrect",
        "description": "The word 'incorrekt' is misspelled. The correct spelling is 'incorrect'."
      },
      {
        "type": "grammar",
        "original": "they was",
        "suggestion": "they were",
        "description": "Subject-verb agreement error. 'They' requires the plural verb form 'were'."
      }
    ]
    
    If there are no errors, return an empty array: []
    
    IMPORTANT: Be extremely thorough and catch every error. Look for common errors like:
    - Misspelled words (e.g., "intetionally" instead of "intentionally")
    - Subject-verb agreement issues (e.g., "he have" instead of "he has")
    - Incorrect word usage (e.g., "their" vs "there" vs "they're")
    - Punctuation errors (missing commas, periods, etc.)
    - Capitalization errors
    
    Provide ONLY the JSON array without any additional text, explanations, or markdown formatting.
    
    Text to proofread: ${chapterContent}`;
    
    // Call the API directly for proofreading using Gemini Flash 2.5
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,  // Lower temperature for more precise responses
          topK: 20,         // More focused sampling
          topP: 0.9,        // More focused sampling
          maxOutputTokens: 2048  // Allow more output tokens for detailed analysis
        }
      })
    setAiSidebar({
      visible: true,
      activeAction: 'proofreadChapter',
      processedText: '',
      isLoading: true,
      selectedText: '',
      previewActive: false,
      previewRange: null
    });
    
    try {
      // Get the entire chapter content
      const chapterContent = editorRef.current.innerText;
      
      if (!chapterContent || chapterContent.trim() === '') {
        setProofreadingIssues([]);
        setAiSidebar(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      // Process the chapter content with Gemini API for proofreading
      const prompt = `You are a professional proofreader with exceptional attention to detail. Your task is to thoroughly analyze the following text and identify ALL spelling, grammar, punctuation, and other language errors. Be extremely thorough and catch every single error, no matter how small.

      IMPORTANT: I've intentionally included some errors in the text. Please find them all.

      For each error you find, provide:
      1. The error type (spelling, grammar, punctuation, etc.)
      2. The exact original text containing the error (just the word or phrase with the error, not the entire sentence)
      3. A suggested correction
      4. A brief explanation of why it's an error
      
      Format your response as a JSON array of objects with the following structure:
      [
        {
          "type": "spelling",
          "original": "incorrekt",
          "suggestion": "incorrect",
          "description": "The word 'incorrekt' is misspelled. The correct spelling is 'incorrect'."
        },
        {
          "type": "grammar",
          "original": "they was",
          "suggestion": "they were",
          "description": "Subject-verb agreement error. 'They' requires the plural verb form 'were'."
        }
      ]
      
      If there are no errors, return an empty array: []
      
      IMPORTANT: Be extremely thorough and catch every error. Look for common errors like:
      - Misspelled words (e.g., "intetionally" instead of "intentionally")
      - Subject-verb agreement issues (e.g., "he have" instead of "he has")
      - Incorrect word usage (e.g., "their" vs "there" vs "they're")
      - Punctuation errors (missing commas, periods, etc.)
      - Capitalization errors
      
      Provide ONLY the JSON array without any additional text, explanations, or markdown formatting.
      
      Text to proofread: ${chapterContent}`;
      
      // Call the API directly for proofreading using Gemini Flash 2.5
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,  // Lower temperature for more precise responses
            topK: 20,         // More focused sampling
            topP: 0.9,        // More focused sampling
            maxOutputTokens: 2048  // Allow more output tokens for detailed analysis
          }
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        console.error('Gemini API error:', data.error);
        throw new Error(data.error.message || 'Error processing text with Gemini');
      }
      
      // Parse the response to get the proofreading issues
      let issues = [];
      
      try {
        // Check if the response has candidates
        if (!data.candidates || data.candidates.length === 0) {
          console.error('No candidates in Gemini response:', data);
          throw new Error('No response from Gemini API');
        }
        
        // Get the content from the first candidate
        const candidate = data.candidates[0];
        if (!candidate.content) {
          console.error('No content field in candidate:', candidate);
          throw new Error('Invalid response structure from Gemini API');
        }

        /*
          Gemini responses have several possible shapes:
          1. { content: { parts: [ { text: "..." } ] } }
          2. { content: { text: "..." } }
          3. { content: "raw text" }
        */
        let responseText = '';
        let part = null;

        // Try all reasonable locations for the JSON string
        if (Array.isArray(candidate.content.parts)) {
          part = candidate.content.parts[0];
          if (part.text) {
            responseText = part.text;
          } else if (part.functionCall && part.functionCall.args) {
            // Structured JSON
            issues = part.functionCall.args.issues || [];
          } else if (part.inlineData && part.inlineData.data) {
            responseText = part.inlineData.data;
          }
        } else if (typeof candidate.content.text === 'string') {
          responseText = candidate.content.text;
        } else if (typeof candidate.content === 'string') {
          responseText = candidate.content;
        }

        // Fallback: scan all string fields in content for JSON array/object
        if (!responseText && typeof candidate.content === 'object') {
          for (const key of Object.keys(candidate.content)) {
            const val = candidate.content[key];
            if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
              responseText = val;
              break;
            }
          }
        }

        if (issues.length === 0) {
          // If we still need to parse raw text JSON
          if (!responseText) {
            // Log the entire candidate for debugging
            console.error('[Gemini2.5] No JSON found, full candidate:', JSON.stringify(candidate, null, 2));
            setAiSidebar(prev => ({
              ...prev,
              isLoading: false,
              processedText: '',
              activeAction: 'proofreadChapter',
              error: 'Gemini did not return proofreading results. Try with a shorter chapter or different text.'
            }));
            setProofreadingIssues([]);
            return;
          }
          // Clean up markdown fencing if present
          responseText = responseText.trim();
          const fencedMatch = responseText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
          if (fencedMatch) {
            responseText = fencedMatch[1].trim();
          }
          console.log('Cleaned Gemini response:', responseText);
          try {
            issues = JSON.parse(responseText);
          } catch (jsonErr) {
            console.error('Failed to parse JSON from Gemini response', jsonErr, responseText);
            throw jsonErr;
          }
        }



        
        // Validate the structure of each issue
        issues = issues.filter(issue => 
          issue && 
          typeof issue === 'object' && 
          issue.type && 
          issue.original && 
          (issue.suggestion || issue.description)
        );
        
        console.log('Parsed proofreading issues:', issues);
      } catch (error) {
        console.error('Error parsing proofreading results:', error, 'Raw response:', data);
        issues = [];
      }
      
      // Update the state with the proofreading issues
      setProofreadingIssues(issues);
    } catch (error) {
      console.error('Error proofreading chapter:', error);
      setProofreadingIssues([]);
    } finally {
      // Update the sidebar state
      setAiSidebar(prev => ({ ...prev, isLoading: false }));
    }
  };
  
  // Handle fixing a proofreading issue
  const handleFixIssue = (issue) => {
    if (!issue || !issue.original || !issue.suggestion) return;
    
    const content = editorRef.current.innerHTML;
    
    // Replace the issue with the suggestion
    // Note: This is a simple text replacement and might not work perfectly for all cases
    const updatedContent = content.replace(issue.original, issue.suggestion);
    
    // Update the editor content
    editorRef.current.innerHTML = updatedContent;
    
    // Update the content state
    if (onContentChange) {
      onContentChange(pageIndex, updatedContent, editorRef.current);
    }
    
    // Remove the fixed issue from the list
    setProofreadingIssues(prev => prev.filter(i => i !== issue));
  };
  
  // Store sticky notes in the editor's content when it changes
  useEffect(() => {
    // When the page changes, make sure we're only showing sticky notes for the current page
    const visibleNotes = stickyNotes.filter(note => note.pageIndex === pageIndex);
    if (visibleNotes.length !== stickyNotes.filter(note => note.pageIndex === pageIndex).length) {
      // This is just a safeguard to ensure we're only showing the right notes
      setStickyNotes([...stickyNotes]);
    }
  }, [pageIndex]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    proofreadChapter: handleProofreadChapter
  }), [handleProofreadChapter]);
  
  // Add event listener for proofreading event from the toolbar
  const editorContainerRef = useRef(null);
  
  useEffect(() => {
    const handleProofreadEvent = () => {
      console.log('Proofreading event received');
      handleProofreadChapter();
    };
    
    const editorContainer = editorContainerRef.current;
    if (editorContainer) {
      console.log('Adding proofreading event listener to editor container');
      editorContainer.addEventListener('proofreadChapter', handleProofreadEvent);
      
      return () => {
        editorContainer.removeEventListener('proofreadChapter', handleProofreadEvent);
      };
    }
  }, [handleProofreadChapter]);

  // Handle keydown events for special keys
  const handleKeyDown = (e) => {
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
    if (e.key === '/' && !slashCommandMenu.visible) {
      // Get current selection and cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Check if cursor is at the beginning of a line/paragraph
        let isAtLineStart = false;
        
        // Get the current node and offset
        const { anchorNode, anchorOffset } = selection;
        
        // Check if we're at the start of a text node
        if (anchorNode && anchorNode.nodeType === Node.TEXT_NODE && anchorOffset === 0) {
          isAtLineStart = true;
        } 
        // Check if we're at the start of a block element (paragraph, div, etc.)
        else if (anchorNode && anchorNode.nodeType === Node.ELEMENT_NODE && 
                 (anchorNode.tagName === 'P' || anchorNode.tagName === 'DIV') && 
                 anchorOffset === 0) {
          isAtLineStart = true;
        }
        // Check if previous node is a BR or the end of a block element
        else if (anchorNode && anchorNode.previousSibling && 
                 (anchorNode.previousSibling.tagName === 'BR' || 
                  anchorNode.previousSibling.tagName === 'P' || 
                  anchorNode.previousSibling.tagName === 'DIV')) {
          isAtLineStart = true;
        }
        
        // Only show slash command menu if we're at the start of a line
        if (isAtLineStart) {
          e.preventDefault(); // Prevent the '/' character from being inserted
          
          // Create a temporary span element to get the exact cursor position
          const tempSpan = document.createElement('span');
          tempSpan.setAttribute('id', 'temp-cursor-position');
          tempSpan.innerHTML = '&nbsp;';
          
          // Insert the temporary span at the cursor position
          range.insertNode(tempSpan);
          
          // Get the position of the temporary span
          const rect = tempSpan.getBoundingClientRect();
          
          // Remove the temporary span and restore the selection
          const parent = tempSpan.parentNode;
          parent.removeChild(tempSpan);
          parent.normalize();
          
          // Restore the cursor position
          selection.removeAllRanges();
          selection.addRange(range);
          
          // Calculate position relative to the viewport
          const x = rect.left;
          const y = rect.top;
          
          console.log('Cursor position:', { x, y });
          
          // Show slash command menu at cursor position
          setSlashCommandMenu({
            visible: true,
            position: { x, y }
          });
        }
        // If not at the beginning of a line, let the '/' character be inserted normally
      }
    }
  };

  return (
    <div className="editor-container" ref={editorContainerRef}>
      <div 
        className={`editor ${isLocked ? 'locked' : ''}`}
        contentEditable={!isLocked}
        ref={editorRef}
        onInput={handleInput}
        onFocus={handleFocus}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning={true}
        data-placeholder="Start writing..."
      />
      {contextMenu.visible && (
        <ContextMenu 
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
          onAction={handleContextMenuAction}
          hasSelectedText={contextMenu.hasSelectedText}
        />
      )}
      
      {/* Render only sticky notes for the current page */}
      {stickyNotes
        .filter(note => note.pageIndex === pageIndex)
        .map(note => (
          <StickyNote
            key={note.id}
            id={note.id}
            initialPosition={note.position}
            onClose={handleRemoveStickyNote}
            pageIndex={pageIndex}
          />
        ))}
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
        onFixIssue={handleFixIssue}
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
      
      {/* Slash Command Menu */}
      {slashCommandMenu.visible && (
        <SlashCommandMenu
          position={slashCommandMenu.position}
          onClose={handleCloseSlashCommandMenu}
          onAction={handleSlashCommandAction}
        />
      )}
      

    </div>
  );
});

export default Editor;
