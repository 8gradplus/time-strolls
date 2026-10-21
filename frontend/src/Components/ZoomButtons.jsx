import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import Button from "./Button";
import { useLanguage } from "../LanguageContext";

// − and + side by side at the right end of the dock. Only with a mouse or
// trackpad; on touch screens people pinch.
const ZoomButtons = ({ map }) => {
  const { t } = useLanguage();
  const touch = useMediaQuery("(hover: none) and (pointer: coarse)");
  if (!map || touch) return null;

  return (
    <Box className="dock-section" sx={{ display: "flex", gap: 0.5 }}>
      <Button onClick={() => map.zoomOut()} label={t.zoomOut} plain>
        <RemoveRoundedIcon />
      </Button>
      <Button onClick={() => map.zoomIn()} label={t.zoomIn} plain>
        <AddRoundedIcon />
      </Button>
    </Box>
  );
};

export default ZoomButtons;
