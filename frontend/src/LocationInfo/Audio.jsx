import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import { PlayPauseGlyph, SkipGlyph } from "../icons";
import { useLanguage } from "../LanguageContext";
import { SKIP_AHEAD, SKIP_BACK, usePlayer } from "../podcast/PlayerContext";
import { formatTime, positionOf, savePosition } from "../podcast/positions";
import { motion } from "../theme";

// The red button: ▸ and ❚❚ in one, never faded. While the audio loads a
// thin arc turns around it.
export const PlayButton = ({ playing, loading, label, onClick, size = 48 }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-pressed={playing}
    sx={{
      position: "relative",
      width: size,
      height: size,
      flex: "none",
      p: 0,
      border: 0,
      borderRadius: "50%",
      display: "grid",
      placeItems: "center",
      bgcolor: "primary.main",
      color: "#fff",
      cursor: "pointer",
      transition: "background-color 160ms ease, transform 160ms ease",
      "@media (hover: hover)": { "&:hover": { bgcolor: "primary.dark" } },
      "&:active": { transform: "scale(0.96)" },
      "&:focus-visible": {
        outline: 2,
        outlineColor: "primary.main",
        outlineOffset: 3,
      },
      "& .pp-play, & .pp-pause": {
        transformOrigin: "center",
        transformBox: "fill-box",
        transition: `opacity 160ms ease, transform 220ms ${motion.open}`,
      },
      "& .pp-play": playing ? { opacity: 0, transform: "scale(0.6)" } : {},
      "& .pp-pause": playing ? {} : { opacity: 0, transform: "scale(0.6)" },
      "@keyframes player-spin": { to: { transform: "rotate(360deg)" } },
      "&::after": loading
        ? {
            content: '""',
            position: "absolute",
            inset: -5,
            borderRadius: "50%",
            border: "1.6px solid transparent",
            borderTopColor: "var(--mui-palette-primary-main)",
            animation: "player-spin 900ms linear infinite",
          }
        : {},
    }}
  >
    <PlayPauseGlyph size={Math.round(size * 0.46)} />
  </Box>
);

// The line, like the time line in the dock: a hairline, the part heard in
// red and the red dot as the handle. Dragging shows the new place right away
// and seeks on release; the arrow keys skip.
const Track = ({ time, duration, onSeek, label }) => {
  const ref = useRef(null);
  const [drag, setDrag] = useState(null);
  const shown = drag ?? time;
  const part = duration > 0 ? Math.min(1, shown / duration) : 0;

  const at = (event) => {
    const rect = ref.current.getBoundingClientRect();
    const share = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width),
    );
    return share * duration;
  };

  return (
    <Box
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={formatTime(shown)}
      onPointerDown={(event) => {
        if (!duration) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag(at(event));
      }}
      onPointerMove={(event) => {
        if (drag !== null) setDrag(at(event));
      }}
      onPointerUp={(event) => {
        if (drag === null) return;
        onSeek(at(event));
        setDrag(null);
      }}
      onPointerCancel={() => setDrag(null)}
      onKeyDown={(event) => {
        const delta = { ArrowRight: SKIP_AHEAD, ArrowLeft: -SKIP_BACK }[
          event.key
        ];
        if (!delta || !duration) return;
        event.preventDefault();
        onSeek(Math.min(duration, Math.max(0, time + delta)));
      }}
      sx={{
        // A tall area that is easy to hit, the line in its middle
        position: "relative",
        height: 32,
        cursor: duration ? "pointer" : "default",
        touchAction: "none",
        "&:focus-visible": { outline: 2, outlineColor: "primary.main" },
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          right: 0,
          top: 15,
          height: 2,
          borderRadius: 1,
          bgcolor: "divider",
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 15,
          height: 2,
          borderRadius: 1,
          bgcolor: "primary.main",
        }}
        style={{ width: `${part * 100}%` }}
      />
      <Box
        sx={{
          position: "absolute",
          top: 9,
          width: 14,
          height: 14,
          ml: "-7px",
          borderRadius: "50%",
          bgcolor: "primary.main",
          boxShadow: "0 0 0 3px var(--mui-palette-background-paper)",
          transition: "transform 160ms ease",
          transform: drag !== null ? "scale(1.15)" : "none",
        }}
        style={{ left: `${part * 100}%` }}
      />
    </Box>
  );
};

