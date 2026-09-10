import type { CSSProperties } from "react";
import { useState } from "react";
import "./PhotoFrame.css";

export type PhotoDepth = "near" | "mid" | "far";
export type FrameType = "polaroid" | "pellicule" | "bois" | "coeur";

export interface BoardPhoto {
  id: string;
  x: number;
  y: number;
  rotation: number;
  caption: string;
  tint: string;
  depth: PhotoDepth;
  frameType: FrameType;
  // Timing de la physique de flottement propre au cadre (1a Tokens).
  physicsDuration: number;
  physicsDelay: number;
  frameNumber?: string; // pellicule uniquement
  // Niveau 1 (survol) — panneau de note.
  noteText: string;
  noteFont: string;
  noteSize: number;
  metaTag: string;
  // Niveau 2 (clic prolongé) — livre ouvert.
  bookTheme: "vintage" | "neon";
  storyHeader: string;
  storyTitle: string;
  storyBody: string;
  musicTrack: string;
  musicDuration: string;
}

function PolaroidVisual({
  tint,
  caption,
  onCaptionSave,
}: {
  tint: string;
  caption: string;
  onCaptionSave?: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(caption);
  // Sans `onCaptionSave` réel (aperçu d'histoire en lecture, "revivre"),
  // le double-clic ne doit ni s'afficher ni faire semblant de marcher.
  const editable = Boolean(onCaptionSave);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== caption) onCaptionSave?.(trimmed);
    else setDraft(caption);
  }

  return (
    <div className="frame-polaroid">
      <div className="frame-polaroid-clip" />
      <div className="frame-polaroid-photo" style={{ background: tint }} />
      {editing ? (
        <input
          className="frame-polaroid-caption-input"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(caption);
              setEditing(false);
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          className="frame-polaroid-caption"
          onDoubleClick={
            editable
              ? (e) => {
                  e.stopPropagation();
                  setEditing(true);
                }
              : undefined
          }
          title={editable ? "Double-clic pour modifier" : undefined}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

function PelliculeVisual({
  tint,
  frameNumber,
}: {
  tint: string;
  frameNumber?: string;
}) {
  const holes = Array.from({ length: 6 });
  return (
    <div className="frame-pellicule">
      <div className="frame-pellicule-holes">
        {holes.map((_, i) => (
          <span key={i} />
        ))}
      </div>
      <div className="frame-pellicule-photo" style={{ background: tint }} />
      <div className="frame-pellicule-label">
        <span>STORIA 400</span>
        <span>{frameNumber ?? "01A"}</span>
      </div>
      <div className="frame-pellicule-holes">
        {holes.map((_, i) => (
          <span key={i} />
        ))}
      </div>
    </div>
  );
}

function BoisVisual({ tint }: { tint: string }) {
  return (
    <div className="frame-bois">
      <div className="frame-bois-mat">
        <div className="frame-bois-photo" style={{ background: tint }} />
      </div>
    </div>
  );
}

function CoeurVisual({ tint }: { tint: string }) {
  return <div className="frame-coeur" style={{ background: tint }} />;
}

export function FrameVisual({
  photo,
  onCaptionSave,
}: {
  photo: BoardPhoto;
  onCaptionSave?: (text: string) => void;
}) {
  switch (photo.frameType) {
    case "pellicule":
      return (
        <PelliculeVisual tint={photo.tint} frameNumber={photo.frameNumber} />
      );
    case "bois":
      return <BoisVisual tint={photo.tint} />;
    case "coeur":
      return <CoeurVisual tint={photo.tint} />;
    default:
      return (
        <PolaroidVisual
          tint={photo.tint}
          caption={photo.caption}
          onCaptionSave={onCaptionSave}
        />
      );
  }
}

interface PhotoFrameProps {
  photo: BoardPhoto;
  isHovered: boolean;
  pushOffset: { x: number; y: number };
  onHoverChange: (id: string | null) => void;
  onPressStart: (id: string, clientX: number, clientY: number) => void;
  onCaptionSave: (id: string, text: string) => void;
}

function PhotoFrame({
  photo,
  isHovered,
  pushOffset,
  onHoverChange,
  onPressStart,
  onCaptionSave,
}: PhotoFrameProps) {
  function handleMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
    onPressStart(photo.id, e.clientX, e.clientY);
  }

  const anchorStyle = { left: photo.x, top: photo.y } as CSSProperties;

  const pushStyle = {
    transform: `translate(${pushOffset.x}px, ${pushOffset.y}px)`,
    filter: pushOffset.x !== 0 || pushOffset.y !== 0 ? "blur(2.4px)" : "none",
  } as CSSProperties;

  const hover = (
    <div
      className={`frame-hover${isHovered ? " is-hovered" : ""}`}
      onMouseEnter={() => onHoverChange(photo.id)}
      onMouseLeave={() => onHoverChange(null)}
      onMouseDown={handleMouseDown}
    >
      <FrameVisual
        photo={photo}
        onCaptionSave={(text) => onCaptionSave(photo.id, text)}
      />
    </div>
  );

  let physics: React.ReactNode;
  if (photo.frameType === "polaroid") {
    // Balancement — pivot à la pince, 1.8° · 5.5s (1a Tokens).
    const swingStyle = {
      "--swing-duration": `${photo.physicsDuration}s`,
      "--swing-delay": `${photo.physicsDelay}s`,
      "--base-rotation": `${photo.rotation}deg`,
    } as CSSProperties;
    physics = (
      <div
        className="phys-drift"
        style={
          {
            "--drift-duration": `${photo.physicsDuration * 2}s`,
            "--drift-delay": `${photo.physicsDelay}s`,
          } as CSSProperties
        }
      >
        <div className="phys-swing" style={swingStyle}>
          {hover}
        </div>
      </div>
    );
  } else if (photo.frameType === "pellicule") {
    // Vibration — micro-tremblement 1px · 1.2s.
    const vibrateStyle = {
      "--vibrate-duration": `${photo.physicsDuration}s`,
      "--vibrate-delay": `${photo.physicsDelay}s`,
      transform: `rotate(${photo.rotation}deg)`,
    } as CSSProperties;
    physics = (
      <div className="phys-vibrate" style={vibrateStyle}>
        {hover}
      </div>
    );
  } else if (photo.frameType === "bois") {
    // Oscillation stable — dérive lente 16px · 9s (pas de rotation).
    const oscillateStyle = {
      "--oscillate-duration": `${photo.physicsDuration}s`,
      "--oscillate-delay": `${photo.physicsDelay}s`,
      transform: `rotate(${photo.rotation}deg)`,
    } as CSSProperties;
    physics = (
      <div className="phys-oscillate" style={oscillateStyle}>
        {hover}
      </div>
    );
  } else {
    // Respiration — échelle 1.008 · 4s.
    const breatheStyle = {
      "--breathe-duration": `${photo.physicsDuration}s`,
      "--breathe-delay": `${photo.physicsDelay}s`,
      transform: `rotate(${photo.rotation}deg)`,
    } as CSSProperties;
    physics = (
      <div className="phys-breathe" style={breatheStyle}>
        {hover}
      </div>
    );
  }

  return (
    <div className="photo-anchor" style={anchorStyle}>
      <div className="photo-push" style={pushStyle}>
        <div className={`photo-depth depth-${photo.depth}`}>{physics}</div>
      </div>
    </div>
  );
}

export default PhotoFrame;
