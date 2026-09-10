import { useEffect, useRef, useState } from "react";
import CategoryCard, {
  type Ambiance,
  type CategoryCardData,
} from "./CategoryCard";
import "./AccueilScreen.css";

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.6;

// Carrousel en profondeur ("coverflow") : la carte centrale est grande et
// nette, les autres rétrécissent et s'estompent en s'éloignant du centre —
// inspiré de la référence envoyée par l'utilisateur (cartes de films
// empilées en profondeur, Pinterest).
const CENTER_W = 320;
const CENTER_H = 430;
const STEP_W = 74;
const STEP_H = 96;
const MIN_W = 130;
const MIN_H = 175;

function slotStyle(distance: number) {
  return {
    width: Math.max(MIN_W, CENTER_W - distance * STEP_W),
    height: Math.max(MIN_H, CENTER_H - distance * STEP_H),
    opacity: Math.max(0.3, 1 - distance * 0.26),
    filter: distance === 0 ? undefined : `blur(${Math.min(2.4, distance * 0.7)}px)`,
    zIndex: 100 - distance,
  };
}

const THEME_CHOICES: { id: Ambiance; label: string }[] = [
  { id: "neutre", label: "Sans thème" },
  { id: "famille", label: "Famille" },
  { id: "amoureux", label: "Amoureux" },
  { id: "amis", label: "Amis" },
  { id: "rencontres", label: "Belles rencontres" },
  { id: "corail", label: "Corail" },
  { id: "lavande", label: "Lavande" },
  { id: "petrole", label: "Bleu pétrole" },
  { id: "sauge", label: "Sauge" },
  { id: "bordeaux", label: "Bordeaux" },
];

function AccueilScreen({
  categories,
  onOpenCategory,
  onCreateCategory,
  resumeStory,
  onResume,
}: {
  categories: CategoryCardData[];
  onOpenCategory: (boardId: string) => void;
  onCreateCategory: (name: string, ambiance: Ambiance) => void;
  resumeStory: { boardId: string; title: string; ambiance: Ambiance } | null;
  onResume: (boardId: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<Ambiance>("neutre");
  const [zoom, setZoom] = useState(1);
  const mosaicRef = useRef<HTMLDivElement>(null);

  // Molette pour zoomer/dézoomer sur la mosaïque, comme sur un tableau
  // flottant — même mécanique et mêmes bornes que la vue photo.
  useEffect(() => {
    const node = mosaicRef.current;
    if (!node) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + z * delta)));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

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

  // Le tableau le plus visité anime la carte large — jamais un tableau
  // neuf (règle de la mosaïque, 3a).
  const featuredIndex = categories.findIndex((c) => c.photoCount > 0);
  const featured = featuredIndex >= 0 ? categories[featuredIndex] : null;
  const totalPhotos = categories.reduce((sum, c) => sum + c.photoCount, 0);

  // Range les tableaux en rangée avec le tableau vedette (ou le premier, à
  // défaut) au centre, les autres répartis de part et d'autre en gardant
  // leur ordre — c'est cette rangée que le carrousel affiche en profondeur.
  const pivot = featured ?? categories[0] ?? null;
  const rest = categories.filter((c) => c !== pivot);
  const half = Math.ceil(rest.length / 2);
  const rowCards = pivot
    ? [...rest.slice(0, half), pivot, ...rest.slice(half)]
    : [];
  const centerIndex = rowCards.indexOf(pivot as CategoryCardData);

  return (
    <div className="accueil-screen">
      <header className="accueil-header">
        <div className="accueil-brand">
          <span className="accueil-logo">Storia</span>
          <span className="accueil-sep">|</span>
          <span className="accueil-count">
            {totalPhotos} souvenirs · 6 histoires
          </span>
        </div>
        <nav className="accueil-nav">
          <a href="#">Tableaux</a>
          <a href="#">Histoires</a>
          <a href="#">Musiques</a>
          <input
            type="search"
            className="accueil-search"
            placeholder="⌕ Chercher un souvenir, un mot…"
          />
          <a href="#">Réglages</a>
          <span className="accueil-avatar">LM</span>
        </nav>
      </header>

      <div className="accueil-greeting">
        <div className="accueil-greeting-text">
          <h1>Bonsoir Louise.</h1>
          <p>
            {categories.length} tableaux, {totalPhotos} souvenirs.
          </p>
        </div>
        <div className="accueil-greeting-actions">
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
                {THEME_CHOICES.map((choice) => (
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
            <div className="accueil-actions-row">
              <button
                type="button"
                className="accueil-new-board"
                onClick={() => setCreating(true)}
              >
                ＋ Nouveau tableau
              </button>
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
          )}
        </div>
      </div>

      <div className="accueil-mosaic" ref={mosaicRef}>
        <div
          className="accueil-mosaic-zoom"
          style={{ transform: `scale(${zoom})` }}
        >
          {pivot && (
            <div className={`accueil-glow ambiance-${pivot.ambiance}`} />
          )}
          <div className="accueil-carousel">
            {rowCards.map((card, i) => (
              <div
                key={card.boardId}
                className="accueil-carousel-slot"
                style={slotStyle(Math.abs(i - centerIndex))}
              >
                <CategoryCard
                  data={card}
                  onOpen={() => onOpenCategory(card.boardId)}
                  featured={card === featured}
                />
              </div>
            ))}
          </div>
        </div>
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
