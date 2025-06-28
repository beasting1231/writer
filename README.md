# Multi-Page Rich Text Editor

A modern, feature-rich text editor built with React that supports automatic pagination, multiple chapters, and comprehensive text formatting.

## Features

### ✨ Rich Text Formatting
- **Bold, Italic, Underline** - Apply basic text formatting
- **Headings** - H1, H2, H3 for document structure
- **Text Alignment** - Left, Center, Right alignment
- **Lists** - Ordered and unordered lists
- **Links** - Add hyperlinks to your content

### 📄 Automatic Pagination
- Content automatically flows to new pages as you type
- Pages are created dynamically when content exceeds page size
- Automatic content consolidation when text is deleted

### 📚 Chapter Management
- Create and manage multiple chapters
- Switch between chapters seamlessly
- Each chapter maintains its own content and pagination

### 🎨 Modern UI
- Dark theme optimized for writing
- Sticky toolbar for easy access to formatting tools
- Responsive design that works on different screen sizes
- Clean, distraction-free writing environment

## Technology Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and development server
- **CSS3** - Custom styling with modern CSS features
- **ContentEditable API** - Native rich text editing capabilities

## Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd my-react-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## Usage

### Basic Text Editing
- Click anywhere in the editor to start typing
- Use the toolbar buttons to format your text
- Content automatically flows to new pages as needed

### Formatting Text
- **Select text** and click formatting buttons to apply styles
- **Click formatting buttons without selection** to start typing with that style
- **Headings** format the current line/block
- **Alignment** affects the current paragraph or block

### Managing Chapters
- Use the sidebar to create new chapters
- Click on chapter names to switch between them
- Each chapter maintains its own content independently

### Keyboard Shortcuts
- Standard text editing shortcuts work as expected
- Copy, paste, undo, redo all supported
- Tab and Enter for navigation and line breaks

## Project Structure

```
src/
├── components/
│   ├── Chapterssidebar.jsx    # Chapter management sidebar
│   ├── Editor.jsx             # Main text editor component
│   ├── Page.jsx               # Individual page component
│   └── Toolbar.jsx            # Formatting toolbar
├── App.jsx                    # Main application component
├── App.css                    # Main application styles
└── main.jsx                   # Application entry point
```

## Key Features Explained

### Automatic Pagination
The editor automatically creates new pages when content exceeds the page size. This is handled by:
- Monitoring content height vs container height
- Moving overflow content to the next page
- Consolidating pages when content is deleted

### Rich Text Formatting
Uses a combination of `document.execCommand` and manual DOM manipulation:
- `document.execCommand` for basic formatting (bold, italic, underline, alignment)
- Manual span creation for fallback scenarios
- Proper event handling to maintain React state

### Chapter Management
Each chapter is stored as a separate object in state:
- Independent content for each chapter
- Automatic page creation per chapter
- Seamless switching between chapters

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with React and modern web technologies
- Inspired by traditional word processors and modern writing tools
- Designed for a distraction-free writing experience
