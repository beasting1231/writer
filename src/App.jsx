import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Editor from './components/Editor/index';
import WordCount from './components/WordCount';
import { ChaptersSidebar, SidebarToggle } from './components/Sidebar';

function App() {
  const [chaptersContent, setChaptersContent] = useState({ 1: '' });
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
    setChaptersContent(prev => ({ ...prev, [activeChapterId]: newContent }));
  }, [activeChapterId]);

  // Editor command functionality removed

  const handleFocus = useCallback((editor) => {
    console.log("Setting last focused editor");
    lastFocusedEditorRef.current = editor;
    // Ensure the editor gets focus
    if (editor) {
      editor.focus();
    }
  }, []);

    // Derive current chapter content
  const currentContent = chaptersContent[activeChapterId] || '';

  // Word count for the active chapter
  const totalContent = useMemo(() => currentContent, [currentContent]);

  // Helper to switch chapters while saving current editor content
  const handleSetActiveChapterId = useCallback((newId) => {
    if (newId === activeChapterId) return;
    if (editorRef.current && editorRef.current.getContent) {
      const currentHtml = editorRef.current.getContent();
      setChaptersContent(prev => ({ ...prev, [activeChapterId]: currentHtml }));
    }
    setActiveChapterId(newId);
  }, [activeChapterId]);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Chapters sidebar */}
        <ChaptersSidebar 
        isOpen={sidebarOpen}
        chaptersContent={chaptersContent}
        setChaptersContent={setChaptersContent}
        activeChapterId={activeChapterId}
        setActiveChapterId={handleSetActiveChapterId}
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
              content={currentContent}
              chapterId={activeChapterId}
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
