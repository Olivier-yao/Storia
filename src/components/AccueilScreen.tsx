import { useEffect, useRef, useState } from "react";
import CategoryCard, {
  AMBIANCE_CHOICES,
  type Ambiance,
  type CategoryCardData,
} from "./CategoryCard";
import "./AccueilScreen.css";

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.6;

function AccueilScreen({
  categories,
  totalStories,
  onOpenCategory,
  onCreateCategory,
  resumeStory,
  onResume,
}: {
  categories: CategoryCardData[];
  totalStories: number;
  onOpenCategory: (boardId: string) => void;
  onCreateCategory: (name: string, ambiance: Ambiance) => void;
  resumeStory: { boardId: string; title: string; ambiance: Ambiance } | null;
  onResume: (boardId: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<Ambiance>("neutre");
  const [zoom, setZoom] = useState(1);
  // Carte en cours d'ouverture : pilote la transition de zoom vers le
  // tableau avant de basculer vraiment d'écran.
  const [openingId, setOpeningId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const totalPhotos = categories.reduce((sum, c) => sum + c.photoCount, 0);

  // Molette pour zoomer/dézoomer sur la mosaïque, comme sur un tableau
  // flottant.
  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + z * delta)));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  // Chaque carte s'ouvre directement au clic (plus de bouton "OUVRIR"
  // séparé), avec une petite animation de zoom avant de basculer vers le
  // tableau.
  function handleCardClick(card: CategoryCardData) {
    if (openingId) return;
    setOpeningId(card.boardId);
    window.setTimeout(() => onOpenCategory(card.boardId), 380);
  }

  function reset() {
    setCreating(false);
    setName("");
    setTheme("neutre");
  }

  function submit() {
    if (!name.trim()) return;
    onCreateCategory(name, theme);
    reset();
  }

  return (
    <div className={`accueil-screen${openingId ? " is-opening" : ""}`}>
      <header className="accueil-header">
        <div className="accueil-brand">
          <span className="accueil-logo">Storia</span>
          <span className="accueil-sep" />
          <span className="accueil-count">
            {totalPhotos} souvenirs · {totalStories} histoire
            {totalStories > 1 ? "s" : ""}
          </span>
        </div>
        <nav className="accueil-nav">
          <span>Rechercher</span>
          <span>Histoires</span>
          <span>Réglages</span>
          <span className="accueil-avatar">LM</span>
        </nav>
      </header>

      <div className="accueil-greeting">
        <h1>Bonsoir Louise.</h1>
        <p>
          {categories.length} tableaux flottent. Ouvrez-en un pour dériver
          dedans.
        </p>
        {resumeStory && (
          <button
            type="button"
            className={`accueil-resume ambiance-${resumeStory.ambiance}`}
            onClick={() => onResume(resumeStory.boardId)}
          >
            Reprendre « {resumeStory.title} »
          </button>
        )}
      </div>


      <div className="accueil-grid-wrap" ref={gridRef}>
        <div
          className="accueil-grid-zoom"
          style={{ transform: `scale(${zoom})` }}
        >
          <div className="accueil-grid">
            {categories.map((card) => {
              const slotClass =
                card.boardId === openingId
                  ? " is-opening"
                  : openingId
                    ? " is-leaving"
                    : "";
              return (
                <div
                  key={card.boardId}
                  className={`accueil-grid-slot${slotClass}`}
                >
                  <CategoryCard
                    data={card}
                    onOpen={() => handleCardClick(card)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="accueil-footer">
        {creating ? (
          <div className="accueil-create-form">
            <div className="accueil-create-row">
              <input
                autoFocus
                type="text"
                placeholder="Nom du tableau…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                  if (e.key === "Escape") reset();
                }}
              />
              <button type="button" onClick={submit}>
                Créer
              </button>
              <button
                type="button"
                className="accueil-create-cancel"
                onClick={reset}
              >
                Annuler
              </button>
            </div>
            <div className="accueil-theme-row">
              {AMBIANCE_CHOICES.map((choice) => (
                <button
                  type="button"
                  key={choice.id}
                  className={`accueil-theme-chip ambiance-${choice.id}${
                    theme === choice.id ? " is-active" : ""
                  }`}
                  onClick={() => setTheme(choice.id)}
                >
                  <span className="accueil-theme-swatch" />
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="accueil-create-pill"
              onClick={() => setCreating(true)}
            >
              ＋ Créer une catégorie
            </button>
            <span className="accueil-create-hint">
              Vos tableaux, vos règles : nom, ambiance, musique par défaut.
            </span>
          </>
        )}
      </div>

      <div className="accueil-zoom-controls">
        <span>ZOOM {Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom(1)}>
          RECENTRER
        </button>
      </div>
    </div>
  );
}

export default AccueilScreen;
