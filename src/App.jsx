import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Editor from './components/Editor/index';
import WordCount from './components/WordCount';
import { ChaptersSidebar, SidebarToggle } from './components/Sidebar';

function App() {
  const [content, setContent] = useState('');
  const [chaptersContent, setChaptersContent] = useState({});
  const [activeChapterId, setActiveChapterId] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const editorRef = useRef(null);
  const lastFocusedEditorRef = useRef(null);
  
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

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
      {/* Chapters sidebar */}
      <ChaptersSidebar 
        isOpen={sidebarOpen}
        chaptersContent={chaptersContent}
        setChaptersContent={setChaptersContent}
        activeChapterId={activeChapterId}
        setActiveChapterId={setActiveChapterId}
      />
      
      {/* Sidebar toggle button */}
      <SidebarToggle 
        isOpen={sidebarOpen} 
        toggleSidebar={toggleSidebar} 
      />
      
      {/* Main content area that moves with the sidebar */}
      <div 
        className={`main-content flex-1 flex flex-col max-w-full transition-transform ${sidebarOpen ? 'sidebar-open' : ''}`}
      >
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
