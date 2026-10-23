import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { motion, serif } from "../theme";

const SHOW_MS = 1700;
// Longer with a hint, so there is time to read it
const SHOW_HINT_MS = 3600;

// An area's name and year, shown for a moment at the top of the map after
// flying there, with an optional hint under it. A new toast (new id) starts
// over.
const Toast = ({ toast }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const timer = setTimeout(
      () => setVisible(false),
      toast.hint ? SHOW_HINT_MS : SHOW_MS,
    );
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <Box
      aria-live="polite"
      sx={{
        position: "absolute",
        left: "50%",
        top: "calc(64px + env(safe-area-inset-top))",
        zIndex: 1000,
        transform: visible ? "translate(-50%, 0)" : "translate(-50%, -8px)",
        opacity: visible ? 1 : 0,
        transition: `opacity 240ms ease, transform 240ms ${motion.open}`,
        pointerEvents: "none",
        px: 2,
        pt: 0.75,
        pb: 1,
        bgcolor: "background.paper",
        color: "text.primary",
        border: 1,
        borderColor: "divider",
        borderRadius: 1.5,
        textAlign: "center",
        whiteSpace: "nowrap",
      }}
    >
      {toast && (
        <>
          <Box
            translate="no"
            className="notranslate"
            sx={{
              fontFamily: serif,
              fontWeight: 600,
              fontSize: "1.5rem",
              lineHeight: 1.1,
            }}
          >
            {toast.title}
          </Box>
          <Box
            sx={{
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              color: "text.secondary",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {toast.years}
          </Box>
          {toast.hint && (
            <Box sx={{ mt: 0.5, fontSize: "0.85rem", color: "text.primary" }}>
              {toast.hint}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default Toast;
