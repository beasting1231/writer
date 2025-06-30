import { useCallback } from 'react';

/**
 * Hook for managing text selection in the editor
 */
const useEditorSelection = (editorRef, isUpdatingRef, setSelectedText, setSelectedRange) => {
  // Save the current selection
  const saveSelection = useCallback((savedSelectionRef) => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      savedSelectionRef.current = range;
      setSelectedRange(range.cloneRange());
    }
  }, [editorRef, setSelectedRange]);

  // Restore the saved selection
  const restoreSelection = useCallback((savedSelectionRef) => {
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelectionRef.current);
      return true;
    }
    return false;
  }, []);

  // Handle selection change
  const handleSelectionChange = useCallback((savedSelectionRef) => {
    if (!isUpdatingRef.current) {
      saveSelection(savedSelectionRef);
      
      // Get the selected text
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0 && 
          editorRef.current && editorRef.current.contains(selection.anchorNode)) {
        setSelectedText(selection.toString());
      } else {
        setSelectedText('');
      }
    }
  }, [editorRef, isUpdatingRef, saveSelection, setSelectedText]);

  return {
    saveSelection,
    restoreSelection,
    handleSelectionChange
  };
};

export default useEditorSelection;
