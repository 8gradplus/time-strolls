import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Icon } from "../icons";
import { useLanguage } from "../LanguageContext";

const Half = ({ onClick, label, icon }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    aria-label={label}
    sx={{
      display: "grid",
      placeItems: "center",
      width: 40,
      height: 36,
      p: 0,
      border: 0,
      bgcolor: "transparent",
      color: "text.primary",
      cursor: "pointer",
      transition: "background-color 160ms ease",
      "&:hover": { bgcolor: "background.default" },
      "&:focus-visible": { outline: 2, outlineColor: "primary.main" },
      "& + &": { borderLeft: 1, borderColor: "divider" },
      // A little heavier than the other icons, so they read as buttons
      "& .icon": { fontVariationSettings: '"FILL" 0, "wght" 400' },
    }}
  >
    <Icon name={icon} size={20} />
  </Box>
);

// − and + as one pill in the dock, split by a hairline. Only with a mouse or
// trackpad; on touch screens people pinch.
const ZoomButtons = ({ map }) => {
  const { t } = useLanguage();
  const touch = useMediaQuery("(hover: none) and (pointer: coarse)");
  if (!map || touch) return null;

  return (
    <Box className="dock-section" sx={{ display: "flex", pr: 0.5 }}>
      <Box
        sx={{
          display: "flex",
          border: 1,
          borderColor: "divider",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <Half onClick={() => map.zoomOut()} label={t.zoomOut} icon="remove" />
        <Half onClick={() => map.zoomIn()} label={t.zoomIn} icon="add" />
      </Box>
    </Box>
  );
};

export default ZoomButtons;
