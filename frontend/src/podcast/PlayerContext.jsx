import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { positionOf, savePosition } from "./positions";

// One audio element for the whole app, so a story keeps playing when the
// place panel closes or another place opens (MiniPlayer.jsx shows it then).
// current is { podcast, place } with place = { slug, name, image }. The
// position is saved every few seconds and on pause; the phone's lock screen
// and headphone buttons control it through the Media Session API.
const PlayerContext = createContext(null);

export const usePlayer = () => useContext(PlayerContext);

export const SKIP_BACK = 15;
export const SKIP_AHEAD = 30;

const idle = { playing: false, loading: false, time: 0, duration: 0 };

export const PlayerProvider = ({ children }) => {
  const audioRef = useRef(null);
  const currentRef = useRef(null);
  const lastSave = useRef(0);
  const [current, setCurrent] = useState(null);
  const [state, setState] = useState({ ...idle, ended: false });

  const save = useCallback(() => {
    const audio = audioRef.current;
    const url = currentRef.current?.podcast.url;
    if (audio && url) savePosition(url, audio.currentTime, audio.duration);
  }, []);

  const getAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio();
    audio.preload = "metadata";
    const set = (patch) => setState((s) => ({ ...s, ...patch }));
    audio.addEventListener("play", () => set({ playing: true, ended: false }));
    audio.addEventListener("pause", () => {
      set({ playing: false, loading: false });
      save();
    });
    audio.addEventListener("waiting", () => set({ loading: true }));
    audio.addEventListener("playing", () => set({ loading: false }));
    audio.addEventListener("timeupdate", () => {
      set({ time: audio.currentTime });
      if (Date.now() - lastSave.current > 5000) {
        lastSave.current = Date.now();
        save();
      }
    });
    audio.addEventListener("durationchange", () => {
      if (Number.isFinite(audio.duration)) set({ duration: audio.duration });
    });
    audio.addEventListener("ended", () => {
      set({ playing: false, ended: true });
      const url = currentRef.current?.podcast.url;
      if (url) savePosition(url, 0, audio.duration);
    });
    audioRef.current = audio;
    return audio;
  }, [save]);

  // Makes the episode the current one (paused), from startAt or from where
  // it was left
  const load = useCallback(
    (podcast, place, startAt) => {
      const audio = getAudio();
      if (currentRef.current?.podcast.url === podcast.url) return audio;
      save();
      const saved = positionOf(podcast.url);
      const start = startAt ?? saved?.t ?? 0;
      audio.src =
        start > 0 ? `${podcast.url}#t=${Math.floor(start)}` : podcast.url;
      currentRef.current = { podcast, place };
      setCurrent(currentRef.current);
      setState({ ...idle, time: start, duration: saved?.d ?? 0, ended: false });
      return audio;
    },
    [getAudio, save],
  );

  const isCurrent = (podcast) => current?.podcast.url === podcast.url;

  const toggle = useCallback(
    (podcast, place) => {
      const audio = load(podcast, place);
      if (audio.paused) {
        if (audio.ended) audio.currentTime = 0;
        setState((s) => ({ ...s, loading: true }));
        audio
          .play()
          ?.catch?.(() => setState((s) => ({ ...s, loading: false })));
      } else {
        audio.pause();
      }
    },
    [load],
  );

  const seek = useCallback(
    (podcast, place, t) => {
      const same = currentRef.current?.podcast.url === podcast.url;
      const audio = load(podcast, place, t);
      if (same) audio.currentTime = t;
      setState((s) => ({ ...s, time: t, ended: false }));
      savePosition(podcast.url, t, audio.duration);
    },
    [load],
  );

  const skip = useCallback(
    (podcast, place, delta) => {
      const audio = audioRef.current;
      const base =
        audio && currentRef.current?.podcast.url === podcast.url
          ? audio.currentTime
          : (positionOf(podcast.url)?.t ?? 0);
      const length =
        (audio && Number.isFinite(audio.duration) && audio.duration) ||
        positionOf(podcast.url)?.d ||
        Infinity;
      seek(podcast, place, Math.min(length, Math.max(0, base + delta)));
    },
    [seek],
  );

  // Ends listening: the mini player goes away, the position stays saved
  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    currentRef.current = null;
    setCurrent(null);
    setState({ ...idle, ended: false });
  }, []);

  // Lock screen, notification and headphone buttons
  const actions = useRef({});
  actions.current = { toggle, skip, seek };
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    const withCurrent =
      (fn) =>
      (...args) => {
        const c = currentRef.current;
        if (c) fn(c, ...args);
      };
    const handlers = {
      play: withCurrent(
        (c) =>
          audioRef.current?.paused &&
          actions.current.toggle(c.podcast, c.place),
      ),
      pause: () => audioRef.current?.pause(),
      seekbackward: withCurrent((c) =>
        actions.current.skip(c.podcast, c.place, -SKIP_BACK),
      ),
      seekforward: withCurrent((c) =>
        actions.current.skip(c.podcast, c.place, SKIP_AHEAD),
      ),
      seekto: withCurrent((c, details) =>
        actions.current.seek(c.podcast, c.place, details.seekTime),
      ),
    };
    for (const [action, handler] of Object.entries(handlers)) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Not every browser knows every action
      }
    }
  }, []);

  useEffect(() => {
    if (
      !("mediaSession" in navigator) ||
      typeof MediaMetadata === "undefined"
    ) {
      return;
    }
    navigator.mediaSession.metadata = current
      ? new MediaMetadata({
          title: current.podcast.title ?? current.place.name,
          artist: current.podcast.owner ?? "",
          album: current.place.name,
          artwork: current.place.image ? [{ src: current.place.image }] : [],
        })
      : null;
  }, [current]);

  // Save on leaving the page
  useEffect(() => {
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [save]);

  return (
    <PlayerContext.Provider
      value={{ current, ...state, isCurrent, toggle, seek, skip, stop }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
