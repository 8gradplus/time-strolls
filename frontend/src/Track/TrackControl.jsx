import Button from "../Components/Button";
import { GoogleMaterialIcon } from "../icons";

const buttonStyle = (top = "100px") => {
  return {
    position: "absolute",
    top: top,
    right: "10px",
    zIndex: 1000,
  };
};

const handleTrackingIcons = (mode, userInteracted) => {
  if (mode === "follow" && userInteracted === false) {
    return <GoogleMaterialIcon name="my_location" fill={1} />;
  }
  return (
    <GoogleMaterialIcon name="location_searching" fill={0} color={"black"} />
  );
};

const handleAreaIcons = (mode, userInteracted) => {
  if (mode === "area" && userInteracted === false) {
    return <GoogleMaterialIcon name="map" fill={0} />;
  }
  return <GoogleMaterialIcon name="map" fill={0} color={"black"} />;
};

const TrackControl = (props) => {
  const { mode, onModeChange, userInteracted, onRecenterRequest } = props;

  const handleClick = (mode) => () => {
    onRecenterRequest();
    onModeChange(mode);
  };

  return (
    <>
      <div style={buttonStyle("55px")}>
        <Button onClick={handleClick("area")}>
          {handleAreaIcons(mode, userInteracted)}
        </Button>
      </div>
      <div style={buttonStyle("100px")}>
        <Button onClick={handleClick("follow")}>
          {handleTrackingIcons(mode, userInteracted)}
        </Button>
      </div>
    </>
  );
};

export default TrackControl;
