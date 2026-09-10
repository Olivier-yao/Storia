import type { FrameType } from "../components/PhotoFrame";

export type Transition =
  | "fondu"
  | "glissement"
  | "zoom"
  | "polaroid-retourne"
  | "page-qui-tourne";

export const TRANSITIONS: { id: Transition; label: string }[] = [
  { id: "fondu", label: "Fondu" },
  { id: "glissement", label: "Glissement" },
  { id: "zoom", label: "Zoom" },
  { id: "polaroid-retourne", label: "Polaroïd retourné" },
  { id: "page-qui-tourne", label: "Page qui tourne" },
];

export interface Scene {
  id: string;
  photoIds: string[];
  title: string;
  text: string;
  frameType: FrameType;
  bookTheme: "vintage" | "neon";
  duration: number;
  transition: Transition;
  // Remplace la musique de l'histoire pour cette seule scène ; absent =
  // utilise `Story.musicTrack`.
  musicTrack?: string;
  // URL jouable (objet Blob) si `musicTrack` vient d'un fichier importé —
  // absent pour les pistes de la bibliothèque, qui n'ont pas de son réel.
  // Ne survit pas à un redémarrage de l'application (URL de session).
  musicUrl?: string;
}

export interface Story {
  id: string;
  title: string;
  scenes: Scene[];
  musicTrack: string;
  musicUrl?: string;
  // Sert à retrouver l'histoire la plus récente pour "Reprendre" à l'accueil.
  updatedAt: number;
}

export const MUSIC_LIBRARY = [
  "Summer Rain",
  "Night Bus",
  "Août lent",
  "Papier froissé",
];

export function emptyScene(id: string): Scene {
  return {
    id,
    photoIds: [],
    title: "Nouvelle scène",
    text: "",
    frameType: "polaroid",
    bookTheme: "vintage",
    duration: 4,
    transition: "fondu",
  };
}

export function emptyStory(id: string): Story {
  return {
    id,
    title: "Nouvelle histoire",
    scenes: [emptyScene(`${id}-s1`)],
    musicTrack: MUSIC_LIBRARY[0],
    updatedAt: Date.now(),
  };
}
