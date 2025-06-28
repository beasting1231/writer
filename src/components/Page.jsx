import React from 'react';
import Editor from './Editor';
import PageHeader from './PageHeader';

const Page = ({ 
  content, 
  onContentChange, 
  pageIndex, 
  onEditorFocus, 
  isLocked = false,
  onDuplicate,
  onDelete,
  onToggleLock
}) => {
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
        content={content}
        onContentChange={onContentChange}
        pageIndex={pageIndex}
        onEditorFocus={onEditorFocus}
        isLocked={isLocked}
      />
    </div>
  );
};

export default Page;
