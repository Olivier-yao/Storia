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

const GAP = 18;

function cardWidth(distance: number) {
  return Math.max(MIN_W, CENTER_W - distance * STEP_W);
}
function cardHeight(distance: number) {
  return Math.max(MIN_H, CENTER_H - distance * STEP_H);
}
function slotStyle(distance: number) {
  return {
    opacity: Math.max(0.3, 1 - distance * 0.26),
    filter: distance < 0.02 ? undefined : `blur(${Math.min(2.4, distance * 0.7)}px)`,
    zIndex: Math.round(100 - distance),
  };
}

// Sensibilité du défilement horizontal : combien de pixels de deltaX
// (glissement 2 doigts) valent un tableau entier.
const H_SCROLL_UNIT = 360;
// Frottement de la roue une fois le geste relâché — plus proche de 1 =
// glisse plus longtemps avant de se caler sur un tableau.
const SETTLE_FRICTION = 0.72;
const SETTLE_IDLE_MS = 120;

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
  // Tableau explicitement amené au centre par un clic sur une carte
  // latérale ou un défilement horizontal — prioritaire sur le choix
  // automatique (le plus visité).
  const [centerBoardId, setCenterBoardId] = useState<string | null>(null);
  // Carte en cours d'ouverture : pilote la transition de zoom vers le
  // tableau avant de basculer vraiment d'écran.
  const [openingId, setOpeningId] = useState<string | null>(null);
  // Décalage continu (en unités de "cartes", fractionnaire) au-delà du
  // tableau centré validé — avance en glissant, puis revient à 0 en
  // douceur une fois le geste relâché, comme une roue qui ralentit.
  const [dragOffset, setDragOffset] = useState(0);
  const dragOffsetRef = useRef(0);
  const mosaicRef = useRef<HTMLDivElement>(null);
  const settleRaf = useRef<number | null>(null);
  const idleTimer = useRef<number | null>(null);

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

  // Index (dans `categories`, ordre fixe) du tableau centré. Mutée
  // uniquement de façon synchrone (dans le handler de molette et au clic),
  // jamais par un effet réagissant à l'état — un effet aurait pu se
  // déclencher en retard sur un ancien rendu et écraser une valeur déjà
  // avancée par des événements "wheel" rapprochés, provoquant un
  // défilement qui saute en arrière au lieu de glisser en continu.
  const pivotIndexRef = useRef(
    Math.max(
      0,
      categories.findIndex((c) => c.boardId === pivot?.boardId),
    ),
  );

  // Une fois le geste de défilement relâché, la roue "ralentit" jusqu'à
  // se caler pile sur un tableau — jamais un arrêt sec.
  function scheduleSettle() {
    if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      function tick() {
        const next = dragOffsetRef.current * SETTLE_FRICTION;
        if (Math.abs(next) < 0.004) {
          dragOffsetRef.current = 0;
          setDragOffset(0);
          settleRaf.current = null;
          return;
        }
        dragOffsetRef.current = next;
        setDragOffset(next);
        settleRaf.current = requestAnimationFrame(tick);
      }
      settleRaf.current = requestAnimationFrame(tick);
    }, SETTLE_IDLE_MS);
  }

  // Molette pour zoomer/dézoomer sur la mosaïque (comme sur un tableau
  // flottant), ou pour défiler horizontalement dans le carrousel quand le
  // geste est surtout horizontal (glissement 2 doigts sur pavé tactile).
  // Le défilement est continu (comme une roue de vélo qu'on fait tourner)
  // plutôt qu'un saut sec d'un tableau à l'autre : chaque petit mouvement
  // avance ou recule d'une fraction de carte, et le passage au tableau
  // suivant se fait pile quand une carte entière a défilé.
  useEffect(() => {
    const node = mosaicRef.current;
    if (!node) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2) {
        if (settleRaf.current !== null) {
          cancelAnimationFrame(settleRaf.current);
          settleRaf.current = null;
        }
        let offset = dragOffsetRef.current + e.deltaX / H_SCROLL_UNIT;
        let idx = pivotIndexRef.current;
        while (offset > 0.999 && idx < categories.length - 1) {
          offset -= 1;
          idx += 1;
        }
        while (offset < -0.999 && idx > 0) {
          offset += 1;
          idx -= 1;
        }
        // Aux extrémités, la roue résiste plutôt que de tourner dans le
        // vide — mais seulement dans le sens qui n'a plus de carte
        // (jamais dans le sens qui doit justement amener au cran suivant).
        if (idx === 0) offset = Math.max(offset, -0.6);
        if (idx === categories.length - 1) offset = Math.min(offset, 0.6);
        pivotIndexRef.current = idx;
        dragOffsetRef.current = offset;
        setDragOffset(offset);
        const nextId = categories[idx]?.boardId;
        if (nextId) setCenterBoardId(nextId);
        scheduleSettle();
        return;
      }
      const delta = -e.deltaY * 0.0015;
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + z * delta)));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
      if (settleRaf.current !== null) cancelAnimationFrame(settleRaf.current);
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
    };
  }, [categories]);

  // Une carte latérale se recentre au clic ; la carte déjà centrale
  // s'ouvre, avec une petite animation de zoom avant de basculer vers le
  // tableau.
  function handleCardClick(card: CategoryCardData) {
    if (openingId) return;
    if (card.boardId === pivot?.boardId) {
      setOpeningId(card.boardId);
      if (settleRaf.current !== null) {
        cancelAnimationFrame(settleRaf.current);
        settleRaf.current = null;
      }
      window.setTimeout(() => onOpenCategory(card.boardId), 380);
    } else {
      if (settleRaf.current !== null) {
        cancelAnimationFrame(settleRaf.current);
        settleRaf.current = null;
      }
      dragOffsetRef.current = 0;
      setDragOffset(0);
      const idx = categories.findIndex((c) => c.boardId === card.boardId);
      if (idx >= 0) pivotIndexRef.current = idx;
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

  // Piste en profondeur ("coverflow") : les tableaux gardent toujours le
  // même ordre (jamais réordonnés), seule la position de mise au point
  // (fractionnaire) glisse continûment le long de la piste — c'est ce qui
  // permet un défilement vraiment fluide plutôt qu'un saut d'une carte à
  // l'autre. Chaque carte a une position X cumulée (largeur des
  // précédentes), et toute la piste se translate pour amener le point de
  // mise au point pile au centre de l'écran.
  const pivotIndex = Math.max(
    0,
    categories.findIndex((c) => c.boardId === pivot?.boardId),
  );
  const focusPos = pivotIndex + dragOffset;
  let cursor = 0;
  const positions = categories.map((_, i) => {
    const distance = Math.abs(i - focusPos);
    const width = cardWidth(distance);
    const left = cursor;
    cursor += width + GAP;
    return { left, width, height: cardHeight(distance), distance };
  });
  const base = Math.max(
    0,
    Math.min(positions.length - 1, Math.floor(focusPos)),
  );
  const baseNext = Math.min(positions.length - 1, base + 1);
  const frac = Math.max(0, Math.min(1, focusPos - base));
  const centerXOf = (i: number) => positions[i].left + positions[i].width / 2;
  const focusX =
    positions.length === 0
      ? 0
      : centerXOf(base) * (1 - frac) + centerXOf(baseNext) * frac;

  return (
    <div className={`accueil-screen${openingId ? " is-opening" : ""}`}>
      <header className="accueil-header">
        <div className="accueil-brand">
          <span className="accueil-logo">Storia</span>
          <span className="accueil-sep">|</span>
          <span className="accueil-count">
            {totalPhotos} souvenirs · {totalStories} histoire
            {totalStories > 1 ? "s" : ""}
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
            <div
              className="accueil-carousel-track"
              style={{
                width: Math.max(0, cursor - GAP),
                transform: `translateX(calc(50% - ${focusX}px))`,
              }}
            >
              {categories.map((card, i) => {
                const slotClass =
                  card.boardId === openingId
                    ? " is-opening"
                    : openingId
                      ? " is-leaving"
                      : "";
                const pos = positions[i];
                return (
                  <div
                    key={card.boardId}
                    className={`accueil-carousel-slot${slotClass}`}
                    style={{
                      left: pos.left,
                      width: pos.width,
                      height: pos.height,
                      ...slotStyle(pos.distance),
                    }}
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
