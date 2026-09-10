import type { BoardPhoto } from "./PhotoFrame";
import "./NoteSlideOut.css";

function NoteSlideOut({
  photo,
  visible,
}: {
  photo: BoardPhoto;
  visible: boolean;
}) {
  return (
    <div
      className={`note-slide-out${visible ? " is-visible" : ""}`}
      style={{ left: photo.x + 280, top: photo.y + 30 }}
    >
      <p style={{ fontFamily: photo.noteFont, fontSize: photo.noteSize }}>
        {photo.noteText}
      </p>
      <span className="note-slide-out-meta">{photo.metaTag}</span>
    </div>
  );
}

export default NoteSlideOut;
