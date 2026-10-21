import Box from "@mui/material/Box";
import Button from "../Components/Button";
import { Icon } from "../icons";
import { useLanguage } from "../LanguageContext";

const accent = "var(--mui-palette-primary-main)";

// The location button, on its own just above the right end of the dock. A
// tap follows the user, a second tap goes back to the whole area. Three
// states: idle (outline), searching for the position (a slow pulse) and
// following (filled, red). It fades out while the menu is open and stays
// put when the dock folds (Dock.jsx).
const TrackControl = ({
  mode,
  userInteracted,
  position,
  failed,
  onModeChange,
}) => {
  const { t } = useLanguage();
  const following = mode === "follow" && !userInteracted;
  const state =
    !following || failed ? "idle" : position ? "following" : "searching";

  return (
    <Box
      className="dock-float"
      data-state={state}
      sx={{
        position: "absolute",
        right: 0,
        // 8 px above the dock's row (62 px with the time line); fixed, so it
        // stays put when the dock folds into the lower pill
        bottom: 70,
        "@keyframes seek": { "50%": { opacity: 0.35 } },
        "&[data-state=searching] .icon": {
          animation: "seek 1.4s ease-in-out infinite",
        },
      }}
    >
      <Button
        onClick={() => onModeChange(following ? "area" : "follow")}
        label={following ? t.showArea : t.followMe}
      >
        {state === "following" ? (
          <Icon name="my_location" filled color={accent} />
        ) : (
          <Icon name="location_searching" />
        )}
      </Button>
    </Box>
  );
};

export default TrackControl;
