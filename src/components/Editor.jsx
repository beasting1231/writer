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
    if (!editorRef.current) return;
    
    // Get the current selection
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const startNode = range.startContainer;
    
    // Find the current block element
    let currentBlock = startNode;
    while (currentBlock && currentBlock !== editorRef.current) {
      if (currentBlock.nodeType !== Node.TEXT_NODE) {
        break;
      }
      currentBlock = currentBlock.parentNode;
    }
    
    // If we're in a text node, get its parent block
    if (currentBlock.nodeType === Node.TEXT_NODE) {
      currentBlock = currentBlock.parentNode;
    }
    
    // Get the content and remove the slash
    const content = currentBlock.textContent;
    const slashIndex = content.lastIndexOf('/');
    if (slashIndex === -1) return;
    
    const newContent = content.substring(0, slashIndex) + content.substring(slashIndex + 1);
    
    // Create a temporary div to hold the editor's content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editorRef.current.innerHTML;
    
    // Find and update the corresponding block in our temporary div
    const blocks = tempDiv.childNodes;
    let targetBlock = null;
    let targetIndex = -1;
    
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].textContent === content) {
        targetBlock = blocks[i];
        targetIndex = i;
        break;
      }
    }
    
    if (!targetBlock) return;
    
    // Create the new element based on the action
    let newElement;
    switch (action) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
        newElement = document.createElement(action);
        newElement.textContent = newContent;
        break;
      case 'blockquote':
        newElement = document.createElement('blockquote');
        newElement.textContent = newContent;
        break;
      case 'list': {
        const listDiv = document.createElement('div');
        listDiv.innerHTML = `<ul><li>${newContent}</li></ul>`;
        newElement = listDiv.firstChild;
        break;
      }
      case 'task': {
        const taskDiv = document.createElement('div');
        taskDiv.innerHTML = `<div><input type="checkbox"> ${newContent}</div>`;
        newElement = taskDiv.firstChild;
        break;
      }
      case 'image': {
        newElement = document.createElement('div');
        newElement.className = 'image-placeholder';
        newElement.textContent = '[Image]';
        break;
      }
      case 'gallery': {
        newElement = document.createElement('div');
        newElement.className = 'gallery-placeholder';
        newElement.textContent = '[Image Gallery]';
        break;
      }
      case 'hr':
        newElement = document.createElement('hr');
        break;
      default:
        return;
    }
    
      
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
  if (!editorRef.current) return;
  
  // Get the current selection
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const startNode = range.startContainer;
  
  // Find the current block element
  let currentBlock = startNode;
  while (currentBlock && currentBlock !== editorRef.current) {
    if (currentBlock.nodeType !== Node.TEXT_NODE) {
      break;
    }
    currentBlock = currentBlock.parentNode;
  }
  
  // If we're in a text node, get its parent block
  if (currentBlock.nodeType === Node.TEXT_NODE) {
    currentBlock = currentBlock.parentNode;
  }
  
  // Get the content and remove the slash
  const content = currentBlock.textContent;
  const slashIndex = content.lastIndexOf('/');
  if (slashIndex === -1) return;
  
  const newContent = content.substring(0, slashIndex) + content.substring(slashIndex + 1);
  
  // Create a temporary div to hold the editor's content
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = editorRef.current.innerHTML;
  
  // Find and update the corresponding block in our temporary div
  const blocks = tempDiv.childNodes;
  let targetBlock = null;
  let targetIndex = -1;
  
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].textContent === content) {
      targetBlock = blocks[i];
      targetIndex = i;
      break;
    }
  }
  
  if (!targetBlock) return;
  
  // Create the new element based on the action
  let newElement;
  switch (action) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
      newElement = document.createElement(action);
      newElement.textContent = newContent;
      break;
    case 'blockquote':
      newElement = document.createElement('blockquote');
      newElement.textContent = newContent;
      break;
    case 'list': {
      const listDiv = document.createElement('div');
      listDiv.innerHTML = `<ul><li>${newContent}</li></ul>`;
      newElement = listDiv.firstChild;
      break;
    }
    case 'task': {
      const taskDiv = document.createElement('div');
      taskDiv.innerHTML = `<div><input type="checkbox"> ${newContent}</div>`;
      newElement = taskDiv.firstChild;
      break;
    }
    case 'image': {
      newElement = document.createElement('div');
      newElement.className = 'image-placeholder';
      newElement.textContent = '[Image]';
      break;
    }
    case 'gallery': {
      newElement = document.createElement('div');
      newElement.className = 'gallery-placeholder';
      newElement.textContent = '[Image Gallery]';
      break;
    }
    case 'hr':
      newElement = document.createElement('hr');
      break;
    default:
      return;
  }
  
  // Replace the old block
  blocks[targetIndex].replaceWith(newElement);
  
  // Update the editor's content through React
  if (onContentChange) {
    onContentChange(pageIndex, tempDiv.innerHTML, editorRef.current);
  }
  
  // Close the menu
  handleCloseSlashCommandMenu();
  
  // Set cursor position after React updates the DOM
  requestAnimationFrame(() => {
    const selection = window.getSelection();
    const range = document.createRange();
    
    // Find the newly created element
    const newBlocks = editorRef.current.childNodes;
    let newTargetBlock = newBlocks[targetIndex];
    
    if (newTargetBlock) {
      range.selectNodeContents(newTargetBlock);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });
};

const handleContextMenuAction = (action, capturedText) => {
  // Close the context menu
  setContextMenu({ ...contextMenu, visible: false });
  
  if (action === 'addStickyNote') {
    // Calculate position relative to the editor element
    const editorRect = editorRef.current.getBoundingClientRect();
    const selectionRect = window.getSelection().getRangeAt(0).getBoundingClientRect();
    
    const stickyNotePosition = {
      top: selectionRect.top - editorRect.top,
      left: selectionRect.right - editorRect.left
    };
    
    // Add sticky note
    setStickyNotes(prev => [
      ...prev,
      {
        id: Date.now(),
        text: '',
        position: stickyNotePosition,
        isEditing: true
      }
    ]);
  }
};
    // Replace the old block
    blocks[targetIndex].replaceWith(newElement);
    
    // Update the editor's content through React
    if (onContentChange) {
      onContentChange(pageIndex, tempDiv.innerHTML, editorRef.current);
    }
    
    // Close the menu
    handleCloseSlashCommandMenu();
    
    // Set cursor position after React updates the DOM
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      const range = document.createRange();
      
      // Find the newly created element
      const newBlocks = editorRef.current.childNodes;
      let newTargetBlock = newBlocks[targetIndex];
      
      if (newTargetBlock) {
                range.selectNodeContents(newTargetBlock);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  };

  const handleGenerateRequest = async (customInstructions, tone) => {
    const { selectedText, activeAction, previewRange } = aiSidebar;
      
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
