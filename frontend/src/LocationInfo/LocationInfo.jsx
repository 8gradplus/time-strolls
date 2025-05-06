import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import Podcast from "./Audio";
import DisplayImages from "./Images";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import Button from "../Components/Button";
import { useEffect, useState } from "react";
// Todo: We should talk at this place to the API via the id
// => prop 'data' will be redundant!
import { LOCATIONS } from "../testLocations";

// Todo: same as menu -> make css

const LocationInfo = (props) => {
  const { open, onClose, id } = props;

  // simulate api call
  if (!id) return null;
  const location = LOCATIONS.filter((item) => item.id === id)[0];
  console.log("upon enter", location);
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
              <h1>{location.name}</h1>
              <Button onClick={onClose} color={"transparent"}>
                <HighlightOffIcon style={{ fontSize: "24px", color: "#333" }} />
              </Button>
            </Box>
            <Podcast podcast={location.podcast} />
          </Box>
        </Box>
        {/* <Divider sx={{ mb: 1 }} /> */}
        <Box sx={{ backgroundColor: "white", pt: 1 }}>
          <DisplayImages images={location.images} />
        </Box>
      </Box>
    </Drawer>
  );
};

export default LocationInfo;
