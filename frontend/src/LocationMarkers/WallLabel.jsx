import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { Icon } from "../icons";
import { useLanguage } from "../LanguageContext";
import { usePlayer } from "../podcast/PlayerContext";
import { serif } from "../theme";
import Pips from "../Components/Pips";
import { CLOSE_UP_ZOOM, hasMore, hoverName } from "./hierarchy";
import { markPositions } from "./position";

// On touch screens, in place of hover (Map.jsx), like the one label a
// gallery hangs beside a work: tapping a house, church or chapel (close up,
// CLOSE_UP_ZOOM) gives it a ring and its name in a label above the dock; a
// tap on the label or on the same mark again opens it. The map doesn't
// move, unless the mark would lie under the label or the dock. The label
// stays while you drag or zoom, and goes when its place leaves the screen,
// below CLOSE_UP_ZOOM, or on a tap on the empty map. Transient, not in the
// URL. Returns [slug or null, select(place), clear()].
export const useWallLabel = (map, locations, enabled) => {
  const [slug, setSlug] = useState(null);
  const place = enabled ? locations?.find((p) => p.slug === slug) : null;

  useEffect(() => {
    if (!map || !place) return;
    const clear = () => setSlug(null);
    const check = () => {
      if (map.getZoom() < CLOSE_UP_ZOOM) return clear();
      const { lat, lon } = markPositions(map, locations, map.getZoom())(place);
      if (!map.getBounds().contains([lat, lon])) clear();
    };
    map.on("moveend", check);
    map.on("click", clear);
    return () => {
      map.off("moveend", check);
      map.off("click", clear);
    };
  }, [map, locations, place]);

  const select = (next) => {
    setSlug(next.slug);
    if (!map) return;
    // Just enough to bring the mark above the label and the dock
    const { lat, lon } = markPositions(map, locations, map.getZoom())(next);
    const { y } = map.latLngToContainerPoint([lat, lon]);
    const clearOf = map.getSize().y - LABEL_BAND;
    if (y > clearOf) {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)");
      map.panBy([0, y - clearOf], { animate: !still.matches, duration: 0.28 });
    }
  };

  return [place ? slug : null, select, () => setSlug(null)];
};

// The strip at the bottom with the dock, the label and the mini player
// (pixels); a tapped mark below it is moved up
const LABEL_BAND = 190;

// The label: only the name as on hover (the rest is in its panel), three
// pips when there is more to see, and › to open it. Level with the location button like the mini player (MiniPlayer.jsx),
// and above it while a story plays.
const WallLabel = ({ place, openSlug, onOpen }) => {
  const { t } = useLanguage();
  const { current, ended } = usePlayer();
  if (!place) return null;

  const playerShown = current && !ended && current.place.slug !== openSlug;
  const name = hoverName(place);

  return (
    <Box
      component="button"
      type="button"
      className="dock-float"
      onClick={() => onOpen(place)}
      aria-label={`${t.open}: ${name}`}
      sx={{
        position: "absolute",
        right: 52,
        bottom: playerShown ? 122 : 70,
        height: 44,
        maxWidth: "min(320px, calc(100vw - 72px))",
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        pl: 2,
        pr: 0.75,
        boxSizing: "border-box",
        bgcolor: "background.paper",
        color: "text.primary",
        border: 1,
        borderColor: "divider",
        borderRadius: 999,
        font: "inherit",
        cursor: "pointer",
        "@media (hover: hover)": {
          "&:hover": { borderColor: "text.secondary" },
        },
      }}
    >
      <Box
        component="span"
        sx={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: serif,
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: "1.3rem",
          lineHeight: 1,
          pb: "2px",
        }}
      >
        {name}
      </Box>
      {hasMore(place) && <Pips sx={{ ml: 0.75 }} />}
      <Icon name="chevron_right" size={22} />
    </Box>
  );
};

export default WallLabel;
