import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import PhotoFrame, { type PhotoDepth, type BoardPhoto } from "./PhotoFrame";
import NoteSlideOut from "./NoteSlideOut";
import BookOverlay from "./BookOverlay";
import FloatingNote, { type FloatingNoteData } from "./FloatingNote";
import AmbientText from "./AmbientText";
import type { Ambiance } from "./CategoryCard";
import StoryEditor from "./StoryEditor";
import StoryPlayback from "./StoryPlayback";
import { emptyStory, type Story } from "../data/storyTypes";
import type { AmbientTextData } from "../data/boardData";
import "./FloatingBoard.css";

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2;
const NEIGHBOR_PUSH_PX = 12;
const LONG_PRESS_MS = 500;
const DRAG_THRESHOLD_PX = 6;

// Thème de livre par défaut par ambiance (règle 1f), pour les photos
// ajoutées manuellement — une histoire pourra toujours en choisir un
// autre librement une fois l'édition de note construite.
const DEFAULT_BOOK_THEME: Record<Ambiance, "vintage" | "neon"> = {
  famille: "vintage",
  amoureux: "vintage",
  amis: "neon",
  rencontres: "vintage",
  neutre: "vintage",
  corail: "vintage",
  lavande: "vintage",
  petrole: "neon",
  sauge: "vintage",
  bordeaux: "vintage",
};

// Les photos sont posées sur le même plan que le tableau : la caméra pan/zoom
// se déplace, mais chaque photo garde sa position exacte, sans parallaxe
// relative entre elles (comme une caméra filmant à la verticale un tableau
// fixe). Seuls les éléments décoratifs d'arrière-plan (mots d'ambiance)
// dérivent différemment ; le trio near/mid/far ne change plus que l'échelle
// et le flou (1a Tokens), pas la vitesse de déplacement.
const PARALLAX_FACTOR: Record<PhotoDepth, number> = {
  near: 1,
  mid: 1,
  far: 1,
};
const DEPTH_ORDER: PhotoDepth[] = ["far", "mid", "near"];

interface FloatingBoardProps {
  categoryName: string;
  ambiance: Ambiance;
  photos: BoardPhoto[];
  notes?: FloatingNoteData[];
  story?: Story | null;
  ambientTexts: AmbientTextData[];
  onBack: () => void;
  // Ouvre directement sur l'éditeur d'histoire (bouton "Reprendre" de l'accueil).
  startInEditor?: boolean;
  // Remontent l'état vécu ici vers le parent, qui le garde en mémoire
  // (survit à un retour à l'accueil) et le sauvegarde sur disque.
  onPhotosChange?: (photos: BoardPhoto[]) => void;
  onNotesChange?: (notes: FloatingNoteData[]) => void;
  onStoryChange?: (story: Story | null) => void;
  onAmbientTextsChange?: (texts: AmbientTextData[]) => void;
}

