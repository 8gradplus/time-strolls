import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import { Icon } from "../icons";
import { useLanguage } from "../LanguageContext";
import { usePlayer } from "../podcast/PlayerContext";
import { serif } from "../theme";
import { CLOSE_UP_ZOOM, isCloseUp, labelTarget } from "./hierarchy";

// Like the one label a gallery hangs beside a work: close up (CLOSE_UP_ZOOM),
// the house, church or chapel nearest the centre of the map gets its name in
// a label above the dock, and a ring on the map. Panning moves it from one
// to the next; while the map follows the GPS position, it names the one you
// pass. When you let go of the map, it glides the last bit so it sits in the
// centre. Returns the place's slug, or null.
export const useWallLabel = (map, locations, enabled) => {
  const [slug, setSlug] = useState(null);
  const current = useRef(null);

  useEffect(() => {
    const houses = enabled && locations ? locations.filter(isCloseUp) : [];
    const show = (next) => {
      if (next === current.current) return;
      current.current = next;
      setSlug(next);
    };
    if (!map || houses.length === 0) {
      show(null);
      return;
    }

    const update = () => {
      if (map.getZoom() < CLOSE_UP_ZOOM) return show(null);
      const centre = map.latLngToContainerPoint(map.getCenter());
      const distances = houses.map((house) => ({
        slug: house.slug,
        d: map
          .latLngToContainerPoint([house.lat, house.lon])
          .distanceTo(centre),
      }));
      show(labelTarget(distances, current.current));
    };
    // After a drag, once Leaflet's glide (inertia) has come to rest
    let dragged = false;
    const drop = () => {
      dragged = true;
    };
    const settle = () => {
      update();
      if (!dragged) return;
      dragged = false;
      const house = houses.find((h) => h.slug === current.current);
      if (!house) return;
      const still = window.matchMedia("(prefers-reduced-motion: reduce)");
      map.panTo([house.lat, house.lon], {
        animate: !still.matches,
        duration: 0.28,
      });
    };

    // Live while you drag, otherwise once a move has ended: changing the
    // ring (a marker's icon) during a zoom animation leaves stale clusters
    update();
    map.on("drag", update);
    map.on("dragend", drop);
    map.on("moveend", settle);
    return () => {
      map.off("drag", update);
      map.off("dragend", drop);
      map.off("moveend", settle);
    };
  }, [map, locations, enabled]);

  return slug;
};

// The label: only the house name (the rest is in its panel), and › to open
// it. Level with the location button like the mini player (MiniPlayer.jsx),
// and above it while a story plays.
const WallLabel = ({ place, openSlug, onOpen }) => {
  const { t } = useLanguage();
  const { current, ended } = usePlayer();
  if (!place) return null;

  const playerShown = current && !ended && current.place.slug !== openSlug;
  const name = place.house_name || place.name;

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
      <Icon name="chevron_right" size={22} />
    </Box>
  );
};

export default WallLabel;
