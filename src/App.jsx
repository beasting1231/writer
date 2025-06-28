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
  const [pages, setPages] = useState(chaptersContent[activeChapterId]);
  const editorRefs = useRef({}); // To store refs for each editor on each page
  const lastFocusedEditorRef = useRef(null); // To store the last focused editor

  const pagesContainerRef = useRef(null);

  // Update pages when activeChapterId changes
  useEffect(() => {
    setPages(chaptersContent[activeChapterId] || [{ content: '' }]);
  }, [activeChapterId, chaptersContent]);

  useEffect(() => {
    // Focus on the first editor when component mounts or chapter changes
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
    setPages(prevPages => {
      const updatedPages = [...prevPages];
      updatedPages[pageIndex].content = newContent;
      
      // Save content to the current active chapter
      setChaptersContent(prevChaptersContent => ({
        ...prevChaptersContent,
        [activeChapterId]: updatedPages
      }));
      return updatedPages;
    });

    setTimeout(() => {
      flowDown(editorElement);
      consolidateUp();
    }, 0);
  }, [activeChapterId]);

  const flowDown = useCallback((editor) => {
    if (!editor) return;

    const page = editor.closest('.page');
    let nextPage = page.nextElementSibling;
    let contentWasMoved = false;

    while (editor.scrollHeight > editor.clientHeight && editor.lastChild) {
      if (!nextPage) {
        // Create new page
        createNewPage();
        // Wait for the new page to be rendered
        setTimeout(() => {
          nextPage = page.nextElementSibling;
          if (nextPage) {
            const nextEditor = nextPage.querySelector('.editor');
            if (nextEditor && editor.lastChild) {
              nextEditor.prepend(editor.lastChild);
              contentWasMoved = true;
              
              // Update the content in state
              setPages(prevPages => {
                const updatedPages = [...prevPages];
                const pageIndex = Array.from(page.parentNode.children).indexOf(page);
                const nextPageIndex = pageIndex + 1;
                if (updatedPages[pageIndex]) updatedPages[pageIndex].content = editor.innerHTML;
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
          const pageIndex = Array.from(page.parentNode.children).indexOf(page);
          const nextPageIndex = pageIndex + 1;
          setPages(prevPages => {
            const updatedPages = [...prevPages];
            if (updatedPages[pageIndex]) updatedPages[pageIndex].content = editor.innerHTML;
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
  }, [createNewPage]);

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
        if (!editor.hasChildNodes() && !editor.textContent.trim()) {
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
    console.log("Executing command:", command, "with value:", value);
    
    // First try to use the last focused editor
    let editor = lastFocusedEditorRef.current;
    console.log("Last focused editor:", editor);
    
    // If no last focused editor, try to find the first focused editor
    if (!editor) {
      editor = document.querySelector('.editor:focus');
      console.log("Currently focused editor:", editor);
    }
    
    // If still no editor, try to find the first editor
    if (!editor) {
      editor = document.querySelector('.editor');
      console.log("First available editor:", editor);
    }
    
    if (editor) {
      console.log("Using editor:", editor);
      
      // Save the current selection
      const selection = window.getSelection();
      let range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      
      try {
        // Focus the editor before executing command
        console.log("Focusing editor");
        editor.focus();
        
        // If no range exists, create one at the end of the editor
        if (!range) {
          range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        console.log(`Executing command: ${command}`);
        console.log(`Selection text: "${selection.toString()}"`);
        console.log(`Range exists: ${!!range}`);
        
        // Handle formatBlock command (headings and paragraphs)
        if (command === 'formatBlock') {
          const blockElement = document.createElement(value);
          
          if (selection.toString().length > 0) {
            // If text is selected, wrap it in the block element
            blockElement.innerHTML = selection.toString();
            range.deleteContents();
            range.insertNode(blockElement);
          } else {
            // If no text is selected, format the current line/block
            // Find the current block element or create a new one
            let currentNode = range ? range.startContainer : editor;
            
            // Navigate up to find the current block element
            while (currentNode && currentNode !== editor && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'DIV'].includes(currentNode.nodeName)) {
              currentNode = currentNode.parentNode;
            }
            
            if (currentNode && currentNode !== editor) {
              // Replace the current block with the new one
              const newBlock = document.createElement(value);
              newBlock.innerHTML = currentNode.innerHTML;
              currentNode.parentNode.replaceChild(newBlock, currentNode);
              
              // Set cursor at the end of the new block
              const newRange = document.createRange();
              newRange.selectNodeContents(newBlock);
              newRange.collapse(false);
              selection.removeAllRanges();
              selection.addRange(newRange);
            } else {
              // Create a new block element at the cursor position
              blockElement.innerHTML = '<br>';
              if (range) {
                range.insertNode(blockElement);
                // Move cursor inside the new block
                const newRange = document.createRange();
                newRange.setStart(blockElement, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            }
          }
          
          // Manually trigger input event to update React state
          const event = new Event('input', { bubbles: true });
          editor.dispatchEvent(event);
          return;
        }
        
        // Handle inline formatting commands (bold, italic, underline)
        if (command === 'bold' || command === 'italic' || command === 'underline') {
          console.log(`Handling ${command} command`);
          
          // Use document.execCommand for basic formatting - it's more reliable
          const success = document.execCommand(command, false, null);
          console.log(`${command} command executed: ${success}`);
          
          if (!success) {
            // Fallback to manual approach if execCommand fails
            if (selection.toString().length > 0) {
              // If text is selected, wrap it in a styled element
              const selectedText = selection.toString();
              const newElement = document.createElement('span');
              
              if (command === 'bold') {
                newElement.style.fontWeight = 'bold';
              } else if (command === 'italic') {
                newElement.style.fontStyle = 'italic';
              } else if (command === 'underline') {
                newElement.style.textDecoration = 'underline';
              }
              
              newElement.textContent = selectedText;
              range.deleteContents();
              range.insertNode(newElement);
              console.log(`Applied ${command} to selected text: "${selectedText}"`);
            } else {
              // If no text is selected, create a styled element at cursor position
              console.log("No text selected, creating styled element at cursor");
              
              const newElement = document.createElement('span');
              
              if (command === 'bold') {
                newElement.style.fontWeight = 'bold';
              } else if (command === 'italic') {
                newElement.style.fontStyle = 'italic';
              } else if (command === 'underline') {
                newElement.style.textDecoration = 'underline';
              }
              
              // Insert a placeholder character that will be styled
              newElement.textContent = '\u200B'; // Zero-width space
              range.insertNode(newElement);
              
              // Move cursor after the inserted element
              const newRange = document.createRange();
              newRange.setStartAfter(newElement);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
              
              console.log(`Created ${command} element at cursor position`);
            }
          }
        } else if (command === 'justifyleft' || command === 'justifycenter' || command === 'justifyright' || command === 'justifyfull') {
          // Handle text alignment commands
          console.log(`Handling alignment command: ${command}`);
          
          // Use document.execCommand for alignment
          const success = document.execCommand(command, false, null);
          console.log(`${command} command executed: ${success}`);
          
          if (!success) {
            // Fallback to manual approach if execCommand fails
            let textAlign = 'left';
            if (command === 'justifycenter') textAlign = 'center';
            else if (command === 'justifyright') textAlign = 'right';
            else if (command === 'justifyfull') textAlign = 'justify';
            
            // Find the current block element and apply alignment
            let currentNode = range ? range.startContainer : editor;
            
            // Navigate up to find the current block element
            while (currentNode && currentNode !== editor && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'DIV'].includes(currentNode.nodeName)) {
              currentNode = currentNode.parentNode;
            }
            
            if (currentNode && currentNode !== editor) {
              currentNode.style.textAlign = textAlign;
              console.log(`Applied ${textAlign} alignment to block element`);
            } else {
              // Create a new div with alignment
              const newDiv = document.createElement('div');
              newDiv.style.textAlign = textAlign;
              newDiv.innerHTML = '<br>';
              if (range) {
                range.insertNode(newDiv);
                // Move cursor inside the new div
                const newRange = document.createRange();
                newRange.setStart(newDiv, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
              console.log(`Created new div with ${textAlign} alignment`);
            }
          }
        } else if (command === 'insertHTML') {
          // For inserting elements like lists
          const htmlElement = document.createElement('div');
          htmlElement.innerHTML = value;
          range.deleteContents();
          range.insertNode(htmlElement.firstChild);
        }
        
        console.log("Command executed successfully");
        
        // Manually trigger input event to update React state
        console.log("Dispatching input event");
        const event = new Event('input', { bubbles: true });
        editor.dispatchEvent(event);
      } catch (error) {
        console.error("Error executing command:", error);
      }
    } else {
      console.log("No editor found to execute command");
    }
  }, []);

  return (
    <div className="app-container">
      <Chapterssidebar
        chaptersContent={chaptersContent}
        setChaptersContent={setChaptersContent}
        activeChapterId={activeChapterId}
        setActiveChapterId={setActiveChapterId}
      />
      <div className="main-content">
        <Toolbar executeEditorCommand={executeEditorCommand} />
        <div id="pages-container" ref={pagesContainerRef}>
          {pages.map((page, index) => (
            <Page
              key={`${activeChapterId}-${index}`} /* Unique key for page */
              content={page.content}
              onContentChange={handleContentChange}
              pageIndex={index}
              onEditorFocus={(editor) => lastFocusedEditorRef.current = editor}
            />
          ))}
        </div>
        <div id="message-box"></div>
      </div>
    </div>
  );
}

export default App;
