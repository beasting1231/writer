import React, { useState, useEffect } from 'react';
import './Chapterssidebar.css';

const Chapterssidebar = ({ chaptersContent, setChaptersContent, activeChapterId, setActiveChapterId }) => {
  const [chapters, setChapters] = useState([{ id: 1, name: 'Introduction' }]);
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [newChapterName, setNewChapterName] = useState('');

  // Initialize chapters from chaptersContent if it's empty
  useEffect(() => {
    if (Object.keys(chaptersContent).length === 0) {
      setChapters([{ id: 1, name: 'Introduction' }]);
      setChaptersContent({ 1: [{ content: '' }] });
      setActiveChapterId(1);
    } else {
      // Ensure chapters state reflects the keys in chaptersContent
      const currentChapterIds = chapters.map(c => c.id);
      const contentChapterIds = Object.keys(chaptersContent).map(Number);
      
      const newChaptersList = contentChapterIds
        .filter(id => !currentChapterIds.includes(id))
        .map(id => ({ id, name: `Chapter ${id}` })); // Default name if not stored

      setChapters(prevChapters => {
        const updatedChapters = [...prevChapters];
        newChaptersList.forEach(newChap => {
          if (!updatedChapters.some(c => c.id === newChap.id)) {
            updatedChapters.push(newChap);
          }
        });
        return updatedChapters.sort((a, b) => a.id - b.id);
      });
    }
  }, [chaptersContent, setChaptersContent, setActiveChapterId]);


  const handleAddChapter = () => {
    const newId = chapters.length > 0 ? Math.max(...chapters.map(c => c.id)) + 1 : 1;
    const newChapter = { id: newId, name: `Chapter ${newId}` };
    setChapters([...chapters, newChapter].sort((a, b) => a.id - b.id));
    setChaptersContent(prev => ({ ...prev, [newId]: [{ content: '' }] }));
    setActiveChapterId(newId);
  };

  const handleRenameChapter = (id, newName) => {
    setChapters(chapters.map(chapter =>
      chapter.id === id ? { ...chapter, name: newName } : chapter
    ));
    setEditingChapterId(null);
  };

  const handleDoubleClick = (id, currentName) => {
    setEditingChapterId(id);
    setNewChapterName(currentName);
  };

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      handleRenameChapter(id, newChapterName);
    } else if (e.key === 'Escape') {
      setEditingChapterId(null);
    }
  };

  const handleChapterClick = (id) => {
    setActiveChapterId(id);
  };

  return (
    <div className="chapter-sidebar">
      <h2>Chapters</h2>
      <ul>
        {chapters.map(chapter => (
          <li
            key={chapter.id}
            className={`chapter-item ${activeChapterId === chapter.id ? 'active' : ''}`}
            onClick={() => handleChapterClick(chapter.id)}
          >
            {editingChapterId === chapter.id ? (
              <input
                type="text"
                value={newChapterName}
                onChange={(e) => setNewChapterName(e.target.value)}
                onBlur={() => handleRenameChapter(chapter.id, newChapterName)}
                onKeyDown={(e) => handleKeyDown(e, chapter.id)}
                autoFocus
              />
            ) : (
              <span onDoubleClick={() => handleDoubleClick(chapter.id, chapter.name)}>
                {chapter.id}. {chapter.name}
              </span>
            )}
          </li>
        ))}
      </ul>
      <button onClick={handleAddChapter}>Add New Chapter</button>
    </div>
  );
};

export default Chapterssidebar;
