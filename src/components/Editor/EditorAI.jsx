import { useCallback } from 'react';
import { processWithGemini } from '../../utils/geminiApi';

/**
 * Hook for handling AI-related functionality in the editor
 */
const useEditorAI = (
  editorRef,
  setAiSidebar,
  setAiPopover,
  isUpdatingRef,
  restoreSelection,
  savedSelectionRef,
  setProofreadingIssues
) => {
  // Handle generate request from sidebar
  const handleGenerateRequest = useCallback(async (customInstructions, tone) => {
    // Get the current AI sidebar state first
    setAiSidebar(prev => {
      // Return updated state with loading flag
      return {
        ...prev,
        isLoading: true
      };
    });
    
    try {
      // Get the current state to access selectedText and activeAction
      const currentState = {};
      setAiSidebar(prev => {
        // Store values we need for API call
        currentState.selectedText = prev.selectedText;
        currentState.activeAction = prev.activeAction;
        return prev; // Don't change state here
      });
      
      const { selectedText, activeAction } = currentState;
      
      if (!selectedText || selectedText.trim().length === 0) {
        // Reset loading state if no text to process
        setAiSidebar(prev => ({
          ...prev,
          isLoading: false
        }));
        return;
      }
      
      // Process the text with Gemini API
      const processedText = await processWithGemini(
        selectedText,
        activeAction,
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
  }, [setAiSidebar]);

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
    
    // Function to get text content of a node and its children
    const getTextContent = (node) => {
      if (!node) return '';
      
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }
      
      let text = '';
      for (const child of node.childNodes) {
        text += getTextContent(child);
      }
      return text;
    };
    
    // Function to find a text match in the editor
    const findTextInEditor = () => {
      const editorContent = editorRef.current;
      let selectedText = '';
      
      // Get the selected text from the current state
      setAiSidebar(prev => {
        selectedText = prev.selectedText;
        return prev; // Don't change state
      });
      
      // If no selected text, return null
      if (!selectedText || selectedText.trim().length === 0) return null;
      
      // Create a TreeWalker to iterate through all text nodes
      const walker = document.createTreeWalker(
        editorContent,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      let startNode = null;
      let endNode = null;
      let startOffset = 0;
      let endOffset = 0;
      let currentText = '';
      
      // Iterate through all text nodes
      while ((node = walker.nextNode())) {
        const nodeText = node.textContent;
        
        // If this node contains the text we're looking for
        if (nodeText.includes(selectedText)) {
          startNode = node;
          endNode = node;
          startOffset = nodeText.indexOf(selectedText);
          endOffset = startOffset + selectedText.length;
          break;
        }
        
        // If we need to combine multiple nodes to find the text
        currentText += nodeText;
        if (currentText.includes(selectedText)) {
          // Find the start node and offset
          let tempText = '';
          const tempWalker = document.createTreeWalker(
            editorContent,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );
          
          let tempNode;
          while ((tempNode = tempWalker.nextNode())) {
            const tempNodeText = tempNode.textContent;
            const newTempText = tempText + tempNodeText;
            
            if (newTempText.includes(selectedText) && 
                !tempText.includes(selectedText)) {
              // This node contains the start of our text
              startNode = tempNode;
              startOffset = selectedText.indexOf(selectedText) - tempText.length;
              
              // Now find the end node and offset
              let endTempText = tempText + tempNodeText;
              if (endTempText.includes(selectedText)) {
                // The text ends in this node
                endNode = tempNode;
                endOffset = startOffset + selectedText.length;
                break;
              } else {
                // The text continues in subsequent nodes
                let endTempNode;
                while ((endTempNode = tempWalker.nextNode())) {
                  const endTempNodeText = endTempNode.textContent;
                  endTempText += endTempNodeText;
                  
                  if (endTempText.includes(selectedText)) {
                    // We found the end node
                    endNode = endTempNode;
                    endOffset = selectedText.length - 
                              (endTempText.length - endTempNodeText.length - 
                               tempText.length - startOffset);
                    break;
                  }
                }
                break;
              }
            }
            
            tempText += tempNodeText;
          }
          
          break;
        }
      }
      
      if (startNode && endNode) {
        const newRange = document.createRange();
        newRange.setStart(startNode, startOffset);
        newRange.setEnd(endNode, endOffset);
        return newRange;
      }
      
      return null;
    };
    
    // Try to find the text in the editor
    const matchRange = findTextInEditor();
    if (!matchRange) {
      isUpdatingRef.current = false;
      return;
    }
    
    // Create a wrapper span for the AI-generated text
    const wrapper = document.createElement('span');
    wrapper.className = 'ai-preview-text';
    wrapper.setAttribute('data-ai-preview', 'true');
    wrapper.textContent = processedText;
    
    // Replace the selected text with the AI-generated text
    matchRange.deleteContents();
    matchRange.insertNode(wrapper);
    
    // Position the AI popover near the preview text
    const rect = wrapper.getBoundingClientRect();
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
      previewRange: matchRange
    }));
    
    // Reset the updating flag
    isUpdatingRef.current = false;
  }, [editorRef, isUpdatingRef, restoreSelection, setAiPopover, setAiSidebar]);

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
  }, [editorRef, isUpdatingRef, setAiPopover, setAiSidebar]);

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
    handleCancelAI();
    
    // Update loading state
    setAiSidebar(prev => ({
      ...prev,
      visible: true,
      isLoading: true
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
  }, [setAiSidebar, handleCancelAI, applyPreview]);

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
  }, [editorRef, isUpdatingRef, setAiPopover, setAiSidebar]);

  return {
    handleGenerateRequest,
    applyPreview,
    handleApproveChanges,
    handleRegenerate,
    handleCancelAI
  };
};

export default useEditorAI;