const Skip = ({ label, onClick, children }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    aria-label={label}
    sx={{
      width: 44,
      height: 44,
      p: 0,
      border: 0,
      borderRadius: "50%",
      display: "grid",
      placeItems: "center",
      bgcolor: "transparent",
      color: "text.primary",
      cursor: "pointer",
      transition: "background-color 160ms ease",
      "@media (hover: hover)": {
        "&:hover": { bgcolor: "background.default" },
      },
      "&:focus-visible": { outline: 2, outlineColor: "primary.main" },
    }}
  >
    {children}
  </Box>
);

const timeSx = {
  fontSize: 12,
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
};

// The length of an episode that hasn't played yet, read from its metadata
// once and kept with the positions
const useLength = (url, known) => {
  const [length, setLength] = useState(known);
  useEffect(() => {
    if (known) return;
    const probe = new Audio();
    probe.preload = "metadata";
    const onMeta = () => {
      if (Number.isFinite(probe.duration)) {
        setLength(probe.duration);
        savePosition(url, positionOf(url)?.t ?? 0, probe.duration);
      }
    };
    probe.addEventListener("loadedmetadata", onMeta);
    probe.src = url;
    return () => {
      probe.removeEventListener("loadedmetadata", onMeta);
      probe.removeAttribute("src");
    };
  }, [url, known]);
  return known || length;
};

// One podcast: the red button with the title and the source, the line
// across the full width, and under it the time heard, 15 s back, 30 s
// ahead and the time left. The episode plays in the app's one player
// (PlayerContext.jsx), so it goes on when the panel closes.
const PodcastRow = ({ podcast, place }) => {
  const player = usePlayer();
  const { t } = useLanguage();
  const current = player.isCurrent(podcast);
  const saved = positionOf(podcast.url);
  const duration = useLength(
    podcast.url,
    current && player.duration ? player.duration : saved?.d,
  );
  const time = current ? player.time : (saved?.t ?? 0);
  const playing = current && player.playing;

  return (
    <Box sx={{ px: 2.5, pt: 1, pb: 0.5 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "48px minmax(0, 1fr)",
          gap: 1.5,
          alignItems: "center",
        }}
      >
        <PlayButton
          playing={playing}
          loading={current && player.loading}
          label={`${playing ? t.pause : t.play}: ${podcast.title ?? ""}`}
          onClick={() => player.toggle(podcast, place)}
        />
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ fontWeight: 500, lineHeight: 1.35 }}>
            {podcast.title || t.listen}
          </Box>
          {podcast.owner && (
            <Box sx={{ fontSize: 13, color: "text.secondary" }}>
              {podcast.owner}
            </Box>
          )}
        </Box>
      </Box>
      <Box sx={{ mt: 1 }}>
        <Track
          time={time}
          duration={duration ?? 0}
          label={t.position}
          onSeek={(to) => player.seek(podcast, place, to)}
        />
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          mt: -0.5,
        }}
      >
        <Box sx={timeSx}>{formatTime(time)}</Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Skip
            label={t.back15}
            onClick={() => player.skip(podcast, place, -SKIP_BACK)}
          >
            <SkipGlyph seconds={SKIP_BACK} back />
          </Skip>
          <Skip
            label={t.ahead30}
            onClick={() => player.skip(podcast, place, SKIP_AHEAD)}
          >
            <SkipGlyph seconds={SKIP_AHEAD} />
          </Skip>
        </Box>
        <Box sx={{ ...timeSx, textAlign: "right" }}>
          {duration ? `−${formatTime(duration - time)}` : ""}
        </Box>
      </Box>
    </Box>
  );
};

// All podcasts of a place; today the API has at most one per place. place is
// { slug, name, image } for the mini player and the lock screen.
const Podcasts = ({ podcasts, place }) =>
  podcasts
    .filter((podcast) => podcast?.url)
    .map((podcast) => (
      <PodcastRow key={podcast.url} podcast={podcast} place={place} />
    ));

export default Podcasts;
