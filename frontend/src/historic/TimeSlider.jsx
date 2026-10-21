import { useRef } from "react";
import Box from "@mui/material/Box";
import { useLanguage } from "../LanguageContext";

// Stops sit between 8% and 92% of the track, so the end labels stay inside.
const stopPosition = (index, count) =>
  count === 1 ? 50 : 8 + (index / (count - 1)) * 84;

// One row in the dock: the aerial years in view as stops on a line, and
// "off" as the last stop, which switches the imagery off. Only years are
// shown, no months; the sources are in the map attribution. Enhanced or
// AI-generated imagery is flagged above the line.
const TimeSlider = ({ years, times, year, onChange }) => {
  const { t } = useLanguage();
  const trackRef = useRef(null);
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

  // Dragging along the line snaps to the nearest stop
  const pick = (event) => {
    const rect = trackRef.current.getBoundingClientRect();
    const percent = ((event.clientX - rect.left) / rect.width) * 100;
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
        sx={{
          position: "relative",
          height: 48, // the line is the vertical centre, level with the menu button
          touchAction: "none",
          cursor: "pointer",
          "&::before": {
            content: '""',
            position: "absolute",
            left: 8,
            right: 8,
            top: 23,
            height: 2,
            bgcolor: "divider",
          },
        }}
      >
        {stops.map((y, i) => {
          const selected = y === (year || null);
          return (
            <Box
              key={y ?? "off"}
              component="button"
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(y)}
              sx={{
                all: "unset",
                position: "absolute",
                top: 2,
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
                  top: selected ? 14 : 16,
                  width: selected ? 16 : 12,
                  height: selected ? 16 : 12,
                  ml: selected ? "-8px" : "-6px",
                  borderRadius: "50%",
                  boxSizing: "border-box",
                  bgcolor: selected ? "primary.main" : "background.paper",
                  border: 2,
                  borderColor: selected ? "primary.main" : "text.secondary",
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
                  fontWeight: selected ? 600 : 400,
                  color: selected ? "text.primary" : "text.secondary",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {y ?? t.off}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default TimeSlider;
