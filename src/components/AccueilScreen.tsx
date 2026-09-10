import { useState } from "react";
import CategoryCard, {
  type Ambiance,
  type CategoryCardData,
} from "./CategoryCard";
import "./AccueilScreen.css";

const THEME_CHOICES: { id: Ambiance; label: string }[] = [
  { id: "neutre", label: "Sans thème" },
  { id: "famille", label: "Famille" },
  { id: "amoureux", label: "Amoureux" },
  { id: "amis", label: "Amis" },
  { id: "rencontres", label: "Belles rencontres" },
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
  const others = categories.filter((_, i) => i !== featuredIndex);
  const totalPhotos = categories.reduce((sum, c) => sum + c.photoCount, 0);

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

      <div className="accueil-mosaic">
        {featured && (
          <div className="accueil-featured">
            <CategoryCard
              data={featured}
              onOpen={() => onOpenCategory(featured.boardId)}
              featured
            />
          </div>
        )}
        <div className="accueil-others">
          {others.map((card) => (
            <CategoryCard
              key={card.boardId}
              data={card}
              onOpen={() => onOpenCategory(card.boardId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AccueilScreen;
