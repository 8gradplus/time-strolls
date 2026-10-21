// Where each episode was left and how long it is, kept on this device so a
// story resumes where it stopped, even the next day. Keyed by the audio URL.
const STORAGE_KEY = "podcastPositions";

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
};

// { t: seconds listened, d: duration in seconds } or null
export const positionOf = (url) => readAll()[url] ?? null;

export const savePosition = (url, t, d) => {
  const all = readAll();
  const known = all[url] ?? {};
  all[url] = {
    t: Number.isFinite(t) ? Math.floor(t) : (known.t ?? 0),
    d: Number.isFinite(d) && d > 0 ? Math.round(d) : (known.d ?? 0),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Without storage the story starts from the beginning next time
  }
};

// 95 → "1:35", 3700 → "1:01:40"; unknown → "–:––"
export const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "–:––";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};
