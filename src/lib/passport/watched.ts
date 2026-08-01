// Film view state — kept entirely client-side (localStorage) so watched films
// simply retire from the feed without any extra database writes.

const KEY = "bk_films_watched";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Unique key per asset + film so one asset's view doesn't retire another's. */
export const filmKey = (serial: string, filmId: string) => `${serial}:${filmId}`;

export function getWatchedFilms(): string[] {
  return read();
}

export function markFilmWatched(serial: string, filmId: string) {
  if (typeof window === "undefined") return;
  const next = new Set(read());
  next.add(filmKey(serial, filmId));
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function isFilmWatched(serial: string, filmId: string) {
  return read().includes(filmKey(serial, filmId));
}
