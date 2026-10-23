import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import { FoldGlyph } from "../icons";
import { LogoDisc } from "./Wordmark";
import { motion } from "../theme";

// One bar at the bottom right, within thumb reach. Its row holds the menu
// button, the time slider, with a mouse − and +, and › at the end, which
// folds the bar. The location button (float, .dock-float) sits on its own
// just above the bar's right end. The menu button opens the bar: the row
// stays where the thumb is and the menu (panel) grows above it into a
// portrait sheet (see below). Only the height animates; the menu's content
// (.dock-fade, --i for the order) fades in a moment later, one section after
// the other. Dragging the handle down closes it. Without a slider (no imagery
// in view) the bar shrinks to the buttons. The ref is for the menu's
// click-away listener.
//
// Folded, the bar gives way to a pill with the year (badge) and the logo in
// the same bottom-right corner, as high as the location button (a circle of
// the same size without a year); the logo sits right under it. The location
// button keeps its place (TrackControl.jsx). Only the pill unfolds it.
// Open, the dock is a portrait sheet: as high as √2 times its width (a sheet
// of paper, like a wall label), as long as the screen leaves room for it and
// some map above. 62 px is the row of controls below the menu. While it is
// open it never gets lower (floor): a short sub-page such as the sources
// keeps the height of a main menu that has outgrown the sheet.
const DOCK_WIDTH = "min(580px, 100vw - 20px)";
const MENU_MAX = "calc(100dvh - 136px - env(safe-area-inset-top))";
const MENU_MIN = `min(calc(${DOCK_WIDTH} * 1.414 - 62px), ${MENU_MAX})`;

