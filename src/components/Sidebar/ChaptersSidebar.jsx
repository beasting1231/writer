import React, { useState, useEffect } from 'react';
import './ChaptersSidebar.css';
// Import Material UI icons
import AddIcon from '@mui/icons-material/Add';
import GridViewIcon from '@mui/icons-material/GridView';

const ChaptersSidebar = ({ 
  isOpen, 
  chaptersContent = {}, 
  setChaptersContent = () => {}, 
  activeChapterId, 
  setActiveChapterId 
}) => {
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
  }, [chaptersContent, setChaptersContent, setActiveChapterId, chapters]);

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
    <div className={`chapters-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <GridViewIcon className="sidebar-icon" />
        <h2>Overview</h2>
      </div>
      
      <div className="chapters-title">CHAPTERS</div>
      
      <div className="chapters-list">
        {chapters.map(chapter => (
          <div
            key={chapter.id}
            className={`chapter-item ${activeChapterId === chapter.id ? 'active' : ''}`}
            onClick={() => handleChapterClick(chapter.id)}
          >
            <div className="chapter-number">
              {String(chapter.id).padStart(2, '0')}
            </div>
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
                {chapter.name}
              </span>
            )}
          </div>
        ))}
      </div>
      
      <button className="add-chapter-button" onClick={handleAddChapter}>
        <AddIcon className="add-icon" />
        <span>Add Chapter</span>
      </button>
    </div>
  );
};

export default ChaptersSidebar;
