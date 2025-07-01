/**
 * Normalizes an HTML string by parsing it and re-serializing it.
 * This removes browser-specific artifacts and inconsistencies, such as
 * whitespace changes, self-closing tag syntax, or added <br> tags.
 * @param {string} htmlString The HTML string to normalize.
 * @returns {string} The normalized HTML string.
 */
export const normalizeHTML = (htmlString) => {
  if (typeof htmlString !== 'string' || !htmlString) return '';
  
  // Use the browser's parser to create a canonical version of the HTML.
  const div = document.createElement('div');
  div.innerHTML = htmlString;
  
  return div.innerHTML;
};
