import { useEffect, useRef, useState } from "react";
import "./styles/tokens.css";
import AccueilScreen from "./components/AccueilScreen";
import FloatingBoard from "./components/FloatingBoard";
import type {
  Ambiance,
  CardPhoto,
  CategoryCardData,
} from "./components/CategoryCard";
import type { BoardPhoto } from "./components/PhotoFrame";
import { boards as staticBoards, type BoardData } from "./data/boardData";
import { homeCategories } from "./data/homeCategories";
import type { Story } from "./data/storyTypes";
import { loadState, saveState } from "./data/persistence";

const SAVE_DEBOUNCE_MS = 400;

function emptyBoard(name: string): BoardData {
  return { name, photos: [], notes: [], ambientTexts: [] };
}

// Aperçu réel du contenu sur la carte d'accueil : quelques vraies photos
// du tableau, posées sur des gabarits fixes (au lieu de l'ancien décor
// entièrement inventé) — ainsi la carte change vraiment quand on ajoute
// une photo.
const PREVIEW_SLOTS: Omit<CardPhoto, "tint">[] = [
  { top: 10, left: 12, width: 46, height: 58, rotation: -4 },
  { top: 26, left: 40, width: 44, height: 56, rotation: 3 },
  { top: 6, left: 56, width: 38, height: 50, rotation: -2 },
];

function derivePreviewPhotos(boardPhotos: BoardPhoto[]): CardPhoto[] {
  return boardPhotos.slice(0, PREVIEW_SLOTS.length).map((photo, i) => ({
    ...PREVIEW_SLOTS[i],
    tint: photo.tint,
  }));
}

// Texte "X photos · Y histoire(s)" recalculé sur les vraies données —
// l'ancien texte venait d'un décor figé (homeCategories.ts) qui ne
// bougeait jamais quand on ajoutait une photo ou une histoire.
function describeBoard(photoCount: number, hasStory: boolean): string {
  const photoPart = `${photoCount} photo${photoCount > 1 ? "s" : ""}`;
  return hasStory ? `${photoPart} · 1 histoire` : photoPart;
}

