import React, { useRef, useEffect, useCallback, useState } from 'react';
import './Editor.css';
import ContextMenu from './ContextMenu';
import AISidebar from './AISidebar';
import AIPopover from './AIPopover';
import { processWithGemini } from '../utils/geminiApi';

const Editor = ({ content, onContentChange, pageIndex, onEditorFocus, isLocked = false }) => {
  const [contextMenu, setContextMenu] = useState({ visible: false, position: { x: 0, y: 0 } });
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

  const handleContextMenuAction = (action, capturedText) => {
    // Close the context menu
    setContextMenu({ ...contextMenu, visible: false });
    
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
      previewActive: false,
      previewRange: null
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
};

export default Editor;
