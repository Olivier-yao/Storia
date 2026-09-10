import type { CSSProperties } from "react";
import { useState } from "react";
import type { PhotoDepth } from "./PhotoFrame";
import "./FloatingNote.css";

export interface FloatingNoteData {
  id: string;
  x: number;
  y: number;
  rotation: number; // fixe, entre -3° et +3° (1g Notes manuscrites)
  dateLabel: string;
  text: string;
  font: string;
  depth: PhotoDepth;
  // Choix libre de l'utilisateur : la note dérive doucement, ou reste
  // immobile à l'endroit posé.
  roaming: boolean;
}

interface FloatingNoteProps {
  note: FloatingNoteData;
  editingInitially?: boolean;
  onTextSave: (id: string, text: string) => void;
  onToggleRoaming: (id: string) => void;
  onPressStart: (id: string, clientX: number, clientY: number) => void;
}

function FloatingNote({
  note,
  editingInitially = false,
  onTextSave,
  onToggleRoaming,
  onPressStart,
}: FloatingNoteProps) {
  const [editing, setEditing] = useState(editingInitially);
  const [draft, setDraft] = useState(note.text);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed) onTextSave(note.id, trimmed);
    else setDraft(note.text);
  }

  const anchorStyle = { left: note.x, top: note.y } as CSSProperties;
  const roamStyle = {
    "--roam-duration": "9s",
  } as CSSProperties;
  const cardStyle = { "--note-rotation": `${note.rotation}deg` } as CSSProperties;

  const card = (
    <div
      className="floating-note"
      style={cardStyle}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (!editing) onPressStart(note.id, e.clientX, e.clientY);
      }}
    >
      <div className="floating-note-top">
        <span className="floating-note-date">{note.dateLabel}</span>
        <button
          type="button"
          className="floating-note-toggle"
          onClick={() => onToggleRoaming(note.id)}
          title="Basculer libre / statique"
        >
          {note.roaming ? "◌ libre" : "◆ statique"}
        </button>
      </div>
      {editing ? (
        <textarea
          className="floating-note-input"
          style={{ fontFamily: note.font }}
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              setDraft(note.text);
              setEditing(false);
            }
          }}
        />
      ) : (
        <p
          className="floating-note-text"
          style={{ fontFamily: note.font }}
          onDoubleClick={() => setEditing(true)}
          title="Double-clic pour modifier"
        >
          « {note.text} »
        </p>
      )}
    </div>
  );

  return (
    <div className="floating-note-anchor" style={anchorStyle}>
      <div className={`photo-depth depth-${note.depth}`}>
        {note.roaming ? (
          <div className="note-roam" style={roamStyle}>
            {card}
          </div>
        ) : (
          card
        )}
      </div>
    </div>
  );
}

export default FloatingNote;
