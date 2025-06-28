import React from 'react';
import Editor from './Editor';

const Page = ({ content, onContentChange, pageIndex, onEditorFocus }) => {
  return (
    <div className="page">
      <Editor 
        content={content}
        onContentChange={onContentChange}
        pageIndex={pageIndex}
        onEditorFocus={onEditorFocus}
      />
    </div>
  );
};

export default Page;
