import Button from "../Components/Button";
import { GoogleMaterialIcon } from "../icons";
import { useLanguage } from "../LanguageContext";

const accent = "var(--mui-palette-primary-main)";

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
    return <GoogleMaterialIcon name="my_location" fill={1} color={accent} />;
  }
  return <GoogleMaterialIcon name="location_searching" fill={0} />;
};

const handleAreaIcons = (mode, userInteracted) => {
  if (mode === "area" && userInteracted === false) {
    return <GoogleMaterialIcon name="map" fill={0} color={accent} />;
  }
  return <GoogleMaterialIcon name="map" fill={0} />;
};

const TrackControl = (props) => {
  const { mode, onModeChange, userInteracted, onRecenterRequest } = props;
  const { t } = useLanguage();

  const handleClick = (mode) => () => {
    onRecenterRequest();
    onModeChange(mode);
  };

  return (
    <>
      <div style={buttonStyle("62px")}>
        <Button onClick={handleClick("area")} label={t.showArea}>
          {handleAreaIcons(mode, userInteracted)}
        </Button>
      </div>
      <div style={buttonStyle("114px")}>
        <Button onClick={handleClick("follow")} label={t.followMe}>
          {handleTrackingIcons(mode, userInteracted)}
        </Button>
      </div>
    </>
  );
};

export default TrackControl;
