import React, { useState } from 'react';
import './AISidebar.css';
import './proofreading.css';

// Component to display individual proofreading issues
const ProofreadingIssue = ({ issue, onFix }) => {
  return (
    <div className="proofreading-issue">
      <div className="issue-content">
        <div className="issue-type">{issue.type}</div>
        <div className="issue-text">
          <span className="issue-original">{issue.original}</span>
          {issue.suggestion && (
            <span className="issue-suggestion"> → {issue.suggestion}</span>
          )}
        </div>
        {issue.description && (
          <div className="issue-description">{issue.description}</div>
        )}
      </div>
      <div className="issue-actions">
        {issue.suggestion && (
          <button className="fix-button" onClick={() => onFix(issue)}>
            Fix
          </button>
        )}
      </div>
    </div>
  );
};

const AISidebar = ({ 
  isVisible, 
  activeAction, 
  selectedText, 
  processedText, 
  isLoading, 
  onApply, 
  onCancel, 
  onRegenerate,
  onGenerateRequest,
  proofreadingIssues = [],
  onFixIssue
}) => {
  if (!isVisible) return null;
  
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedTone, setSelectedTone] = useState('professional');
  
  const title = activeAction === 'rewrite' ? 'Rewrite with AI' : 
         activeAction === 'proofread' ? 'Proofread with AI' : 
         activeAction === 'proofreadChapter' ? 'Proofreading Results' : '';
  
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
        {activeAction === 'proofreadChapter' ? (
          // Proofreading results view
          <div className="proofreading-results">
            {isLoading ? (
              <div className="loading-indicator">
                <div className="spinner"></div>
                <p>Checking for spelling and grammar issues...</p>
              </div>
            ) : proofreadingIssues.length > 0 ? (
              <>
                <div className="issues-count">
                  Found {proofreadingIssues.length} issue{proofreadingIssues.length !== 1 ? 's' : ''}
                </div>
                <div className="issues-list">
                  {proofreadingIssues.map((issue, index) => (
                    <ProofreadingIssue 
                      key={index} 
                      issue={issue} 
                      onFix={onFixIssue} 
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="no-issues">
                <p>No spelling or grammar issues found.</p>
              </div>
            )}
          </div>
        ) : (
          // Regular AI sidebar view for rewrite/proofread
          <>
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
          </>
        )}
      </div>
      
      <div className="ai-sidebar-footer">
        <button className="cancel-button" onClick={onCancel}>Close</button>
        {!isLoading && processedText && activeAction !== 'proofreadChapter' && (
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
