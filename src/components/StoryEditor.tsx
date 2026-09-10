import { useRef, useState } from "react";
import type { BoardPhoto, FrameType } from "./PhotoFrame";
import { FrameVisual } from "./PhotoFrame";
import {
  MUSIC_LIBRARY,
  TRANSITIONS,
  emptyScene,
  type Scene,
  type Story,
} from "../data/storyTypes";
import "./StoryEditor.css";

const FRAME_CHOICES: { id: FrameType; label: string }[] = [
  { id: "polaroid", label: "Polaroïd" },
  { id: "pellicule", label: "Pellicule" },
  { id: "bois", label: "Bois vintage" },
  { id: "coeur", label: "Cœur" },
];

function totalDuration(story: Story) {
  return story.scenes.reduce((sum, s) => sum + s.duration, 0);
}

function StoryEditor({
  categoryName,
  photos,
  story,
  onChangeStory,
  onBack,
  onPlay,
}: {
  categoryName: string;
  photos: BoardPhoto[];
  story: Story;
  onChangeStory: (story: Story) => void;
  onBack: () => void;
  onPlay: () => void;
}) {
  const [activeSceneId, setActiveSceneId] = useState(story.scenes[0]?.id);
  const [photoDragOver, setPhotoDragOver] = useState(false);
  const dragSceneId = useRef<string | null>(null);
  const musicFileInputRef = useRef<HTMLInputElement>(null);

  const activeScene =
    story.scenes.find((s) => s.id === activeSceneId) ?? story.scenes[0];

  function updateScene(id: string, patch: Partial<Scene>) {
    onChangeStory({
      ...story,
      scenes: story.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  }

  function togglePhotoInScene(photoId: string) {
    if (!activeScene) return;
    const has = activeScene.photoIds.includes(photoId);
    updateScene(activeScene.id, {
      photoIds: has
        ? activeScene.photoIds.filter((id) => id !== photoId)
        : [...activeScene.photoIds, photoId],
    });
  }

  function addPhotoToScene(photoId: string) {
    if (!activeScene) return;
    if (activeScene.photoIds.includes(photoId)) return;
    updateScene(activeScene.id, {
      photoIds: [...activeScene.photoIds, photoId],
    });
  }

  function addScene() {
    const id = `${story.id}-s${story.scenes.length + 1}-${Date.now()}`;
    const scene = emptyScene(id);
    onChangeStory({ ...story, scenes: [...story.scenes, scene] });
    setActiveSceneId(id);
  }

  function reorderScenes(fromId: string, toId: string) {
    if (fromId === toId) return;
    const scenes = [...story.scenes];
    const fromIdx = scenes.findIndex((s) => s.id === fromId);
    const toIdx = scenes.findIndex((s) => s.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = scenes.splice(fromIdx, 1);
    scenes.splice(toIdx, 0, moved);
    onChangeStory({ ...story, scenes });
  }

  function handleMusicFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onChangeStory({ ...story, musicTrack: file.name });
  }

  const previewPhoto = activeScene
    ? photos.find((p) => p.id === activeScene.photoIds[0])
    : undefined;

  return (
    <div className="story-editor">
      <header className="story-editor-header">
        <button type="button" className="story-back" onClick={onBack}>
          ← Tableau {categoryName}
        </button>
        <span className="story-title">{story.title}</span>
        <span className="story-meta">
          {story.scenes.length} scènes · {totalDuration(story).toFixed(1)}s
        </span>
        <span className="story-draft">Brouillon enregistré</span>
        <div className="story-header-actions">
          <button type="button" className="story-play-btn" onClick={onPlay}>
            ▶ Revivre
          </button>
          <button type="button" className="story-finish-btn" onClick={onBack}>
            Terminer l'histoire
          </button>
        </div>
      </header>

      <div className="story-editor-body">
        <aside className="story-photos-panel">
          <span className="story-panel-label">Photos du tableau</span>
          <p className="story-panel-hint">
            Cliquez une photo pour l'ajouter à la scène. {photos.length}{" "}
            disponibles dans ce tableau.
          </p>
          <p className="story-panel-note">
            Les photos restent sur le tableau : une histoire les emprunte,
            elle ne les déplace pas.
          </p>
          <div className="story-photo-grid">
            {photos.map((p) => (
              <button
                type="button"
                key={p.id}
                draggable
                className={`story-photo-thumb${
                  activeScene?.photoIds.includes(p.id) ? " is-selected" : ""
                }`}
                style={{ background: p.tint }}
                onClick={() => togglePhotoInScene(p.id)}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/storia-photo-id", p.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                title={p.caption}
              />
            ))}
          </div>
        </aside>

        <div className="story-preview-panel">
          <span className="story-panel-label">Scène · aperçu</span>
          <p className="story-panel-hint">Ce que verra le lecteur, en plein écran</p>
          {activeScene && (
            <div
              className={`story-preview story-preview-${activeScene.bookTheme}${
                photoDragOver ? " is-drag-over" : ""
              }`}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes("text/storia-photo-id")) {
                  e.preventDefault();
                  setPhotoDragOver(true);
                }
              }}
              onDragLeave={() => setPhotoDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setPhotoDragOver(false);
                const photoId = e.dataTransfer.getData("text/storia-photo-id");
                if (photoId) addPhotoToScene(photoId);
              }}
            >
              <span className="story-preview-badge">APERÇU 16:9</span>
              {previewPhoto && (
                <div className="story-preview-frame">
                  <FrameVisual
                    photo={{ ...previewPhoto, frameType: activeScene.frameType }}
                  />
                </div>
              )}
              <input
                className="story-preview-title"
                value={activeScene.title}
                onChange={(e) =>
                  updateScene(activeScene.id, { title: e.target.value })
                }
              />
              <textarea
                className="story-preview-text"
                value={activeScene.text}
                placeholder="Cliquez pour écrire le texte de la scène…"
                onChange={(e) =>
                  updateScene(activeScene.id, { text: e.target.value })
                }
              />
              <span className="story-panel-label story-editable-hint">
                Texte éditable · clic pour écrire
              </span>
            </div>
          )}
        </div>

        <aside className="story-controls-panel">
          <div>
            <span className="story-panel-label">Cadre de la scène</span>
            <div className="story-chip-row">
              {FRAME_CHOICES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`story-chip${
                    activeScene?.frameType === f.id ? " is-active" : ""
                  }`}
                  onClick={() =>
                    activeScene &&
                    updateScene(activeScene.id, { frameType: f.id })
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="story-panel-label">Thème de livre</span>
            <div className="story-chip-row">
              {(["vintage", "neon"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`story-chip${
                    activeScene?.bookTheme === t ? " is-active" : ""
                  }`}
                  onClick={() =>
                    activeScene && updateScene(activeScene.id, { bookTheme: t })
                  }
                >
                  {t === "vintage" ? "Carnet vintage" : "Néon digital"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="story-panel-label">Durée à l'écran</span>
            <div className="story-duration-row">
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={activeScene?.duration ?? 4}
                onChange={(e) =>
                  activeScene &&
                  updateScene(activeScene.id, {
                    duration: Number(e.target.value),
                  })
                }
              />
              <span className="story-duration-value">
                {(activeScene?.duration ?? 4).toFixed(1)}s
              </span>
            </div>
          </div>

          <div>
            <span className="story-panel-label">Musique de fond</span>
            <input
              ref={musicFileInputRef}
              type="file"
              accept="audio/*"
              className="board-file-input"
              onChange={handleMusicFile}
            />
            <button
              type="button"
              className="story-music-import"
              onClick={() => musicFileInputRef.current?.click()}
            >
              Importer
            </button>
            <div className="story-music-list">
              {MUSIC_LIBRARY.map((track) => (
                <button
                  type="button"
                  key={track}
                  className={`story-music-item${
                    story.musicTrack === track ? " is-active" : ""
                  }`}
                  onClick={() => onChangeStory({ ...story, musicTrack: track })}
                >
                  ▶ {track}
                </button>
              ))}
            </div>
            <p className="story-panel-note">
              Appliquée à toute l'histoire. Une scène peut la remplacer.
            </p>

            {activeScene && (
              <>
                <span className="story-panel-label story-music-override-label">
                  Pour cette scène
                </span>
                <div className="story-chip-row">
                  <button
                    type="button"
                    className={`story-chip${
                      !activeScene.musicTrack ? " is-active" : ""
                    }`}
                    onClick={() =>
                      updateScene(activeScene.id, { musicTrack: undefined })
                    }
                  >
                    Par défaut
                  </button>
                  {MUSIC_LIBRARY.map((track) => (
                    <button
                      type="button"
                      key={track}
                      className={`story-chip${
                        activeScene.musicTrack === track ? " is-active" : ""
                      }`}
                      onClick={() => updateScene(activeScene.id, { musicTrack: track })}
                    >
                      {track}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            <span className="story-panel-label">Transition</span>
            <div className="story-chip-row">
              {TRANSITIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`story-chip${
                    activeScene?.transition === t.id ? " is-active" : ""
                  }`}
                  onClick={() =>
                    activeScene &&
                    updateScene(activeScene.id, { transition: t.id })
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="story-sequence">
        <span className="story-panel-label">Séquence</span>
        <p className="story-panel-hint">
          Glissez une vignette pour réordonner · cliquez pour éditer
        </p>
        <div className="story-sequence-row">
          {story.scenes.map((scene, i) => (
            <div
              key={scene.id}
              draggable
              onDragStart={() => (dragSceneId.current = scene.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragSceneId.current) reorderScenes(dragSceneId.current, scene.id);
                dragSceneId.current = null;
              }}
              className={`story-scene-card${
                scene.id === activeScene?.id ? " is-active" : ""
              }`}
              onClick={() => setActiveSceneId(scene.id)}
            >
              <span className="story-scene-label">SCÈNE {i + 1}</span>
              <span className="story-scene-duration">
                {scene.duration.toFixed(1)}s
              </span>
              <span className="story-scene-title">{scene.title}</span>
              <span className="story-scene-meta">
                {scene.photoIds.length} photo
                {scene.photoIds.length > 1 ? "s" : ""} ·{" "}
                {FRAME_CHOICES.find((f) => f.id === scene.frameType)?.label}
              </span>
              {i < story.scenes.length - 1 && (
                <span className="story-scene-transition">
                  ◇ {TRANSITIONS.find((t) => t.id === scene.transition)?.label}
                </span>
              )}
            </div>
          ))}
          <button type="button" className="story-add-scene" onClick={addScene}>
            ＋ Ajouter une scène
          </button>
        </div>
      </div>
    </div>
  );
}

export default StoryEditor;
