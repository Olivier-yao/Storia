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
  // Tableau explicitement amené au centre par un clic sur une carte
  // latérale ou un défilement horizontal — prioritaire sur le choix
  // automatique (le plus visité).
  const [centerBoardId, setCenterBoardId] = useState<string | null>(null);
  // Carte en cours d'ouverture : pilote la transition de zoom vers le
  // tableau avant de basculer vraiment d'écran.
  const [openingId, setOpeningId] = useState<string | null>(null);
  const mosaicRef = useRef<HTMLDivElement>(null);
  const hScrollAccum = useRef(0);

  // Le tableau le plus visité anime la carte large par défaut — jamais un
  // tableau neuf (règle de la mosaïque, 3a) — sauf si l'utilisateur a
  // explicitement recentré le carrousel sur un autre tableau.
  const featuredIndex = categories.findIndex((c) => c.photoCount > 0);
  const featured = featuredIndex >= 0 ? categories[featuredIndex] : null;
  const totalPhotos = categories.reduce((sum, c) => sum + c.photoCount, 0);
  const pivot =
    categories.find((c) => c.boardId === centerBoardId) ??
    featured ??
    categories[0] ??
    null;

  // Molette pour zoomer/dézoomer sur la mosaïque (comme sur un tableau
  // flottant), ou pour défiler horizontalement dans le carrousel quand le
  // geste est surtout horizontal (glissement 2 doigts sur pavé tactile) —
  // chaque "cran" accumulé avance le tableau centré d'un cran.
  useEffect(() => {
    const node = mosaicRef.current;
    if (!node) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2) {
        hScrollAccum.current += e.deltaX;
        const THRESHOLD = 80;
        if (Math.abs(hScrollAccum.current) < THRESHOLD) return;
        const dir = hScrollAccum.current > 0 ? 1 : -1;
        hScrollAccum.current = 0;
        const idx = categories.findIndex((c) => c.boardId === pivot?.boardId);
        const nextIdx = Math.min(
          categories.length - 1,
          Math.max(0, idx + dir),
        );
        const next = categories[nextIdx];
        if (next) setCenterBoardId(next.boardId);
        return;
      }
      const delta = -e.deltaY * 0.0015;
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + z * delta)));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [categories, pivot]);

  // Une carte latérale se recentre au clic (elle prend la place de
  // l'ancienne carte centrale) ; la carte déjà centrale s'ouvre, avec une
  // petite animation de zoom avant de basculer vers le tableau.
  function handleCardClick(card: CategoryCardData) {
    if (openingId) return;
    if (card.boardId === pivot?.boardId) {
      setOpeningId(card.boardId);
      window.setTimeout(() => onOpenCategory(card.boardId), 380);
    } else {
      setCenterBoardId(card.boardId);
    }
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

  // Range les tableaux en rangée avec le tableau pivot (centré) au milieu,
  // les autres répartis de part et d'autre en gardant leur ordre — c'est
  // cette rangée que le carrousel affiche en profondeur. Recalculée à
  // chaque changement de pivot, ce qui fait naturellement "échanger" la
  // carte cliquée avec l'ancienne carte centrale.
  const rest = categories.filter((c) => c !== pivot);
  const half = Math.ceil(rest.length / 2);
  const rowCards = pivot
    ? [...rest.slice(0, half), pivot, ...rest.slice(half)]
    : [];
  const centerIndex = rowCards.indexOf(pivot as CategoryCardData);

  return (
    <div className={`accueil-screen${openingId ? " is-opening" : ""}`}>
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
            {rowCards.map((card, i) => {
              const slotClass =
                card.boardId === openingId
                  ? " is-opening"
                  : openingId
                    ? " is-leaving"
                    : "";
              return (
                <div
                  key={card.boardId}
                  className={`accueil-carousel-slot${slotClass}`}
                  style={slotStyle(Math.abs(i - centerIndex))}
                >
                  <CategoryCard
                    data={card}
                    onOpen={() => handleCardClick(card)}
                    featured={card === featured}
                  />
                </div>
              );
            })}
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
