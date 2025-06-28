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
  
  // Use execCommand for simplicity and reliability
  document.execCommand('fontSize', false, 7); // Use largest size as placeholder
  
  // Find all font elements created by execCommand and replace with our custom style
  const fonts = editor.querySelectorAll('font[size="7"]');
  fonts.forEach(font => {
    const newSpan = document.createElement('span');
    newSpan.style.fontSize = `${size}px`;
    newSpan.innerHTML = font.innerHTML;
    font.parentNode.replaceChild(newSpan, font);
  });
  
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
  
  // Use execCommand for simplicity and reliability
  document.execCommand('foreColor', false, color);
  
  // Trigger input event to update content state
  editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
};

/**
 * Apply highlight to the selected text
 * @param {HTMLElement} editor - The editor element
 * @param {string} color - The highlight color to apply (hex code)
 */
export const applyHighlight = (editor, color) => {
  if (!editor) return;
  
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  // If we're removing the highlight (white color)
  if (color === '#ffffff') {
    // Use execCommand to remove background color
    document.execCommand('backColor', false, 'transparent');
  } else {
    // Use execCommand for highlighting - this works across multiple lines
    document.execCommand('backColor', false, color);
    
    // If we need to adjust text color for readability
    if (color !== '#ffff00') { // For colors other than yellow
      document.execCommand('foreColor', false, '#ffffff'); // White text
    } else {
      document.execCommand('foreColor', false, '#000000'); // Black text for yellow
    }
  }
  
  // Trigger input event to update content state
  editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
};
