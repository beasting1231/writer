import { useCallback } from 'react';
import { processWithGemini } from '../../utils/geminiApi';

/**
 * Hook for handling proofreading functionality in the editor
 */
const useEditorProofreading = (
  editorRef,
  setAiSidebar,
  setProofreadingIssues,
  isUpdatingRef,
  restoreSelection
) => {
  // Handle proofreading the entire chapter
  const handleProofreadChapter = useCallback(async () => {
    if (!editorRef.current) return;
    
    // Get the entire content of the editor
    const editorContent = editorRef.current.innerText;
    
    if (!editorContent || editorContent.trim().length === 0) return;
    
    // Show the AI sidebar with loading state
    setAiSidebar(prev => ({
      ...prev,
      visible: true,
      activeAction: 'proofread-chapter',
      selectedText: editorContent,
      processedText: '',
      isLoading: true,
      previewActive: false,
      previewRange: null
    }));
    
    try {
      // Process the text with Gemini API for proofreading
      const response = await processWithGemini(
        editorContent,
        'proofread-chapter'
      );
      
      // Parse the response to get proofreading issues
      let issues = [];
      
      try {
        // Try to parse the response as JSON
        const parsedResponse = JSON.parse(response);
        
        if (Array.isArray(parsedResponse)) {
          issues = parsedResponse.map((issue, index) => ({
            id: `issue-${index}`,
            type: issue.type || 'general',
            text: issue.text || '',
            suggestion: issue.suggestion || '',
            context: issue.context || '',
            explanation: issue.explanation || ''
          }));
        }
      } catch (parseError) {
        console.error('Error parsing proofreading response:', parseError);
        
        // If parsing fails, try to extract issues using regex
        const issueRegex = /Issue (\d+):\s*(.+?)\s*Suggestion:\s*(.+?)(?=Issue|$)/gs;
        let match;
        let index = 0;
        
        while ((match = issueRegex.exec(response)) !== null) {
          issues.push({
            id: `issue-${index}`,
            type: 'general',
            text: match[2].trim(),
            suggestion: match[3].trim(),
            context: '',
            explanation: ''
          });
          index++;
        }
      }
      
      // Update the proofreading issues state
      setProofreadingIssues(issues);
      
      // Update the AI sidebar state
      setAiSidebar(prev => ({
        ...prev,
        processedText: response,
        isLoading: false
      }));
      
      // Highlight the issues in the editor
      highlightProofreadingIssues(issues);
    } catch (error) {
      console.error('Error proofreading chapter:', error);
      
      // Update the AI sidebar state with error
      setAiSidebar(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to proofread chapter. Please try again.'
      }));
    }
  }, [editorRef, setAiSidebar, setProofreadingIssues]);

  // Highlight proofreading issues in the editor
  const highlightProofreadingIssues = useCallback((issues) => {
    if (!editorRef.current || !issues || issues.length === 0) return;
    
    // Set flag to prevent selection change handlers from firing
    isUpdatingRef.current = true;
    
    // Remove existing highlights
    const existingHighlights = editorRef.current.querySelectorAll('.proofreading-issue');
    existingHighlights.forEach(highlight => {
      const textNode = document.createTextNode(highlight.textContent);
      highlight.parentNode.replaceChild(textNode, highlight);
    });
    
    // Create a TreeWalker to iterate through all text nodes
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    // For each issue, find and highlight the text
    issues.forEach(issue => {
      const issueText = issue.text;
      if (!issueText || issueText.trim().length === 0) return;
      
      // Reset the walker to the beginning
      walker.currentNode = editorRef.current;
      
      let node;
      while ((node = walker.nextNode())) {
        const nodeText = node.textContent;
        
        // If this node contains the issue text
        if (nodeText.includes(issueText)) {
          const startOffset = nodeText.indexOf(issueText);
          const endOffset = startOffset + issueText.length;
          
          // Create a range for the issue text
          const range = document.createRange();
          range.setStart(node, startOffset);
          range.setEnd(node, endOffset);
          
          // Create a wrapper span for the issue
          const wrapper = document.createElement('span');
          wrapper.className = 'proofreading-issue';
          wrapper.setAttribute('data-issue-id', issue.id);
          
          // Wrap the issue text
          range.surroundContents(wrapper);
          
          // Add click event listener to the wrapper
          wrapper.addEventListener('click', () => {
            // Show the issue details in the AI sidebar
            setAiSidebar(prev => ({
              ...prev,
              visible: true,
              activeAction: 'proofread-issue',
              selectedIssue: issue
            }));
          });
          
          // Skip to the next issue
          break;
        }
      }
    });
    
    // Reset the updating flag
    isUpdatingRef.current = false;
  }, [editorRef, isUpdatingRef, setAiSidebar]);

  // Handle fixing a proofreading issue
  const handleFixIssue = useCallback((issue) => {
    if (!editorRef.current || !issue) return;
    
    // Find the issue element in the editor
    const issueElement = editorRef.current.querySelector(`[data-issue-id="${issue.id}"]`);
    if (!issueElement) return;
    
    // Set flag to prevent selection change handlers from firing
    isUpdatingRef.current = true;
    
    // Replace the issue text with the suggestion
    const textNode = document.createTextNode(issue.suggestion);
    issueElement.parentNode.replaceChild(textNode, issueElement);
    
    // Remove the issue from the proofreading issues list
    setProofreadingIssues(prev => prev.filter(i => i.id !== issue.id));
    
    // Reset the updating flag
    isUpdatingRef.current = false;
  }, [editorRef, isUpdatingRef, setProofreadingIssues]);

  // Handle proofreading event from the toolbar
  const handleProofreadEvent = useCallback(() => {
    console.log('Proofreading event received');
    handleProofreadChapter();
  }, [handleProofreadChapter]);

  return {
    handleProofreadChapter,
    highlightProofreadingIssues,
    handleFixIssue,
    handleProofreadEvent
  };
};

export default useEditorProofreading;
