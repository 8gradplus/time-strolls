import Box from "@mui/material/Box";
import { useLanguage } from "../LanguageContext";

// "There's more to see": always three small grey pips in a row, whatever the
// place holds and however much (`hasMore` in LocationMarkers/hierarchy.js).
// In the hover name, the wall label and the village panel's lists.
const Pips = ({ sx }) => {
  const { t } = useLanguage();
  return (
    <Box
      component="span"
      role="img"
      aria-label={t.moreToSee}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        flex: "none",
        verticalAlign: "middle",
        ...sx,
      }}
    >
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          component="span"
          sx={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            bgcolor: "text.secondary",
            opacity: 0.8,
          }}
        />
      ))}
    </Box>
  );
};

export default Pips;