function FloatingBoard({
  categoryName,
  ambiance,
  photos: initialPhotos,
  notes = [],
  story: initialStory = null,
  ambientTexts,
  onBack,
  startInEditor = false,
  onPhotosChange,
  onNotesChange,
  onStoryChange,
  onAmbientTextsChange,
}: FloatingBoardProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasClipRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<BoardPhoto[]>(initialPhotos);
  const [localNotes, setLocalNotes] = useState<FloatingNoteData[]>(notes);
  const [localAmbientTexts, setLocalAmbientTexts] =
    useState<AmbientTextData[]>(ambientTexts);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingAmbientId, setEditingAmbientId] = useState<string | null>(
    null,
  );
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [story, setStory] = useState<Story | null>(initialStory);
  const [storyEditorOpen, setStoryEditorOpen] = useState(startInEditor);
  const [playing, setPlaying] = useState(false);
  const dragState = useRef<{ x: number; y: number } | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Remonte chaque changement vers le parent (App), qui le garde vivant
  // tant que l'app tourne et le persiste sur disque.
  useEffect(() => {
    onPhotosChange?.(photos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);
  useEffect(() => {
    onNotesChange?.(localNotes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localNotes]);
  useEffect(() => {
    onStoryChange?.(story);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story]);
  useEffect(() => {
    onAmbientTextsChange?.(localAmbientTexts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localAmbientTexts]);

  const photoPress = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    dragging: boolean;
    timer: number | null;
  } | null>(null);

  useEffect(() => {
    const node = canvasClipRef.current;
    if (!node) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + z * delta)));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  // Glisser une photo pour la repositionner, ou la laisser en appui pour
  // ouvrir son livre (niveau 2) — distingués par un seuil de mouvement.
  useEffect(() => {
    function onMove(e: globalThis.MouseEvent) {
      const press = photoPress.current;
      if (!press) return;
      const dx = e.clientX - press.startClientX;
      const dy = e.clientY - press.startClientY;
      if (!press.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        press.dragging = true;
        if (press.timer !== null) {
          window.clearTimeout(press.timer);
          press.timer = null;
        }
      }
      if (press.dragging) {
        const z = zoomRef.current;
        const newX = press.startX + dx / z;
        const newY = press.startY + dy / z;
        setPhotos((prev) =>
          prev.map((p) => (p.id === press.id ? { ...p, x: newX, y: newY } : p)),
        );
      }
    }
    function onUp() {
      const press = photoPress.current;
      if (press?.timer !== null && press) {
        window.clearTimeout(press.timer);
      }
      photoPress.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Glisser une note libre pour la repositionner — même mécanique que les
  // photos, mais sans appui long puisque les notes n'ouvrent jamais de livre.
  const notePress = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    function onMove(e: globalThis.MouseEvent) {
      const press = notePress.current;
      if (!press) return;
      const z = zoomRef.current;
      const newX = press.startX + (e.clientX - press.startClientX) / z;
      const newY = press.startY + (e.clientY - press.startClientY) / z;
      setLocalNotes((prev) =>
        prev.map((n) => (n.id === press.id ? { ...n, x: newX, y: newY } : n)),
      );
    }
    function onUp() {
      notePress.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Glisser un texte flottant pour le repositionner — même mécanique que
  // les notes libres.
  const ambientPress = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    function onMove(e: globalThis.MouseEvent) {
      const press = ambientPress.current;
      if (!press) return;
      const z = zoomRef.current;
      const newX = press.startX + (e.clientX - press.startClientX) / z;
      const newY = press.startY + (e.clientY - press.startClientY) / z;
      setLocalAmbientTexts((prev) =>
        prev.map((a) => (a.id === press.id ? { ...a, x: newX, y: newY } : a)),
      );
    }
    function onUp() {
      ambientPress.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  function handleAmbientPressStart(id: string, clientX: number, clientY: number) {
    const text = localAmbientTexts.find((a) => a.id === id);
    if (!text) return;
    ambientPress.current = {
      id,
      startClientX: clientX,
      startClientY: clientY,
      startX: text.x,
      startY: text.y,
    };
  }

  function handleAmbientTextSave(id: string, text: string) {
    setLocalAmbientTexts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, text } : a)),
    );
    setEditingAmbientId(null);
  }

  function handleAddAmbientText() {
    const id = `ambient-${Date.now()}`;
    const newText: AmbientTextData = {
      id,
      text: "un murmure à écrire",
      x: 480 + Math.random() * 300 - 150,
      y: 320 + Math.random() * 260 - 130,
    };
    setLocalAmbientTexts((prev) => [...prev, newText]);
    setEditingAmbientId(id);
  }

  function handleNotePressStart(id: string, clientX: number, clientY: number) {
    const note = localNotes.find((n) => n.id === id);
    if (!note) return;
    notePress.current = {
      id,
      startClientX: clientX,
      startClientY: clientY,
      startX: note.x,
      startY: note.y,
    };
  }

  function handlePhotoPressStart(id: string, clientX: number, clientY: number) {
    const photo = photos.find((p) => p.id === id);
    if (!photo) return;
    if (photoPress.current?.timer !== null && photoPress.current?.timer) {
      window.clearTimeout(photoPress.current.timer);
    }
    const timer = window.setTimeout(() => {
      if (photoPress.current && !photoPress.current.dragging) {
        setOpenId(id);
      }
    }, LONG_PRESS_MS);
    photoPress.current = {
      id,
      startClientX: clientX,
      startClientY: clientY,
      startX: photo.x,
      startY: photo.y,
      dragging: false,
      timer,
    };
  }

  function handleCaptionSave(id: string, text: string) {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caption: text } : p)),
    );
  }

  function handleNoteTextSave(id: string, text: string) {
    setLocalNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, text } : n)),
    );
    setEditingNoteId(null);
  }

  function handleToggleRoaming(id: string) {
    setLocalNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, roaming: !n.roaming } : n)),
    );
  }

  function handleAddNote() {
    const id = `note-${Date.now()}`;
    const today = new Date();
    const dateLabel = `NOTE LIBRE · ${today.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }).toUpperCase()}`;
    const newNote: FloatingNoteData = {
      id,
      x: 500 + Math.random() * 120 - 60,
      y: 300 + Math.random() * 120 - 60,
      rotation: Math.random() * 6 - 3,
      dateLabel,
      text: "",
      font: "var(--font-hand-decontractee)",
      depth: "mid",
      roaming: false,
    };
    setLocalNotes((prev) => [...prev, newNote]);
    setEditingNoteId(id);
  }

  function handleMouseDown(e: MouseEvent<HTMLDivElement>) {
    dragState.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    setPan({
      x: e.clientX - dragState.current.x,
      y: e.clientY - dragState.current.y,
    });
  }

  function stopDrag() {
    dragState.current = null;
  }

  function recenter() {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }

  function handleAddPhotoClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return;
      const angle = Math.random() * 6 - 3;
      const newPhoto: BoardPhoto = {
        id: `custom-${Date.now()}`,
        x: 480 + Math.random() * 160 - 80,
        y: 380 + Math.random() * 160 - 80,
        rotation: angle,
        caption: file.name.replace(/\.[^.]+$/, ""),
        tint: `url(${dataUrl}) center / cover no-repeat`,
        depth: "near",
        frameType: "polaroid",
        physicsDuration: 5.5,
        physicsDelay: -(Math.random() * 3),
        noteText: "Un nouveau souvenir, tout juste posé sur le tableau.",
        noteFont: "var(--font-hand-decontractee)",
        noteSize: 22,
        metaTag: "1 PHOTO",
        bookTheme: DEFAULT_BOOK_THEME[ambiance],
        storyHeader: categoryName.toUpperCase(),
        storyTitle: "Nouveau souvenir",
        storyBody: "Son histoire n'est pas encore écrite.",
        musicTrack: "SANS TITRE",
        musicDuration: "0:00",
      };
      setPhotos((prev) => [...prev, newPhoto]);
    };
    reader.readAsDataURL(file);
  }

  function handleOpenStoryEditor() {
    setStory((prev) => prev ?? emptyStory(`story-${Date.now()}`));
    setStoryEditorOpen(true);
  }

  const hoveredPhoto = photos.find((p) => p.id === hoveredId) ?? null;
  const openPhoto = photos.find((p) => p.id === openId) ?? null;

  function pushOffsetFor(photo: BoardPhoto) {
    if (!hoveredPhoto || photo.id === hoveredPhoto.id) {
      return { x: 0, y: 0 };
    }
    const dx = photo.x - hoveredPhoto.x;
    const dy = photo.y - hoveredPhoto.y;
    const dist = Math.hypot(dx, dy) || 1;
    return {
      x: (dx / dist) * NEIGHBOR_PUSH_PX,
      y: (dy / dist) * NEIGHBOR_PUSH_PX,
    };
  }

  if (storyEditorOpen && story) {
    return (
      <div className={`board-viewport ambiance-${ambiance}`}>
        <StoryEditor
          categoryName={categoryName}
          photos={photos}
          story={story}
          onChangeStory={setStory}
          onBack={() => setStoryEditorOpen(false)}
          onPlay={() => setPlaying(true)}
        />
        {playing && (
          <StoryPlayback
            story={story}
            photos={photos}
            categoryName={categoryName}
            onQuit={() => setPlaying(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`board-viewport ambiance-${ambiance}`} ref={viewportRef}>
      <header className="board-header">
        <button type="button" className="board-back" onClick={onBack}>
          ← Tous les tableaux
        </button>
        <span className="board-title">{categoryName}</span>
        <span className="board-count">{photos.length} photos</span>
        <div className="board-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="board-file-input"
            onChange={handleFileSelected}
          />
          <button
            type="button"
            className="board-action-active"
            onClick={handleAddPhotoClick}
          >
            + Ajouter une photo
          </button>
          <button
            type="button"
            className="board-action-active"
            onClick={handleAddNote}
          >
            + Ajouter une note
          </button>
          <button
            type="button"
            className="board-action-active"
            onClick={handleAddAmbientText}
          >
            + Texte flottant
          </button>
          <button
            type="button"
            className="board-action-active"
            onClick={handleOpenStoryEditor}
          >
            Créer une histoire
          </button>
          <button type="button" className="board-pill">
            Ambiance
          </button>
        </div>
      </header>

      <div
        className={`board-canvas-clip${openId ? " is-immersive" : ""}`}
        ref={canvasClipRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        <div className="board-ambient-glow" />
        {DEPTH_ORDER.map((depth) => {
          const factor = PARALLAX_FACTOR[depth];
          return (
            <div
              key={depth}
              className="board-canvas"
              style={{
                transform: `translate(${pan.x * factor}px, ${pan.y * factor}px) scale(${zoom})`,
              }}
            >
              {photos
                .filter((photo) => photo.depth === depth)
                .map((photo) => (
                  <PhotoFrame
                    key={photo.id}
                    photo={photo}
                    isHovered={photo.id === hoveredId}
                    pushOffset={pushOffsetFor(photo)}
                    onHoverChange={setHoveredId}
                    onPressStart={handlePhotoPressStart}
                    onCaptionSave={handleCaptionSave}
                  />
                ))}
              {localNotes
                .filter((note) => note.depth === depth)
                .map((note) => (
                  <FloatingNote
                    key={note.id}
                    note={note}
                    editingInitially={note.id === editingNoteId}
                    onTextSave={handleNoteTextSave}
                    onToggleRoaming={handleToggleRoaming}
                    onPressStart={handleNotePressStart}
                  />
                ))}
              {depth === "far" &&
                localAmbientTexts.map((text) => (
                  <AmbientText
                    key={text.id}
                    data={text}
                    editingInitially={text.id === editingAmbientId}
                    onTextSave={handleAmbientTextSave}
                    onPressStart={handleAmbientPressStart}
                  />
                ))}
            </div>
          );
        })}
        <div
          className="board-canvas board-canvas-notes"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {photos.map((photo) => (
            <NoteSlideOut
              key={photo.id}
              photo={photo}
              visible={photo.id === hoveredId}
            />
          ))}
        </div>
      </div>

      <footer className="board-footer">
        <span>Clic-glisser · molette · clic prolongé sur une photo</span>
        <div className="board-footer-controls">
          <span>ZOOM {Math.round(zoom * 100)}%</span>
          <button type="button" onClick={recenter}>
            RECENTRER
          </button>
        </div>
      </footer>

      {openPhoto && (
        <BookOverlay photo={openPhoto} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

export default FloatingBoard;
