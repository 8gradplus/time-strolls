import { useRef } from "react";
import Box from "@mui/material/Box";
import { useLanguage } from "../LanguageContext";

// Stops sit between 8% and 92% of the track, so the end labels stay inside.
const stopPosition = (index, count) =>
  count === 1 ? 50 : 8 + (index / (count - 1)) * 84;

// The aerial years in view as stops on a timeline at the bottom of the map,
// plus an "Off" button at the end that removes the imagery. Above the line:
// the sources of the chosen year. Only years are shown, no months.
const TimeSlider = ({ years, times, year, onChange }) => {
  const { t } = useLanguage();
  const trackRef = useRef(null);
  if (!times || (years.length === 0 && !year)) return null;

  const time = year && times[year];
  const flags = time
    ? [
        time.layers.some((l) => l.enhanced) && t.enhanced,
        time.layers.some((l) => l.ai_generated) && t.aiGenerated,
      ].filter(Boolean)
    : [];

  // Dragging along the line snaps to the nearest year
  const pick = (event) => {
    const rect = trackRef.current.getBoundingClientRect();
    const percent = ((event.clientX - rect.left) / rect.width) * 100;
    let nearest = 0;
    years.forEach((_, i) => {
      const distance = Math.abs(stopPosition(i, years.length) - percent);
      if (distance < Math.abs(stopPosition(nearest, years.length) - percent)) {
        nearest = i;
      }
    });
    if (years[nearest] !== year) onChange(years[nearest]);
  };

  return (
    <Box
      role="group"
      aria-label={t.timeTravel}
      sx={{
        position: "absolute",
        left: 10,
        right: 10,
        bottom: 28,
        mx: "auto",
        maxWidth: 460,
        zIndex: 1000,
        px: 1.75,
        pt: 1.25,
        pb: 0.5,
        bgcolor: "background.paper",
        color: "text.primary",
        border: 1,
        borderColor: "divider",
        borderRadius: 1.5,
      }}
    >
      {/* The year is on the line already; above it only the sources */}
      <Box
        sx={{
          minHeight: 20,
          fontSize: 13,
          color: flags.length ? "warning.main" : "text.secondary",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {time
          ? [...flags, ...time.layers.map((l) => l.title)].join(" · ")
          : years.length === 0
            ? t.noImageryInView
            : t.imageryOff}
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
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
            flex: 1,
            minWidth: 0,
            height: 48,
            touchAction: "none",
            cursor: "pointer",
            "&::before": {
              content: '""',
              position: "absolute",
              left: 8,
              right: 8,
              top: 16,
              height: 2,
              bgcolor: "divider",
            },
          }}
        >
          {years.map((y, i) => {
            const selected = y === year;
            return (
              <Box
                key={y}
                component="button"
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(y)}
                sx={{
                  all: "unset",
                  position: "absolute",
                  top: 0,
                  left: `${stopPosition(i, years.length)}%`,
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
                    top: selected ? 9 : 11,
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
                    top: 28,
                    transform: "translateX(-50%)",
                    fontSize: 12,
                    fontWeight: selected ? 600 : 400,
                    color: selected ? "text.primary" : "text.secondary",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {y}
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box
          component="button"
          type="button"
          aria-pressed={!year}
          onClick={() => onChange(null)}
          sx={{
            flex: "none",
            height: 36,
            mt: 0.75,
            px: 1.5,
            border: 1,
            borderColor: year ? "divider" : "primary.main",
            borderRadius: 1,
            bgcolor: year ? "transparent" : "primary.main",
            color: year ? "text.secondary" : "primary.contrastText",
            font: "inherit",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            "&:focus-visible": { outline: 2, outlineColor: "primary.main" },
          }}
        >
          {t.off}
        </Box>
      </Box>
    </Box>
  );
};

export default TimeSlider;
