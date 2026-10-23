import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { motion, serif } from "../theme";

const SHOW_MS = 1800;

// An area's name and year in one slim line ("Berlin 1928"), shown for a
// moment at the top of the map after flying there. A new toast (new id)
// starts over.
const Toast = ({ toast }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), SHOW_MS);
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
        display: "flex",
        alignItems: "baseline",
        gap: 1,
        px: 1.75,
        py: 0.75,
        bgcolor: "background.paper",
        color: "text.primary",
        border: 1,
        borderColor: "divider",
        borderRadius: 1.5,
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
              fontSize: "1.25rem",
              lineHeight: 1.1,
            }}
          >
            {toast.title}
          </Box>{" "}
          <Box
            sx={{
              fontSize: "0.9rem",
              color: "text.secondary",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {toast.years}
          </Box>
        </>
      )}
    </Box>
  );
};

export default Toast;
