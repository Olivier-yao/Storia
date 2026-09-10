import { useState, type CSSProperties } from "react";
import type { AmbientTextData } from "../data/boardData";
import "./AmbientText.css";

// Texte décoratif du fond : jamais figé — posé dans le même espace que les
// photos/notes, il suit donc la caméra (pan/zoom) exactement comme elles.
// La phrase s'assemble mot à mot puis se disperse, en boucle, pour une
// présence discrète mais vivante ("immersion totale").
function AmbientText({
  data,
  editingInitially = false,
  onTextSave,
  onPressStart,
}: {
  data: AmbientTextData;
  editingInitially?: boolean;
  onTextSave: (id: string, text: string) => void;
  onPressStart: (id: string, clientX: number, clientY: number) => void;
}) {
  const [editing, setEditing] = useState(editingInitially);
  const [draft, setDraft] = useState(data.text);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    onTextSave(data.id, trimmed || data.text);
  }

  const words = data.text.split(" ").filter(Boolean);

  return (
    <div
      className="ambient-text-anchor"
      style={{ transform: `translate(${data.x}px, ${data.y}px)` }}
    >
      {editing ? (
        <input
          autoFocus
          className="ambient-text-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(data.text);
              setEditing(false);
            }
          }}
        />
      ) : (
        <p
          className="ambient-text-line"
          onMouseDown={(e) => {
            e.stopPropagation();
            onPressStart(data.id, e.clientX, e.clientY);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          {words.map((word, i) => (
            <span
              key={i}
              className="ambient-text-word"
              style={{ "--wi": i } as CSSProperties}
            >
              {word}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

export default AmbientText;
