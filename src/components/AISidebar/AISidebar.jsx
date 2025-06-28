import React, { useState } from 'react';
import './AISidebar.css';

const AISidebar = ({ 
  isVisible, 
  activeAction, 
  selectedText, 
  processedText, 
  isLoading, 
  onApply, 
  onCancel, 
  onRegenerate,
  onGenerateRequest 
}) => {
  if (!isVisible) return null;
  
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedTone, setSelectedTone] = useState('professional');
  
  const title = activeAction === 'rewrite' ? 'Rewrite with AI' : 'Proofread with AI';
  
  // Available tone options
  const toneOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'excited', label: 'Excited' },
    { value: 'casual', label: 'Casual' },
    { value: 'formal', label: 'Formal' },
    { value: 'friendly', label: 'Friendly' }
  ];
  
  // Handle generate button click
  const handleGenerate = () => {
    onGenerateRequest(customInstructions, selectedTone);
  };
  
  return (
    <div className="ai-sidebar">
      <div className="ai-sidebar-header">
        <h3>{title}</h3>
        <button className="close-button" onClick={onCancel}>×</button>
      </div>
      
      <div className="ai-content">
        <h4>Original Text</h4>
        <div className="ai-text-container original">
          {selectedText && selectedText.trim() ? selectedText : 'No text selected'}
        </div>
        
        {!processedText && !isLoading && (
          <div className="ai-customization">
            <h4>Customize</h4>
            
            <div className="tone-selector">
              <label>Tone:</label>
              <div className="tone-options">
                {toneOptions.map(tone => (
                  <button 
                    key={tone.value}
                    className={`tone-button ${selectedTone === tone.value ? 'selected' : ''}`}
                    onClick={() => setSelectedTone(tone.value)}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="custom-instructions">
              <label>Custom Instructions (Optional):</label>
              <textarea 
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Add any specific instructions for the AI..."
              />
            </div>
            
            <button 
              className="generate-button" 
              onClick={handleGenerate}
              disabled={!selectedText || selectedText.trim() === ''}
            >
              Generate
            </button>
          </div>
        )}
        
        {(processedText || isLoading) && (
          <>
            <h4>AI Result</h4>
            <div className="ai-text-container processed">
              {isLoading ? (
                <div className="loading-indicator">
                  <div className="spinner"></div>
                  <p>Processing with AI...</p>
                </div>
              ) : processedText ? processedText : 'AI processed text will appear here'}
            </div>
          </>
        )}
      </div>
      
      <div className="ai-sidebar-footer">
        <button className="cancel-button" onClick={onCancel}>Discard</button>
        {!isLoading && processedText && (
          <>
            <button className="regenerate-button" onClick={onRegenerate}>Regenerate</button>
            <button className="apply-button" onClick={onApply}>Approve</button>
          </>
        )}
      </div>
    </div>
  );
};

export default AISidebar;
