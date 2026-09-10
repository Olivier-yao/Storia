import type { Ambiance } from "./CategoryCard";
import "./EmptyBoardCard.css";

const FUTURE_NOTE: Record<Ambiance, string> = {
  famille: "ça commence ici",
  amoureux: "à deux, bientôt",
  amis: "la première soirée",
  rencontres: "quelqu'un, un jour",
  neutre: "nom encore à trouver",
  corail: "un premier éclat",
  lavande: "encore à écrire",
  petrole: "le large, bientôt",
  sauge: "ça pousse tout doucement",
  bordeaux: "une histoire à ouvrir",
};

const NOTE_FONT: Record<Ambiance, string> = {
  famille: "var(--font-hand-decontractee)",
  amoureux: "var(--font-hand-elegante)",
  amis: "var(--font-hand-decontractee)",
  rencontres: "var(--font-hand-elegante)",
  neutre: "var(--font-hand-elegante)",
  corail: "var(--font-hand-decontractee)",
  lavande: "var(--font-hand-elegante)",
  petrole: "var(--font-hand-decontractee)",
  sauge: "var(--font-hand-enfantine)",
  bordeaux: "var(--font-hand-elegante)",
};

function GhostFrames({ ambiance }: { ambiance: Ambiance }) {
  if (ambiance === "amoureux") {
    return (
      <>
        <div className="ghost-frame ghost-frame-coeur" />
        <div className="ghost-frame ghost-frame-small ghost-2" />
      </>
    );
  }
  if (ambiance === "amis") {
    return (
      <>
        <div className="ghost-frame ghost-frame-pellicule">
          <span className="ghost-perf ghost-perf-left" />
          <span className="ghost-perf ghost-perf-right" />
        </div>
        <div className="ghost-frame ghost-frame-small ghost-2" />
      </>
    );
  }
  if (ambiance === "rencontres") {
    return (
      <>
        <div className="ghost-frame ghost-frame-bois">
          <div className="ghost-frame-inset" />
        </div>
        <div className="ghost-frame ghost-frame-small ghost-2" />
      </>
    );
  }
  return (
    <>
      <div className="ghost-frame ghost-frame-polaroid">
        <span className="ghost-pin" />
      </div>
      <div className="ghost-frame ghost-frame-small ghost-2" />
    </>
  );
}

function EmptyBoardCard({
  ambiance,
  name,
  onFirstPhoto,
}: {
  ambiance: Ambiance;
  name: string;
  onFirstPhoto: () => void;
}) {
  return (
    <div
      className={`empty-board-card ambiance-${ambiance}`}
      onClick={onFirstPhoto}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onFirstPhoto();
      }}
    >
      <div className="empty-board-scene">
        <div className="empty-board-grain" />
        <div className="empty-board-halo" />
        <GhostFrames ambiance={ambiance} />
      </div>
      <p className="empty-board-note" style={{ fontFamily: NOTE_FONT[ambiance] }}>
        {FUTURE_NOTE[ambiance]}
      </p>
      <div className="empty-board-footer">
        <div className="empty-board-name">{name}</div>
        <div className="empty-board-meta">TABLEAU NEUF · 0 PHOTO</div>
        <button type="button" className="empty-board-cta">
          ＋ Première photo
        </button>
      </div>
    </div>
  );
}

export default EmptyBoardCard;
