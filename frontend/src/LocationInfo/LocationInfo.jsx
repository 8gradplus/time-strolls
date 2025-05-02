import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import Podcast from "./Audio";
import DisplayImages from "./Images";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import Button from "../Components/Button";
// Todo Propaget id prop to Podcast and Display Images
// They should then talk to an API via the id

// same as menu -> make css

const LocationInfo = (props) => {
  const { open, onClose, id } = props;
  if (id === null || id === undefined) return null;
  return (
    <Drawer open={open} onClose={onClose}>
      <Box sx={{ width: 450 }} role="presentation">
        <Box
          sx={{
            my: 2,
            display: "flex",
            justifyContent: "space-evenly",
            alignItems: "center",
          }}
        >
          <Podcast />
          <Button onClick={onClose}>
            <HighlightOffIcon style={{ fontSize: "24px", color: "#333" }} />
          </Button>
        </Box>
        <Divider sx={{ my: 2 }} />
        <DisplayImages />
      </Box>
    </Drawer>
  );
};

export default LocationInfo;
