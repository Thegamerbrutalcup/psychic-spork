export interface ScoreEntry {
  name: string;
  score: number;
  wins: number;
  date: number;
}

const KEY = "mpk_highscores_v1";
const MAX = 8;

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ScoreEntry[];
    return Array.isArray(arr) ? arr.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function saveScore(entry: ScoreEntry): { list: ScoreEntry[]; rank: number } {
  const list = loadScores();
  list.push(entry);
  list.sort((a, b) => b.score - a.score || b.wins - a.wins || a.date - b.date);
  const trimmed = list.slice(0, MAX);
  const rank = trimmed.indexOf(entry);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore quota errors */
  }
  return { list: trimmed, rank };
}

export function qualifies(score: number): boolean {
  const list = loadScores();
  if (score <= 0) return false;
  if (list.length < MAX) return true;
  return score > list[list.length - 1].score;
}
