import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import { useLanguage } from "../LanguageContext";
import { motion } from "../theme";

// Stops sit between 8% and 92% of the track, so the end labels stay inside.
const stopPosition = (index, count) =>
  count === 1 ? 50 : 8 + (index / (count - 1)) * 84;

// One row in the dock: the aerial years in view as stops on a line, and
// "off" as the last stop, which switches the imagery off. Only years are
// shown, no months; the sources are in the menu. The selected year is one red
// dot that slides from stop to stop; while dragging it follows the finger and
// the year under it is selected, on release it snaps. Enhanced or
// AI-generated imagery is flagged above the line.
const TimeSlider = ({ years, times, year, onChange }) => {
  const { t } = useLanguage();
  const trackRef = useRef(null);
  // Where the dot is while the line is pressed (percent), else null
  const [drag, setDrag] = useState(null);
  if (!times || (years.length === 0 && !year)) return null;

  // null is "off": no imagery
  const stops = [...years, null];
  const time = year && times[year];
  const flags = time
    ? [
        time.layers.some((l) => l.enhanced) && t.enhanced,
        time.layers.some((l) => l.ai_generated) && t.aiGenerated,
      ].filter(Boolean)
    : [];

  const selected = stops.indexOf(year || null);
  const first = stopPosition(0, stops.length);
  const last = stopPosition(stops.length - 1, stops.length);

  // Dragging along the line selects the nearest stop
  const pick = (event) => {
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.min(
      last,
      Math.max(first, ((event.clientX - rect.left) / rect.width) * 100),
    );
    setDrag(percent);
    let nearest = 0;
    stops.forEach((_, i) => {
      const distance = Math.abs(stopPosition(i, stops.length) - percent);
      if (distance < Math.abs(stopPosition(nearest, stops.length) - percent)) {
        nearest = i;
      }
    });
    if (stops[nearest] !== (year || null)) onChange(stops[nearest]);
  };

  return (
    <Box
      role="group"
      aria-label={t.timeTravel}
      className="dock-section"
      sx={{ flex: 1, minWidth: 0, px: 0.5 }}
    >
      {flags.length > 0 && (
        <Box sx={{ pt: 0.5, fontSize: 12, color: "warning.main" }}>
          {flags.join(" · ")}
        </Box>
      )}

      <Box
        ref={trackRef}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pick(event);
        }}
        onPointerMove={(event) => {
          // Only while pressed, in case a capture outlives its pointerup
          if (
            event.buttons !== 0 &&
            event.currentTarget.hasPointerCapture(event.pointerId)
          ) {
            pick(event);
          }
        }}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
        onLostPointerCapture={() => setDrag(null)}
        sx={{
          position: "relative",
          // The line is the vertical centre, level with the menu button; the years
          // below it keep a little air to the dock's edge
          height: 52,
          touchAction: "none",
          cursor: "pointer",
          "&::before": {
            content: '""',
            position: "absolute",
            left: 8,
            right: 8,
            top: 25,
            height: 2,
            bgcolor: "divider",
          },
        }}
      >
        {stops.map((y, i) => {
          const pressed = i === selected;
          return (
            <Box
              key={y ?? "off"}
              component="button"
              type="button"
              aria-pressed={pressed}
              onClick={() => onChange(y)}
              sx={{
                all: "unset",
                position: "absolute",
                top: 4,
                left: `${stopPosition(i, stops.length)}%`,
                width: 44,
                height: 44,
                ml: "-22px",
                cursor: "pointer",
                "&:focus-visible": {
                  outline: 2,
                  outlineColor: "primary.main",
                },
              }}
            >
              <Box
                component="i"
                sx={{
                  position: "absolute",
                  left: "50%",
                  top: 16,
                  width: 12,
                  height: 12,
                  ml: "-6px",
                  borderRadius: "50%",
                  boxSizing: "border-box",
                  bgcolor: "background.paper",
                  border: 1.5,
                  borderColor: "text.secondary",
                }}
              />
              <Box
                component="span"
                sx={{
                  position: "absolute",
                  left: "50%",
                  top: 30,
                  transform: "translateX(-50%)",
                  fontSize: 12,
                  fontWeight: pressed ? 600 : 400,
                  color: pressed ? "text.primary" : "text.secondary",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                  transition: "color 200ms ease",
                }}
              >
                {y ?? t.off}
              </Box>
            </Box>
          );
        })}

        {/* The selected year: red; "off": hollow */}
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            top: 16,
            left: `${drag ?? stopPosition(selected, stops.length)}%`,
            width: 16,
            height: 16,
            ml: "-8px",
            borderRadius: "50%",
            boxSizing: "border-box",
            pointerEvents: "none",
            transition:
              drag === null
                ? `left 260ms ${motion.open}, background-color 200ms ease`
                : "none",
            ...(year
              ? { bgcolor: "primary.main" }
              : { bgcolor: "background.paper", border: 1.5 }),
          }}
        />
      </Box>
    </Box>
  );
};

export default TimeSlider;
