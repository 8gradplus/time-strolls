import { useState, useEffect } from "react";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import MapIcon from "@mui/icons-material/Map";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import DirectionsWalkRoundedIcon from "@mui/icons-material/DirectionsWalkRounded";
import Button from "./Components/Button";
import { api } from "./api";
import { Radio } from "@mui/material";
import LocationPinIcon from "@mui/icons-material/LocationPin";

// Styling should go to css or theming (tailwind, mui)
const menuButtonStyle = {
  position: "absolute",
  top: "10px",
  right: "10px",
  zIndex: 1000,
};

const sectionBoxStyle = {
  width: "85%",
  backgroundColor: "white",
  borderRadius: 3,
  mt: 3,
  p: 2, // padding
  mx: "auto", // center box
  display: "flex",
  flexDirection: "column", // vertical layout
  gap: 1, // spacing between items
};

const IconBorder = ({ children }) => {
  return (
    <Box
      sx={{
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
        color: "black",
        borderRadius: 2,
        border: "2px solid black",
      }}
    >
      {children}
    </Box>
  );
};

const HikeIcon = () => {
  return (
    <Box
      sx={{
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgb(219, 226, 190)",
        color: "gray",
        borderRadius: "50%", // Circle
      }}
    >
      <DirectionsWalkRoundedIcon sx={{ fontSize: 25 }} />
    </Box>
  );
};

const ClickableBox = ({ checked, onClick, children }) => {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        cursor: "pointer",
        paddingLeft: 1,
        borderRadius: 2,
        bgcolor: checked ? "grey.200" : "transparent",
        "&:hover": {
          bgcolor: "grey.100",
        },
      }}
    >
      {children}
    </Box>
  );
};

const Menu = (props) => {
  const { onItemClick, itemState } = props;
  const [open, setOpen] = useState(false);
  const [tours, setTours] = useState([]);

  const handleOpen = (open) => () => {
    setOpen(open);
  };

  useEffect(() => {
    fetch(api.tours)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Track response not ok");
        }
        return res.json();
      })
      .then((data) => setTours(data))
      .catch((error) => console.error("Error fetching track:", error));
  }, []);

  return (
    <div style={menuButtonStyle}>
      <Button onClick={handleOpen(true)}>
        <LayersOutlinedIcon style={{ fontSize: "24px", color: "#333" }} />
      </Button>

      <Drawer onClose={handleOpen(false)} open={open}>
        {/* Full width on mobild device */}
        <Box
          sx={{
            width: { xs: "100vw", sm: 450 },
            height: "100vw",
            backgroundColor: "rgb(219, 226, 190)",
          }}
          role="presentation"
        >
          <Box sx={{ mx: 2, paddingBottom: 2, paddingTop: 1, my: 0 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h1>Menu</h1>
              <Button onClick={handleOpen(false)} color={"transparent"}>
                <HighlightOffIcon style={{ fontSize: "24px", color: "#333" }} />
              </Button>
            </Box>
          </Box>

          {/* Layer menu */}
          <Box sx={sectionBoxStyle}>
            <ClickableBox
              checked={itemState.showHistoricMap}
              onClick={onItemClick("showHistoricMap")}
            >
              <IconBorder>
                <MapIcon sx={{ fontSize: 25 }} />
              </IconBorder>
              <Box sx={{ flexGrow: 1 }}>{"Show Map 1945"}</Box>
              <Radio checked={itemState.showHistoricMap} />
            </ClickableBox>

            <ClickableBox
              checked={itemState.showMarkers}
              onClick={onItemClick("showMarkers")}
            >
              <IconBorder>
                <LocationPinIcon sx={{ fontSize: 25 }} />
              </IconBorder>
              <Box sx={{ flexGrow: 1 }}>{"Show locations"}</Box>
              <Radio checked={itemState.showMarkers} />
            </ClickableBox>
          </Box>

          {/* Tours */}
          <Box sx={sectionBoxStyle}>
            {tours.map((tour) => (
              <ClickableBox
                key={tour.id}
                checked={itemState.tourId === tour.id}
                onClick={() =>
                  onItemClick("tour")(
                    itemState.tourId === tour.id ? null : tour.id,
                  )
                }
              >
                <HikeIcon />
                <Box sx={{ flexGrow: 1 }}>{tour.name}</Box>
                <Radio checked={itemState.tourId === tour.id} />
              </ClickableBox>
            ))}
          </Box>
        </Box>
      </Drawer>
    </div>
  );
};

export default Menu;
