import Button from "../Components/Button";
import { GoogleMaterialIcon } from "../icons";

const modes = ["none", "follow", "navigate"];

const trackButtonStyle = {
  position: "absolute",
  top: "55px",
  right: "10px",
  zIndex: 1000,
};

const modeIcons = {
  none: <GoogleMaterialIcon name={"map"} fill={0} />,
  follow: <GoogleMaterialIcon name={"my_location"} fill={1} />,
  navigate: <GoogleMaterialIcon name={"assistant_navigation"} fill={1} />,
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
