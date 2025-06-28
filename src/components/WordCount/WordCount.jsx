import React, { useMemo } from 'react';
import './WordCount.css';

const WordCount = ({ content }) => {
  const wordCount = useMemo(() => {
    if (!content) return 0;
    
    // Remove HTML tags
    const textContent = content.replace(/<[^>]*>/g, ' ');
    
    // Count words (sequences of characters separated by whitespace)
    const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
    
    return words.length;
  }, [content]);

  return (
    <div className="word-count">
      <span className="word-count-value">{wordCount}</span>
      <span className="word-count-label">words</span>
    </div>
  );
};

export default WordCount;
