import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import Editor from './Editor';
import PageHeader from './PageHeader';

const Page = forwardRef(({ 
  content, 
  onContentChange, 
  pageIndex, 
  onEditorFocus, 
  isLocked = false,
  onDuplicate,
  onDelete,
  onToggleLock
}, ref) => {
  const editorRef = useRef(null);
  
  // Expose editor methods to parent component
  useImperativeHandle(ref, () => ({
    proofreadChapter: () => {
      if (editorRef.current) {
        editorRef.current.proofreadChapter();
      }
    }
  }), []);
  return (
    <div className="page">
      <PageHeader
        pageNumber={pageIndex + 1}
        isLocked={isLocked}
        onDuplicate={() => onDuplicate && onDuplicate(pageIndex)}
        onDelete={() => onDelete && onDelete(pageIndex)}
        onToggleLock={() => onToggleLock && onToggleLock(pageIndex)}
      />
      <Editor 
        ref={editorRef}
        content={content}
        onContentChange={onContentChange}
        pageIndex={pageIndex}
        onEditorFocus={onEditorFocus}
        isLocked={isLocked}
      />
    </div>
  );
});

export default Page;
