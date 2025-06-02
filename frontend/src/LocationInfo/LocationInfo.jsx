import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Podcast from "./Audio";
import DisplayImages from "./Images";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import Button from "../Components/Button";
import { api } from "../api";

// Todo: same as menu -> make css

const LocationInfo = (props) => {
  const { open, onClose, id } = props;
  const [locationInfo, setLocationInfo] = useState(null);

  useEffect(() => {
    fetch(api.locationInfo(id)) // todo: rather use api module
      .then((res) => {
        if (!res.ok) {
          throw new Error("Places response not ok");
        }
        return res.json();
      })
      .then((data) => setLocationInfo(data))
      .catch((error) => console.error("Error fetching places:", error));
  }, [id]);
  console.log("upon enter", locationInfo);
  if (!locationInfo) {
    return (
      <Drawer open={open} onClose={onClose}>
        <Box sx={{ width: { xs: "100vw", sm: 450 }, p: 3 }}>
          <p>Loading...</p>
        </Box>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onClose={onClose}>
      {/* Full width on mobild device */}
      <Box
        sx={{
          width: { xs: "100vw", sm: 450 },
          backgroundColor: "rgb(219, 226, 190)",
        }}
        role="presentation"
      >
        <Box
          sx={{
            paddingBottom: 2,
            paddingTop: 1,
            my: 0,
          }}
        >
          <Box sx={{ mx: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h1>{locationInfo.place.name}</h1>
              <Button onClick={onClose} color={"transparent"}>
                <HighlightOffIcon style={{ fontSize: "24px", color: "#333" }} />
              </Button>
            </Box>
            <Podcast podcast={locationInfo.podcast} />
          </Box>
        </Box>
        {/* <Divider sx={{ mb: 1 }} /> */}
        <Box sx={{ backgroundColor: "white", pt: 1 }}>
          <DisplayImages images={locationInfo.images} />
        </Box>
      </Box>
    </Drawer>
  );
};

export default LocationInfo;
