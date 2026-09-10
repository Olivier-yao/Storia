import { useEffect, useRef, useState } from "react";
import type { BoardPhoto } from "./PhotoFrame";
import { FrameVisual } from "./PhotoFrame";
import { TRANSITIONS, type Story } from "../data/storyTypes";
import "./StoryPlayback.css";

const CHARS_PER_SECOND = 28;
const CHROME_HIDE_MS = 3000;
const TICK_MS = 100;

function StoryPlayback({
  story,
  photos,
  categoryName,
  onQuit,
}: {
  story: Story;
  photos: BoardPhoto[];
  categoryName: string;
  onQuit: () => void;
}) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeTimer = useRef<number | null>(null);

  const scene = story.scenes[sceneIndex];
  const photo = photos.find((p) => p.id === scene?.photoIds[0]);
  const charCount = Math.floor((elapsedMs / 1000) * CHARS_PER_SECOND);

  useEffect(() => {
    if (paused || !scene) return;
    const interval = window.setInterval(() => {
      setElapsedMs((prev) => {
        const next = prev + TICK_MS;
        if (next >= scene.duration * 1000) {
          if (sceneIndex < story.scenes.length - 1) {
            setSceneIndex((i) => i + 1);
            return 0;
          }
          window.clearInterval(interval);
          return prev;
        }
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(interval);
  }, [paused, sceneIndex, scene, story.scenes.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onQuit();
      if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onQuit]);

  function resetChromeTimer() {
    setChromeVisible(true);
    if (chromeTimer.current !== null) window.clearTimeout(chromeTimer.current);
    chromeTimer.current = window.setTimeout(
      () => setChromeVisible(false),
      CHROME_HIDE_MS,
    );
  }

  useEffect(() => {
    resetChromeTimer();
    return () => {
      if (chromeTimer.current !== null) window.clearTimeout(chromeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!scene) return null;
  const written = scene.text.slice(0, charCount);
  const transitionLabel = TRANSITIONS.find(
    (t) => t.id === scene.transition,
  )?.label;

  return (
    <div
      className={`story-playback story-theme-${scene.bookTheme}`}
      onMouseMove={resetChromeTimer}
    >
      <div className="story-playback-stage">
        {photo && (
          <div className="story-playback-frame">
            <FrameVisual photo={{ ...photo, frameType: scene.frameType }} />
          </div>
        )}
        <h2 className="story-playback-title">{scene.title}</h2>
        <p className="story-playback-text">{written}</p>
      </div>

      <div className="story-playback-progress">
        {story.scenes.map((s, i) => (
          <div key={s.id} className="story-progress-seg">
            <div
              className="story-progress-fill"
              style={{
                width:
                  i < sceneIndex
                    ? "100%"
                    : i === sceneIndex
                      ? `${Math.min(100, (elapsedMs / (s.duration * 1000)) * 100)}%`
                      : "0%",
              }}
            />
          </div>
        ))}
      </div>

      <div className={`story-playback-chrome${chromeVisible ? "" : " is-hidden"}`}>
        <span className="story-playback-scene-count">
          SCÈNE {sceneIndex + 1} / {story.scenes.length}
        </span>
        <span className="story-playback-subtitle">
          {story.title} · {categoryName}
        </span>
        <button
          type="button"
          className="story-playback-pause"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? "▶" : "❙❙"}
        </button>
        <span className="story-playback-music">
          ♪ {(scene.musicTrack ?? story.musicTrack).toUpperCase()} ·{" "}
          {transitionLabel?.toUpperCase()}
        </span>
        <button type="button" className="story-playback-quit" onClick={onQuit}>
          Quitter ✕
        </button>
      </div>
    </div>
  );
}

export default StoryPlayback;
