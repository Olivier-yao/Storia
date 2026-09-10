import { appDataDir, join } from "@tauri-apps/api/path";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { CategoryCardData } from "../components/CategoryCard";
import type { BoardData } from "./boardData";
import type { Story } from "./storyTypes";

const FILE_NAME = "storia-state.json";
const CURRENT_VERSION = 1;

export interface PersistedState {
  version: 1;
  customCategories: CategoryCardData[];
  boards: Record<string, BoardData>;
  stories: Record<string, Story>;
}

async function filePath() {
  const dir = await appDataDir();
  return join(dir, FILE_NAME);
}

export async function loadState(): Promise<PersistedState | null> {
  try {
    const path = await filePath();
    if (!(await exists(path))) return null;
    const raw = await readTextFile(path);
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CURRENT_VERSION) return null;
    return parsed as PersistedState;
  } catch (err) {
    console.error("Storia : échec de lecture de la sauvegarde locale", err);
    return null;
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  try {
    const dir = await appDataDir();
    await mkdir(dir, { recursive: true });
    const path = await join(dir, FILE_NAME);
    await writeTextFile(path, JSON.stringify(state));
  } catch (err) {
    console.error("Storia : échec de sauvegarde locale", err);
  }
}
