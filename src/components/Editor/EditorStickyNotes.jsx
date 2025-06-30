import { useCallback } from 'react';

/**
 * Hook for managing sticky notes in the editor
 */
const useEditorStickyNotes = (
  setStickyNotes,
  pageIndex
) => {
  // Handle removing a sticky note
  const handleRemoveStickyNote = useCallback((noteId) => {
    setStickyNotes(prev => prev.filter(note => note.id !== noteId));
  }, [setStickyNotes]);

  return {
    handleRemoveStickyNote
  };
};

export default useEditorStickyNotes;
