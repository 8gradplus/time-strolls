import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { motion, serif } from "../theme";

const SHOW_MS = 2400;

// A welcome to an area after flying there: its name and year in one line
// ("Berlin 1928"), large and calm on a translucent surface in the upper part
// of the view; it rises in gently and fades out slowly. A new toast (new id)
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
        top: "calc(12dvh + env(safe-area-inset-top))",
        zIndex: 1000,
        transform: visible
          ? "translate(-50%, 0)"
          : "translate(-50%, 10px) scale(0.98)",
        opacity: visible ? 1 : 0,
        transition: visible
          ? `opacity 420ms ease, transform 520ms ${motion.open}`
          : "opacity 700ms ease, transform 700ms ease",
        pointerEvents: "none",
        px: 3.5,
        py: 1.5,
        bgcolor:
          "color-mix(in srgb, var(--mui-palette-background-paper) 82%, transparent)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        color: "text.primary",
        borderRadius: 2,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.18)",
        whiteSpace: "nowrap",
        fontFamily: serif,
        fontWeight: 600,
        fontSize: "clamp(1.75rem, 6vw, 2.25rem)",
        lineHeight: 1.1,
        letterSpacing: "0.01em",
        "@media (prefers-reduced-motion: reduce)": {
          transform: "translate(-50%, 0)",
          transition: "opacity 300ms ease",
        },
      }}
    >
      {/* Name and year in the same style; page translators leave the name */}
      {toast && (
        <>
          <span translate="no" className="notranslate">
            {toast.title}
          </span>{" "}
          {toast.years}
        </>
      )}
    </Box>
  );
};

export default Toast;
