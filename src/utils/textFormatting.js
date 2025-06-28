/**
 * Text formatting utility functions
 */

/**
 * Apply font size to the selected text
 * @param {HTMLElement} editor - The editor element
 * @param {string} size - The font size to apply (in pixels)
 */
export const applyFontSize = (editor, size) => {
  if (!editor) return;
  
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  
  // Check if selection is within the editor
  if (!editor.contains(range.commonAncestorContainer)) return;
  
  // Get the selected text
  const selectedText = range.toString();
  if (!selectedText) return;
  
  // Create a span with the specified font size
  const span = document.createElement('span');
  span.style.fontSize = `${size}px`;
  
  // If the range spans multiple nodes, we need to handle it differently
  if (range.startContainer !== range.endContainer) {
    // This is a complex selection, use the browser's execCommand as fallback
    document.execCommand('fontSize', false, 7); // Use largest size as placeholder
    
    // Find all font elements created by execCommand and replace with our custom style
    const fonts = editor.querySelectorAll('font[size="7"]');
    fonts.forEach(font => {
      const newSpan = document.createElement('span');
      newSpan.style.fontSize = `${size}px`;
      newSpan.innerHTML = font.innerHTML;
      font.parentNode.replaceChild(newSpan, font);
    });
    
    return;
  }
  
  // Extract the selected text and wrap it in our span
  range.deleteContents();
  span.textContent = selectedText;
  range.insertNode(span);
  
  // Update the selection to include the new span
  selection.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  selection.addRange(newRange);
  
  // Trigger input event to update content state
  editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
};

/**
 * Apply color to the selected text
 * @param {HTMLElement} editor - The editor element
 * @param {string} color - The color to apply (hex code)
 */
export const applyTextColor = (editor, color) => {
  if (!editor) return;
  
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  
  // Check if selection is within the editor
  if (!editor.contains(range.commonAncestorContainer)) return;
  
  // Get the selected text
  const selectedText = range.toString();
  if (!selectedText) return;
  
  // Create a span with the specified color
  const span = document.createElement('span');
  span.style.color = color;
  
  // If the range spans multiple nodes, we need to handle it differently
  if (range.startContainer !== range.endContainer) {
    // This is a complex selection, use the browser's execCommand as fallback
    document.execCommand('foreColor', false, color);
    return;
  }
  
  // Extract the selected text and wrap it in our span
  range.deleteContents();
  span.textContent = selectedText;
  range.insertNode(span);
  
  // Update the selection to include the new span
  selection.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  selection.addRange(newRange);
  
  // Trigger input event to update content state
  editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
};
