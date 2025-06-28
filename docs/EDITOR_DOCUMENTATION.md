# React Rich Text Editor Documentation

This document provides a comprehensive explanation of how the React-based rich text editor works, with special focus on the heading formatting functionality.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Component Structure](#component-structure)
3. [Text Formatting Implementation](#text-formatting-implementation)
4. [Heading Formatting Implementation](#heading-formatting-implementation)
5. [Editor Focus Management](#editor-focus-management)
6. [Pagination System](#pagination-system)
7. [Chapter Management](#chapter-management)
8. [Troubleshooting](#troubleshooting)

## Architecture Overview

The editor is built using React and utilizes the browser's native `contentEditable` functionality combined with the `document.execCommand()` API for text formatting. The application follows a component-based architecture with state management handled through React hooks.

Key technical aspects:
- Uses React's `useState` and `useRef` hooks for state management
- Leverages browser's native `document.execCommand()` for formatting
- Implements custom pagination logic for multi-page documents
- Uses CSS for visual styling of formatted content
- Manages editor focus for command execution

## Component Structure

The application consists of the following key components:

1. **App.jsx**: The main component that orchestrates the entire application
   - Manages chapters and pages state
   - Handles editor command execution
   - Controls pagination logic

2. **Toolbar.jsx**: Contains formatting buttons and executes formatting commands
   - Passes commands to the App component
   - Provides UI for all formatting options

3. **Editor.jsx**: The contentEditable component where text is entered and formatted
   - Handles focus events
   - Manages content changes
   - Applies CSS styling to formatted content

4. **Page.jsx**: Wraps the Editor component with page-specific controls
   - Handles page duplication, deletion, and locking
   - Passes editor focus events up to App component

5. **Chapterssidebar.jsx**: Manages chapter navigation and creation
   - Displays chapter list
   - Handles chapter selection, creation, and renaming

## Text Formatting Implementation

Text formatting (bold, italic, underline) is implemented using the browser's native `document.execCommand()` API:

1. When a formatting button is clicked in the Toolbar component, it calls the `formatDoc` function
2. The `formatDoc` function calls the `executeEditorCommand` function in App.jsx
3. The `executeEditorCommand` function:
   - Gets the last focused editor reference
   - Focuses that editor
   - Executes the command using `document.execCommand(command, false, value)`
   - Dispatches an input event to update React state

```javascript
// In App.jsx
const executeEditorCommand = useCallback((command, value = null) => {
  const editor = lastFocusedEditorRef.current;
  if (!editor) {
    console.error("Editor not focused.");
    return;
  }
  editor.focus();

  try {
    document.execCommand(command, false, value);
    editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  } catch (e) {
    console.error(`Failed to execute command ${command}:`, e);
  }
}, []);
```

## Heading Formatting Implementation

Heading formatting (H1, H2, H3, P) uses the same mechanism as text formatting but with the `formatBlock` command:

1. When a heading button is clicked in the Toolbar component, it calls `formatDoc` with the command `formatBlock` and the appropriate tag value
2. The tag value is passed as a lowercase HTML tag name (e.g., `h1`, `h2`, `h3`, `p`)
3. The `executeEditorCommand` function executes `document.execCommand('formatBlock', false, value)`
4. The browser wraps the current block in the specified heading tag
5. CSS styles in Editor.css define the visual appearance of each heading level

```javascript
// In Toolbar.jsx - Button click handlers
<button onClick={() => formatDoc('formatBlock', 'h1')}>H1</button>
<button onClick={() => formatDoc('formatBlock', 'h2')}>H2</button>
<button onClick={() => formatDoc('formatBlock', 'h3')}>H3</button>
<button onClick={() => formatDoc('formatBlock', 'p')}>P</button>
```

```css
/* In Editor.css - Heading styles */
.editor h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #ffffff;
}

.editor h2 {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #f0f0f0;
}

.editor h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #e0e0e0;
}

.editor p {
  font-size: 1rem;
  margin-bottom: 0.5rem;
}
```

## Editor Focus Management

Proper focus management is critical for the editor to work correctly:

1. The App component maintains a `lastFocusedEditorRef` that tracks which editor is currently focused
2. When an editor receives focus, it calls the `handleFocus` function in App.jsx
3. The `handleFocus` function updates `lastFocusedEditorRef` with the current editor element
4. Before executing any command, the `executeEditorCommand` function focuses the last focused editor
5. This ensures commands are applied to the correct editor even when focus has moved elsewhere

```javascript
// In App.jsx
const handleFocus = useCallback((editor) => {
  console.log("Setting last focused editor");
  lastFocusedEditorRef.current = editor;
  // Ensure the editor gets focus
  if (editor) {
    editor.focus();
  }
}, []);

// In Editor.jsx
const handleFocus = (e) => {
  console.log("Editor focused", pageIndex);
  if (onEditorFocus) {
    onEditorFocus(editorRef.current);
  }
};
```

## Pagination System

The editor automatically creates new pages when content exceeds the current page:

1. The `flowDown` function monitors editor content height
2. If content exceeds the editor height, it moves content to the next page
3. If no next page exists, it creates one
4. The `consolidateUp` function moves content back up if space becomes available
5. This ensures content flows naturally across pages as you type

## Chapter Management

Chapters are managed through the Chapterssidebar component:

1. Each chapter contains an array of pages with their content
2. The `chaptersContent` state in App.jsx stores all chapters and their pages
3. The Chapterssidebar component displays chapters and handles navigation
4. When switching chapters, the current pages are updated to reflect the selected chapter

## Troubleshooting

If heading formatting stops working, check the following:

1. **Editor Focus Issues**:
   - Ensure the editor is focused before applying formatting
   - Check that `lastFocusedEditorRef` is being updated correctly
   - Verify the `handleFocus` function is being called when clicking in the editor

2. **Command Execution Problems**:
   - Confirm `document.execCommand` is being called with the correct parameters
   - For headings, ensure the command is 'formatBlock' and the value is a lowercase tag name
   - Check browser console for any errors during command execution

3. **CSS Styling Issues**:
   - Verify that Editor.css is being imported in Editor.jsx
   - Check that heading styles are defined and not being overridden
   - Ensure the CSS selectors correctly target elements within the editor

4. **Component Props Mismatch**:
   - Ensure Page component receives the correct props from App.jsx
   - Verify that onEditorFocus (not onFocus) is being passed to handle focus events
   - Check that pageIndex is correctly passed to identify the editor

5. **React State Updates**:
   - Verify that an input event is dispatched after command execution
   - Check that content changes are properly reflected in the React state
   - Ensure state updates don't cause unnecessary re-renders

If you need to debug the editor:

1. Add console logs to track the flow of commands and focus events
2. Inspect the DOM to verify that heading tags are being applied
3. Check the React component hierarchy to ensure props are passed correctly
4. Verify that the editor content is being properly stored in the state

## Key Code References

### App.jsx - executeEditorCommand Function
```javascript
const executeEditorCommand = useCallback((command, value = null) => {
  const editor = lastFocusedEditorRef.current;
  if (!editor) {
    console.error("Editor not focused.");
    return;
  }
  editor.focus();

  try {
    document.execCommand(command, false, value);
    editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  } catch (e) {
    console.error(`Failed to execute command ${command}:`, e);
  }
}, []);
```

### Toolbar.jsx - formatDoc Function
```javascript
const formatDoc = (command, value = null) => {
  console.log(`Formatting command: ${command} with value: ${value}`);
  executeEditorCommand(command, value);
};
```

### Editor.jsx - handleFocus Function
```javascript
const handleFocus = (e) => {
  console.log("Editor focused", pageIndex);
  if (onEditorFocus) {
    onEditorFocus(editorRef.current);
  }
};
```

By understanding these key components and their interactions, you should be able to maintain and troubleshoot the editor effectively.
