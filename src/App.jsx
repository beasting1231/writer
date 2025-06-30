import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Editor from './components/Editor/index';
import WordCount from './components/WordCount';

function App() {
  const [content, setContent] = useState('');
  const editorRef = useRef(null);
  const lastFocusedEditorRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      const editor = document.querySelector('.editor');
      if (editor) {
        editor.focus();
      }
    }, 100);
  }, []);

  const handleContentChange = useCallback((_, newContent) => {
    setContent(newContent);
  }, []);

  // Editor command functionality removed

  const handleFocus = useCallback((editor) => {
    console.log("Setting last focused editor");
    lastFocusedEditorRef.current = editor;
    // Ensure the editor gets focus
    if (editor) {
      editor.focus();
    }
  }, []);

  // Use the content directly for word count
  const totalContent = useMemo(() => {
    return content;
  }, [content]);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <div className="flex-1 flex flex-col max-w-full">
        <div className="flex-1 overflow-auto bg-black">
          <div className="canvas-container max-w-full">
            <Editor
              ref={editorRef}
              content={content}
              pageIndex={0}
              onContentChange={handleContentChange}
              onEditorFocus={handleFocus}
              isLocked={false}
            />
          </div>
        </div>
        {/* Word count component positioned at the bottom of the screen */}
        <WordCount content={totalContent} />
      </div>
    </div>
  );
}

export default App;