const Dock = (props) => {
  const { open, onClose, label, panel, children, ref } = props;
  const { folded, onFold, badge, foldLabel, unfoldLabel, float } = props;
  const handleStart = useRef(null);
  const sheet = useRef(null);
  const [floor, setFloor] = useState(0);

  useEffect(() => {
    if (!open) return;
    setFloor(0);
    const el = sheet.current;
    const observer = new ResizeObserver(() =>
      setFloor((f) => Math.max(f, el.offsetHeight)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  return (
    <Box
      ref={ref}
      sx={{
        position: "absolute",
        right: "calc(10px + env(safe-area-inset-right))",
        bottom: "calc(10px + env(safe-area-inset-bottom))",
        zIndex: 1000,
        width: "min(580px, calc(100% - 20px))",
        // The box itself is only a frame; the hidden bar must not catch taps
        pointerEvents: "none",
        "& > *": { pointerEvents: "auto" },
        "& .dock-float": {
          transition: `opacity 180ms ease, transform 220ms ${motion.open}`,
        },
        ...(open
          ? {
              "& .dock-float": {
                opacity: 0,
                transform: "translateY(6px) scale(0.9)",
                pointerEvents: "none",
              },
            }
          : { "&:not(:has([role=group]))": { width: "auto" } }),
      }}
    >
      <Box
        inert={folded}
        sx={{
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
          color: "text.primary",
          border: 1,
          borderColor: "divider",
          borderRadius: 1.5,
          boxSizing: "border-box",
          transformOrigin: "bottom right",
          ...(folded
            ? {
                opacity: 0,
                transform: "scale(0.92)",
                visibility: "hidden",
                pointerEvents: "none",
                transition: `opacity 140ms ease, transform 200ms ${motion.close}, visibility 0s 200ms`,
              }
            : {
                transition: `opacity 220ms ease 60ms, transform 320ms ${motion.open}`,
              }),
        }}
      >
        <Box
          role="dialog"
          aria-label={label}
          aria-hidden={!open}
          inert={!open}
          sx={{
            display: "grid",
            gridTemplateRows: open ? "1fr" : "0fr",
            transition: open
              ? `grid-template-rows 300ms ${motion.open}`
              : `grid-template-rows 200ms ${motion.close}`,
            "& .dock-fade": open
              ? {
                  opacity: 1,
                  transform: "none",
                  transition: `opacity 200ms ease, transform 300ms ${motion.open}`,
                  transitionDelay: "calc(110ms + var(--i, 0) * 25ms)",
                }
              : {
                  opacity: 0,
                  transform: "translateY(6px)",
                  transition: "opacity 120ms ease, transform 120ms ease",
                },
          }}
        >
          <Box sx={{ minHeight: 0, overflow: "hidden" }}>
            <Box
              ref={sheet}
              sx={{
                display: "flex",
                flexDirection: "column",
                minHeight: `max(${MENU_MIN}, min(${floor}px, ${MENU_MAX}))`,
                maxHeight: MENU_MAX,
                overflowY: "auto",
                overscrollBehavior: "contain",
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Box
                aria-hidden="true"
                onPointerDown={(event) => {
                  handleStart.current = event.clientY;
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerUp={(event) => {
                  if (event.clientY - handleStart.current > 30) onClose();
                  handleStart.current = null;
                }}
                sx={{
                  // A 36 × 4 bar inside a taller area that is easy to grab
                  display: "block",
                  height: 20,
                  mx: "auto",
                  width: 80,
                  cursor: "grab",
                  touchAction: "none",
                  "&::before": {
                    content: '""',
                    display: "block",
                    width: 36,
                    height: 4,
                    mx: "auto",
                    mt: 1,
                    borderRadius: 2,
                    bgcolor: "divider",
                  },
                }}
              />
              {panel}
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            p: 0.5,
            // Every section after the menu button starts with a short hairline
            "& > .dock-section": {
              position: "relative",
              pl: 1,
              "&::before": {
                content: '""',
                position: "absolute",
                left: 0,
                top: "50%",
                height: 28,
                mt: "-14px",
                borderLeft: 1,
                borderColor: "divider",
              },
            },
          }}
        >
          {children}
          {/* Stays in place while the menu is open, so the row doesn't shift */}
          <Box
            className="dock-section"
            sx={{
              "&&": { pl: "2px" },
              transition: "opacity 160ms ease",
              ...(open && { opacity: 0, pointerEvents: "none" }),
            }}
          >
            <Box
              component="button"
              type="button"
              onClick={() => onFold(true)}
              aria-label={foldLabel}
              aria-hidden={open}
              tabIndex={open ? -1 : 0}
              sx={{
                display: "grid",
                placeItems: "center",
                width: 32,
                height: 44,
                p: 0,
                border: 0,
                borderRadius: 1.5,
                bgcolor: "transparent",
                color: "text.secondary",
                cursor: "pointer",
                transition: "color 160ms ease",
                "&:hover": { color: "text.primary" },
                "&:focus-visible": { outline: 2, outlineColor: "primary.main" },
              }}
            >
              <FoldGlyph />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        component="button"
        type="button"
        onClick={() => onFold(false)}
        aria-label={unfoldLabel}
        inert={!folded}
        sx={{
          position: "absolute",
          right: 0,
          bottom: 0,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          // The disc's centre lines up with the location button's (44 / 2)
          pl: badge ? 2 : 0,
          pr: badge ? "6px" : 0,
          width: badge ? "auto" : 44,
          boxSizing: "border-box",
          font: "inherit",
          color: "text.primary",
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: 999,
          cursor: "pointer",
          transformOrigin: "bottom right",
          "&:focus-visible": { outline: 2, outlineColor: "primary.main" },
          ...(folded
            ? {
                transition: `opacity 200ms ease 80ms, transform 300ms ${motion.open}`,
              }
            : {
                opacity: 0,
                transform: "scale(0.8)",
                visibility: "hidden",
                pointerEvents: "none",
                transition: `opacity 120ms ease, transform 160ms ${motion.close}, visibility 0s 160ms`,
              }),
        }}
      >
        {badge && (
          <Box
            component="span"
            sx={{
              fontSize: "0.95rem",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {badge}
          </Box>
        )}
        <LogoDisc size="30px" />
      </Box>

      {float}
    </Box>
  );
};

export default Dock;