function App() {
  const [openBoardId, setOpenBoardId] = useState<string | null>(null);
  const [openInEditor, setOpenInEditor] = useState(false);
  const [customCategories, setCustomCategories] = useState<
    CategoryCardData[]
  >([]);
  const [boardOverrides, setBoardOverrides] = useState<
    Record<string, BoardData>
  >({});
  const [stories, setStories] = useState<Record<string, Story>>({});
  // Ambiance choisie après coup (bouton "Ambiance" du tableau) — prioritaire
  // sur l'ambiance de départ, qu'elle vienne d'une catégorie statique ou
  // créée par l'utilisateur.
  const [ambianceOverrides, setAmbianceOverrides] = useState<
    Record<string, Ambiance>
  >({});
  const loaded = useRef(false);
  const saveTimer = useRef<number | null>(null);

  // Charge la sauvegarde locale une seule fois au démarrage.
  useEffect(() => {
    let cancelled = false;
    loadState().then((persisted) => {
      if (cancelled) return;
      if (persisted) {
        setCustomCategories(persisted.customCategories);
        setBoardOverrides(persisted.boards);
        setStories(persisted.stories);
        setAmbianceOverrides(persisted.ambianceOverrides ?? {});
      }
      loaded.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sauvegarde locale, débouncée pour ne pas écrire à chaque pixel d'un
  // glisser-déposer — seulement une fois le chargement initial terminé,
  // pour ne jamais écraser la sauvegarde avec l'état vide de démarrage.
  useEffect(() => {
    if (!loaded.current) return;
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveState({
        version: 1,
        customCategories,
        boards: boardOverrides,
        stories,
        ambianceOverrides,
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [customCategories, boardOverrides, stories, ambianceOverrides]);

  function getBoard(id: string): BoardData | undefined {
    return (
      boardOverrides[id] ?? staticBoards[id as keyof typeof staticBoards]
    );
  }

  function updateBoard(id: string, updater: (board: BoardData) => BoardData) {
    setBoardOverrides((prev) => ({
      ...prev,
      [id]: updater(getBoard(id) ?? emptyBoard(id)),
    }));
  }

  function updateStory(id: string, story: Story | null) {
    setStories((prev) => {
      const next = { ...prev };
      if (story) next[id] = { ...story, updatedAt: Date.now() };
      else delete next[id];
      return next;
    });
  }

  function updateAmbiance(id: string, ambiance: Ambiance) {
    setAmbianceOverrides((prev) => ({ ...prev, [id]: ambiance }));
  }

  function handleResume(boardId: string) {
    setOpenBoardId(boardId);
    setOpenInEditor(true);
  }

  function createCategory(name: string, ambiance: Ambiance) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `custom-${Date.now()}`;
    const card: CategoryCardData = {
      boardId: id,
      ambiance,
      name: trimmed,
      meta: "0 photo",
      photoCount: 0,
      photos: [],
      notes: [],
    };
    setCustomCategories((prev) => [...prev, card]);
    setBoardOverrides((prev) => ({ ...prev, [id]: emptyBoard(trimmed) }));
    setOpenBoardId(id);
  }

  if (openBoardId) {
    const board = getBoard(openBoardId);
    const category =
      homeCategories.find((c) => c.boardId === openBoardId) ??
      customCategories.find((c) => c.boardId === openBoardId);
    if (board && category) {
      const ambiance = ambianceOverrides[openBoardId] ?? category.ambiance;
      return (
        <FloatingBoard
          categoryName={board.name}
          ambiance={ambiance}
          photos={board.photos}
          notes={board.notes}
          story={stories[openBoardId] ?? null}
          onPhotosChange={(photos) =>
            updateBoard(openBoardId, (b) => ({ ...b, photos }))
          }
          onNotesChange={(notes) =>
            updateBoard(openBoardId, (b) => ({ ...b, notes }))
          }
          onStoryChange={(story) => updateStory(openBoardId, story)}
          onAmbianceChange={(next) => updateAmbiance(openBoardId, next)}
          ambientTexts={board.ambientTexts}
          onAmbientTextsChange={(ambientTexts) =>
            updateBoard(openBoardId, (b) => ({ ...b, ambientTexts }))
          }
          startInEditor={openInEditor}
          onBack={() => {
            setOpenBoardId(null);
            setOpenInEditor(false);
          }}
        />
      );
    }
  }

  const categories = [...homeCategories, ...customCategories].map((c) => {
    const ambiance = ambianceOverrides[c.boardId] ?? c.ambiance;
    const board = getBoard(c.boardId);
    if (!board) return { ...c, ambiance };
    const hasStory = Boolean(stories[c.boardId]);
    return {
      ...c,
      ambiance,
      photoCount: board.photos.length,
      // Les 4 tableaux d'origine ont leur propre décor posé à la main
      // (planche 1b) — n'y toucher que pour un tableau perso, qui n'en a
      // pas, afin qu'il montre quand même un aperçu de son vrai contenu.
      photos:
        c.photos.length === 0
          ? derivePreviewPhotos(board.photos)
          : c.photos,
      meta: describeBoard(board.photos.length, hasStory),
    };
  });
  const totalStories = Object.keys(stories).length;

  const resumeEntry = Object.entries(stories).sort(
    (a, b) => b[1].updatedAt - a[1].updatedAt,
  )[0];
  const resumeCategory = resumeEntry
    ? categories.find((c) => c.boardId === resumeEntry[0])
    : undefined;
  const resumeStory =
    resumeEntry && resumeCategory
      ? {
          boardId: resumeEntry[0],
          title: resumeEntry[1].title,
          ambiance: resumeCategory.ambiance,
        }
      : null;

  return (
    <AccueilScreen
      categories={categories}
      totalStories={totalStories}
      onOpenCategory={setOpenBoardId}
      onCreateCategory={createCategory}
      resumeStory={resumeStory}
      onResume={handleResume}
    />
  );
}

export default App;
