import { useEffect, useState } from "react";
import type { BoardPhoto } from "./PhotoFrame";
import "./BookOverlay.css";

const CHARS_PER_SECOND = 28;

function BookOverlay({
  photo,
  onClose,
}: {
  photo: BoardPhoto;
  onClose: () => void;
}) {
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    setCharCount(0);
    const interval = window.setInterval(() => {
      setCharCount((c) => Math.min(c + 1, photo.storyBody.length));
    }, 1000 / CHARS_PER_SECOND);
    return () => window.clearInterval(interval);
  }, [photo.storyBody]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const written = photo.storyBody.slice(0, charCount);
  const done = charCount >= photo.storyBody.length;
  const isNeon = photo.bookTheme === "neon";

  return (
    <div className={`book-backdrop book-theme-${photo.bookTheme}`}>
      <div className={`book-page book-theme-${photo.bookTheme}`}>
        <button type="button" className="book-close" onClick={onClose}>
          {isNeon ? "FERMER ✕" : "Fermer ✕"}
        </button>
        <div className="book-header">{photo.storyHeader}</div>
        <h2 className="book-title">{photo.storyTitle}</h2>
        <p className="book-body">
          {written}
          {!done && (
            <span className="book-cursor">{isNeon ? "_" : "|"}</span>
          )}
        </p>
        <div className="book-music">
          ▶ {photo.musicTrack} · {photo.musicDuration}
        </div>
      </div>
    </div>
  );
}

export default BookOverlay;
