import Button from "../Components/Button";
import ExploreIcon from "@mui/icons-material/Explore";
import NavigationIcon from "@mui/icons-material/Navigation";
import CropIcon from "@mui/icons-material/Crop";

const modes = ["none", "follow", "navigate"];

const trackButtonStyle = {
  position: "absolute",
  top: "55px",
  right: "10px",
  zIndex: 1000,
};

const modeIcons = {
  none: <CropIcon style={{ fontSize: 24, color: "#4285F4" }} />,
  follow: <ExploreIcon style={{ fontSize: 24, color: "#4285F4" }} />,
  navigate: <NavigationIcon style={{ fontSize: 24, color: "#4285F4" }} />,
};

const TrackControl = (props) => {
  //
  const { mode, onModeChange } = props;
  const handleClick = () => {
    const next = modes[(modes.indexOf(mode) + 1) % modes.length];
    onModeChange(next);
  };
  return (
    <div style={trackButtonStyle}>
      <Button onClick={handleClick}>{modeIcons[mode]}</Button>
    </div>
  );
};

export default TrackControl;
