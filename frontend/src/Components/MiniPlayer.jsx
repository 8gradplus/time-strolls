import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import { CloseGlyph } from "../icons";
import { useLanguage } from "../LanguageContext";
import { PlayButton } from "../LocationInfo/Audio";
import { usePlayer } from "../podcast/PlayerContext";
import { formatTime } from "../podcast/positions";
import { serif } from "../theme";

// The story keeps playing while you walk: a pill above the dock, left of the
// location button (Dock.jsx float, .dock-float, so it steps aside while the
// menu is open). The red button pauses, the place name opens the place
// again, a hairline shows how far it is. Paused, a ✕ ends listening; when
// the episode ends the pill goes. Not shown while that place's panel is open,
// and not at all if the episode was paused there before leaving the place:
// that ends listening (the position stays saved for next time).
const MiniPlayer = ({ openSlug, onOpen }) => {
  const player = usePlayer();
  const { t } = useLanguage();
  const { current, playing, loading, time, duration, ended } = player;

  const lastSlug = useRef(openSlug);
  useEffect(() => {
    const left =
      lastSlug.current &&
      lastSlug.current === current?.place.slug &&
      openSlug !== lastSlug.current;
    lastSlug.current = openSlug;
    if (left && !playing) player.stop();
    // Only when another place opens or the panel closes
  }, [openSlug]);

  if (!current || ended || current.place.slug === openSlug) return null;

  const { podcast, place } = current;
  const left = duration ? `−${formatTime(duration - time)}` : "";

  return (
    <Box
      className="dock-float"
      sx={{
        position: "absolute",
        // Level with the location button (TrackControl.jsx), 8 px to its left
        right: 52,
        bottom: 70,
        height: 44,
        maxWidth: "min(320px, calc(100vw - 72px))",
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        pl: "3px",
        pr: playing ? 2 : 0.25,
        boxSizing: "border-box",
        bgcolor: "background.paper",
        color: "text.primary",
        border: 1,
        borderColor: "divider",
        borderRadius: 999,
      }}
    >
      <PlayButton
        size={36}
        playing={playing}
        loading={loading}
        label={`${playing ? t.pause : t.play}: ${podcast.title ?? ""}`}
        onClick={() => player.toggle(podcast, place)}
      />
      <Box
        component="button"
        type="button"
        onClick={() => onOpen(place.slug)}
        sx={{
          minWidth: 0,
          p: 0,
          border: 0,
          bgcolor: "transparent",
          color: "inherit",
          font: "inherit",
          textAlign: "left",
          cursor: "pointer",
          display: "grid",
          lineHeight: 1.2,
          "&:focus-visible": { outline: 2, outlineColor: "primary.main" },
        }}
      >
        {/* Place names are not translated by page translators */}
        <Box
          component="span"
          translate="no"
          className="notranslate"
          sx={{
            fontFamily: serif,
            fontWeight: 600,
            fontSize: "1.05rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {place.name}
        </Box>
        <Box
          component="span"
          sx={{
            fontSize: 11,
            color: "text.secondary",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {playing ? left : [t.paused, left].filter(Boolean).join(" · ")}
        </Box>
      </Box>
      {!playing && (
        <Box
          component="button"
          type="button"
          onClick={player.stop}
          aria-label={t.stopListening}
          sx={{
            width: 36,
            height: 44,
            flex: "none",
            p: 0,
            border: 0,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            bgcolor: "transparent",
            color: "text.secondary",
            cursor: "pointer",
            "&:hover": { color: "text.primary" },
            "&:focus-visible": { outline: 2, outlineColor: "primary.main" },
          }}
        >
          <CloseGlyph size={16} />
        </Box>
      )}
      {/* How far the episode is */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          left: 22,
          right: 22,
          bottom: -1,
          height: 2,
        }}
      >
        <Box
          sx={{ height: "100%", borderRadius: 1, bgcolor: "primary.main" }}
          style={{
            width: `${duration ? Math.min(100, (time / duration) * 100) : 0}%`,
          }}
        />
      </Box>
    </Box>
  );
};

export default MiniPlayer;
