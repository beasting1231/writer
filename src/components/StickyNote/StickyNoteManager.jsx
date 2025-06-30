import React, { useState } from 'react';
import StickyNote from './StickyNote';

const StickyNoteManager = ({ notes, onAddNote, onRemoveNote }) => {
  return (
    <div className="sticky-note-manager">
      {notes.map((note) => (
        <StickyNote
          key={note.id}
          id={note.id}
          initialPosition={note.position}
          onClose={onRemoveNote}
        />
      ))}
    </div>
  );
};

export default StickyNoteManager;
