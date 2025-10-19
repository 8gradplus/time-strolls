import { useState, useEffect } from "react";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import { FormControlLabel, Switch } from "@mui/material";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import DirectionsWalkRoundedIcon from "@mui/icons-material/DirectionsWalkRounded";
import Button from "./Components/Button";
import { api } from "./api";

// Styling should go to css or theming (tailwind, mui)
const menuButtonStyle = {
  position: "absolute",
  top: "10px",
  right: "10px",
  zIndex: 1000,
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
        borderRadius: "50%", // 👈 makes it a circle
        //boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      }}
    >
      <DirectionsWalkRoundedIcon sx={{ fontSize: 25 }} />
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

          <Box
            sx={{
              width: "85%",
              backgroundColor: "white",
              borderRadius: 3,
              p: 2, // padding
              mx: "auto", // center box
              display: "flex",
              flexDirection: "column", // vertical layout
              gap: 1, // spacing between items
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={itemState.showHistoricMap}
                  onChange={onItemClick("showHistoricMap")}
                />
              }
              label="Luftbild 1945"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={itemState.showMarkers}
                  onChange={onItemClick("showMarkers")}
                />
              }
              label="Show locations"
            />
          </Box>

          <Box
            sx={{
              width: "85%",
              backgroundColor: "white",
              borderRadius: 3,
              p: 2, // padding
              mx: "auto", // center box
              mt: 5,
              display: "flex",
              flexDirection: "column", // vertical layout
              gap: 1, // spacing between items
            }}
          >
            {tours.map((tour) => (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center", // vertically center icon and text
                  gap: 1, // small spacing between icon and text
                }}
              >
                <HikeIcon />
                {tour.name}
                <Switch
                  checked={itemState.tourId === tour.id}
                  onChange={(e) =>
                    onItemClick("tour")(e.target.checked ? tour.id : null)
                  }
                />
              </Box>
            ))}
          </Box>
        </Box>
      </Drawer>
    </div>
  );
};

export default Menu;
