import type { CSSProperties } from "react";
import EmptyBoardCard from "./EmptyBoardCard";
import "./CategoryCard.css";

export type Ambiance =
  | "famille"
  | "amoureux"
  | "amis"
  | "rencontres"
  | "neutre"
  | "corail"
  | "lavande"
  | "petrole"
  | "sauge"
  | "bordeaux";

export interface CardPhoto {
  top: number;
  left: number;
  width: number;
  height: number;
  rotation: number;
  tint: string;
  radius?: number;
}

export interface CardNote {
  top: number;
  left: number;
  width?: number;
  rotation: number;
  font: string;
  size: number;
  color: string;
  text: string;
  background?: string;
  padding?: string;
}

export interface CategoryCardData {
  boardId: string;
  ambiance: Ambiance;
  name: string;
  meta: string;
  // Nombre réel de photos du tableau (distinct des vignettes décoratives
  // de la carte) — sert à calculer le total de l'accueil.
  photoCount: number;
  photos: CardPhoto[];
  notes: CardNote[];
  heart?: { top: number; left: number; size: number };
  sparkles?: { top: number; left: number }[];
}

function pct(v: number) {
  return `${v}%`;
}

function CategoryCard({
  data,
  onOpen,
  featured = false,
}: {
  data: CategoryCardData;
  onOpen: () => void;
  featured?: boolean;
}) {
  const { ambiance, name, meta, photos, notes, heart, sparkles, photoCount } =
    data;

  // L'état vide se décide sur le nombre réel de photos du tableau, pas sur
  // les vignettes décoratives de la carte (les catégories statiques ont des
  // vignettes mais une catégorie perso nouvellement remplie n'en a pas).
  if (photoCount === 0) {
    return (
      <EmptyBoardCard ambiance={ambiance} name={name} onFirstPhoto={onOpen} />
    );
  }

  return (
    <div
      className={`category-card ambiance-${ambiance}${featured ? " is-featured" : ""}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
    >
      {featured && (
        <span className="category-card-featured-badge">LE PLUS VISITÉ</span>
      )}
      <div className="category-card-scene">
        {photos.map((photo, i) => (
          <div
            key={i}
            className="category-card-photo"
            style={
              {
                top: pct(photo.top),
                left: pct(photo.left),
                width: pct(photo.width),
                height: pct(photo.height),
                transform: `rotate(${photo.rotation}deg)`,
                background: photo.tint,
                borderRadius: photo.radius ?? 3,
              } as CSSProperties
            }
          />
        ))}
        {heart && (
          <div
            className="category-card-heart"
            style={
              {
                top: pct(heart.top),
                left: pct(heart.left),
                width: heart.size,
                height: heart.size,
              } as CSSProperties
            }
          />
        )}
        {sparkles?.map((s, i) => (
          <span
            key={i}
            className="category-card-sparkle"
            style={{ top: pct(s.top), left: pct(s.left) }}
          />
        ))}
        {notes.map((note, i) => (
          <span
            key={i}
            className="category-card-note"
            style={
              {
                top: pct(note.top),
                left: pct(note.left),
                width: note.width ? pct(note.width) : undefined,
                transform: `rotate(${note.rotation}deg)`,
                fontFamily: note.font,
                fontSize: note.size,
                color: note.color,
                background: note.background,
                padding: note.padding,
              } as CSSProperties
            }
          >
            {note.text}
          </span>
        ))}
      </div>

      <div className="category-card-scrim">
        <div className="category-card-name">{name}</div>
        <div className="category-card-meta">
          <span>{meta}</span>
        </div>
      </div>
    </div>
  );
}

export default CategoryCard;
