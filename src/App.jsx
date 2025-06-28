import React, { useState, useEffect, useRef, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import Page from './components/Page';
import Chapterssidebar from './components/Chapterssidebar';

function App() {
  const initialChapterContent = {
    1: [{ content: '<h1>Welcome to Your Multi-Page Editor</h1><p>This document now supports automatic pagination. As you type and the content exceeds the page size, a new page will be created automatically. The toolbar above will stay fixed for easy access.</p>' }]
  };

  const [chaptersContent, setChaptersContent] = useState(initialChapterContent);
  const [activeChapterId, setActiveChapterId] = useState(1);
  const [pages, setPages] = useState(chaptersContent[activeChapterId] || [{ content: '' }]);
  const [lockedPages, setLockedPages] = useState(new Set());
  const editorRefs = useRef({});
  const lastFocusedEditorRef = useRef(null);
  const pagesContainerRef = useRef(null);

  useEffect(() => {
    setPages(chaptersContent[activeChapterId] || [{ content: '' }]);
  }, [activeChapterId, chaptersContent]);

  useEffect(() => {
    setTimeout(() => {
      const firstEditor = document.querySelector('.editor');
      if (firstEditor) {
        firstEditor.focus();
      }
    }, 100);
  }, [activeChapterId]);

  const createNewPage = useCallback(() => {
    const newPage = { content: '' };
    setPages(prevPages => [...prevPages, newPage]);
    return newPage;
  }, []);

  const handleContentChange = useCallback((pageIndex, newContent, editorElement) => {
    if (lockedPages.has(pageIndex)) return;
    
    setPages(prevPages => {
      const updatedPages = [...prevPages];
      if(updatedPages[pageIndex]) {
        updatedPages[pageIndex].content = newContent;
      }
      
      setChaptersContent(prevChaptersContent => ({
        ...prevChaptersContent,
        [activeChapterId]: updatedPages
      }));
      return updatedPages;
    });

    setTimeout(() => {
      if (editorElement) {
        flowDown(editorElement);
        consolidateUp();
      }
    }, 0);
  }, [activeChapterId, lockedPages]);

  const flowDown = useCallback((editor) => {
    if (!editor) return;

    const page = editor.closest('.page');
    if (!page) return;
    const pageIndex = Array.from(page.parentNode.children).indexOf(page);
    
    if (lockedPages.has(pageIndex)) return;
    
    let nextPage = page.nextElementSibling;
    let contentWasMoved = false;

    while (editor.scrollHeight > editor.clientHeight && editor.lastChild) {
      if (!nextPage) {
        createNewPage();
        setTimeout(() => {
          nextPage = page.nextElementSibling;
          if (nextPage) {
            const nextEditor = nextPage.querySelector('.editor');
            if (nextEditor && editor.lastChild) {
              nextEditor.prepend(editor.lastChild);
              contentWasMoved = true;
              
              setPages(prevPages => {
                const updatedPages = [...prevPages];
                const currentPageIndex = Array.from(page.parentNode.children).indexOf(page);
                const nextPageIndex = currentPageIndex + 1;
                if (updatedPages[currentPageIndex]) updatedPages[currentPageIndex].content = editor.innerHTML;
                if (updatedPages[nextPageIndex]) updatedPages[nextPageIndex].content = nextEditor.innerHTML;
                return updatedPages;
              });

              nextEditor.focus();
              const selection = window.getSelection();
              const range = document.createRange();
              if (nextEditor.firstChild) {
                range.setStart(nextEditor.firstChild, 0);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
              }

              flowDown(nextEditor);
            }
          }
        }, 10);
        break;
      } else {
        const nextEditor = nextPage.querySelector('.editor');
        if (nextEditor) {
          nextEditor.prepend(editor.lastChild);
          contentWasMoved = true;
        }
      }
    }

    if (contentWasMoved && nextPage) {
      const nextEditor = nextPage.querySelector('.editor');
      if (nextEditor) {
        setTimeout(() => {
          const currentPageIndex = Array.from(page.parentNode.children).indexOf(page);
          const nextPageIndex = currentPageIndex + 1;
          setPages(prevPages => {
            const updatedPages = [...prevPages];
            if (updatedPages[currentPageIndex]) updatedPages[currentPageIndex].content = editor.innerHTML;
            if (updatedPages[nextPageIndex]) updatedPages[nextPageIndex].content = nextEditor.innerHTML;
            return updatedPages;
          });
        }, 0);

        nextEditor.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        if (nextEditor.firstChild) {
          range.setStart(nextEditor.firstChild, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }

        if (nextEditor.scrollHeight > nextEditor.clientHeight) {
          flowDown(nextEditor);
        }
      }
    }
  }, [createNewPage, lockedPages]);

  const consolidateUp = useCallback(() => {
    const pageElements = document.querySelectorAll('.page');
    if (pageElements.length <= 1) return;

    for (let i = 0; i < pageElements.length - 1; i++) {
      const currentPage = pageElements[i];
      const nextPage = pageElements[i + 1];
      const currentEditor = currentPage.querySelector('.editor');
      const nextEditor = nextPage.querySelector('.editor');

      if (currentEditor && nextEditor) {
        while (nextEditor.firstChild) {
          const testEl = nextEditor.firstChild.cloneNode(true);
          currentEditor.appendChild(testEl);
          
          if (currentEditor.scrollHeight > currentEditor.clientHeight) {
            currentEditor.removeChild(currentEditor.lastChild);
            break;
          } else {
            currentEditor.appendChild(nextEditor.firstChild);
          }
        }
      }
    }

    setTimeout(() => {
      const updatedPageElements = document.querySelectorAll('.page');
      let pagesToKeep = updatedPageElements.length;
      
      for (let i = updatedPageElements.length - 1; i > 0; i--) {
        const editor = updatedPageElements[i].querySelector('.editor');
        if (editor && !editor.hasChildNodes() && !editor.textContent.trim()) {
          pagesToKeep = i;
        } else {
          break;
        }
      }

      if (pagesToKeep < pages.length) {
        setPages(prevPages => {
          const newPages = prevPages.slice(0, pagesToKeep);
          updatedPageElements.forEach((pageEl, index) => {
            if (index < newPages.length) {
              const editor = pageEl.querySelector('.editor');
              if (editor && newPages[index]) {
                newPages[index].content = editor.innerHTML;
              }
            }
          });
          return newPages;
        });
      }
    }, 0);
  }, [pages.length]);

  const executeEditorCommand = useCallback((command, value = null) => {
    const editor = lastFocusedEditorRef.current;
    if (!editor) {
      console.error("Editor not focused.");
      return;
    }
    
    // Save the current selection
    const selection = window.getSelection();
    const hasSelection = selection.rangeCount > 0;
    let range = null;
    
    if (hasSelection) {
      range = selection.getRangeAt(0).cloneRange();
    }
    
    // Focus the editor
    editor.focus();
    
    // Special handling for fontSize
    if (command === 'fontSize') {
      // If there's no selection, try to create one
      if (!hasSelection || selection.toString().trim() === '') {
        // If no text is selected, we'll apply to the current cursor position
        // by creating a temporary span
        const tempSpan = document.createElement('span');
        tempSpan.innerHTML = '&#8203;'; // Zero-width space
        
        // Insert at cursor position
        if (range) {
          range.insertNode(tempSpan);
          range.selectNode(tempSpan);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      
      try {
        // Apply the font size
        document.execCommand('fontSize', false, value);
        
        // Trigger input event to update content
        editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      } catch (e) {
        console.error(`Failed to execute fontSize command:`, e);
      }
      
      return;
    }
    
    // Handle list commands
    if (command === 'insertorderedlist' || command === 'insertunorderedlist') {
      try {
        // Check if we're already in a list item
        const listItem = selection.anchorNode.parentElement.closest('li');
        const listType = command === 'insertorderedlist' ? 'ol' : 'ul';
        
        // If we're already in a list item of the same type, outdent it
        if (listItem) {
          const parentList = listItem.parentElement;
          if (parentList.tagName.toLowerCase() === listType) {
            document.execCommand('outdent', false);
            return;
          } else {
            // If it's a different list type, convert it
            const newList = document.createElement(listType);
            while (listItem.firstChild) {
              const li = document.createElement('li');
              li.innerHTML = listItem.innerHTML;
              newList.appendChild(li);
              listItem.remove();
            }
            parentList.parentNode.insertBefore(newList, parentList);
            if (parentList.childNodes.length === 0) {
              parentList.remove();
            }
            return;
          }
        }
        
        // If we're not in a list, create a new one
        document.execCommand(command, false, null);
        
        // Ensure the list has the correct class for styling
        const lists = editor.getElementsByTagName(listType);
        if (lists.length > 0) {
          const lastList = lists[lists.length - 1];
          lastList.classList.add('editor-list');
        }
      } catch (e) {
        console.error(`Failed to execute ${command}:`, e);
      }
      
      // Trigger input event to update content
      editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      return;
    }
    
    // For other commands
    try {
      document.execCommand(command, false, value);
      editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    } catch (e) {
      console.error(`Failed to execute command ${command}:`, e);
    }
  }, []);

  const handleFocus = useCallback((editor) => {
    console.log("Setting last focused editor");
    lastFocusedEditorRef.current = editor;
    // Ensure the editor gets focus
    if (editor) {
      editor.focus();
    }
  }, []);



  const duplicatePage = (pageIndex) => {
    setPages(prevPages => {
      const newPages = [...prevPages];
      const pageToDuplicate = { ...newPages[pageIndex] };
      newPages.splice(pageIndex + 1, 0, pageToDuplicate);
      return newPages;
    });
  };

  const deletePage = (pageIndex) => {
    if (pages.length === 1) {
      alert("You cannot delete the only page in a chapter.");
      return;
    }
    setPages(prevPages => prevPages.filter((_, index) => index !== pageIndex));
  };

  const toggleLockPage = (pageIndex) => {
    setLockedPages(prev => {
      const newLocked = new Set(prev);
      if (newLocked.has(pageIndex)) {
        newLocked.delete(pageIndex);
      } else {
        newLocked.add(pageIndex);
      }
      return newLocked;
    });
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Chapterssidebar
        chaptersContent={chaptersContent}
        setChaptersContent={setChaptersContent}
        activeChapterId={activeChapterId}
        setActiveChapterId={setActiveChapterId}
      />
      <div className="flex-1 flex flex-col">
        <Toolbar 
          executeEditorCommand={executeEditorCommand} 
          editorRef={lastFocusedEditorRef}
        />
        <div ref={pagesContainerRef} className="flex-1 overflow-auto p-8 bg-gray-900">
          {pages.map((page, index) => (
            <Page
              key={index}
              content={page.content}
              pageIndex={index}
              onContentChange={(pageIndex, newContent, editorElement) => handleContentChange(pageIndex, newContent, editorElement)}
              onEditorFocus={handleFocus}
              isLocked={lockedPages.has(index)}
              onDuplicate={duplicatePage}
              onDelete={deletePage}
              onToggleLock={toggleLockPage}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
