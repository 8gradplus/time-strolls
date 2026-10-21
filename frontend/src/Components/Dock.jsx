import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";

// One bar at the bottom right, within thumb reach. Its row holds the menu
// button, the time slider and, with a mouse, − and +; the location button
// (.dock-float) sits on its own just above the bar's right end. The menu
// button opens the bar: it grows upwards and the menu (panel) unfolds under
// the row. Without a slider (no imagery in view) the closed bar shrinks to
// the buttons. The ref is for the menu's click-away listener.
const Dock = ({ open, panel, children, ref }) => (
  <Box
    ref={ref}
    sx={{
      position: "absolute",
      right: "calc(10px + env(safe-area-inset-right))",
      bottom: "calc(10px + env(safe-area-inset-bottom))",
      zIndex: 1000,
      width: "min(580px, calc(100% - 20px))",
      bgcolor: "background.paper",
      color: "text.primary",
      border: 1,
      borderColor: "divider",
      borderRadius: 1.5,
      boxSizing: "border-box",
      ...(open
        ? { "& .dock-float": { display: "none" } }
        : { "&:not(:has([role=group]))": { width: "auto" } }),
    }}
  >
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
    </Box>
    <Collapse in={open} unmountOnExit>
      <Box sx={{ maxHeight: "calc(100dvh - 120px)", overflowY: "auto" }}>
        {panel}
      </Box>
    </Collapse>
  </Box>
);

export default Dock;
