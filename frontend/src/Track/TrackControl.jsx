import Box from "@mui/material/Box";
import Button from "../Components/Button";
import { GoogleMaterialIcon } from "../icons";
import { useLanguage } from "../LanguageContext";

const accent = "var(--mui-palette-primary-main)";

// The location button, on its own just above the right end of the dock: a
// tap follows the user,
// a second tap while following goes back to the whole area. "Show the area"
// is also in the menu.
const TrackControl = ({ mode, userInteracted, onModeChange }) => {
  const { t } = useLanguage();
  const following = mode === "follow" && !userInteracted;

  return (
    <Box
      className="dock-float"
      sx={{ position: "absolute", right: -1, bottom: "calc(100% + 8px)" }}
    >
      <Button
        onClick={() => onModeChange(following ? "area" : "follow")}
        label={following ? t.showArea : t.followMe}
      >
        {following ? (
          <GoogleMaterialIcon name="my_location" fill={1} color={accent} />
        ) : (
          <GoogleMaterialIcon name="location_searching" fill={0} />
        )}
      </Button>
    </Box>
  );
};

export default TrackControl;
