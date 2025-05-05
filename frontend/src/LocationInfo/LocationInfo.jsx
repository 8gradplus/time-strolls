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
      {/* Full width on mobild device */}
      <Box sx={{ width: { xs: "100vw", sm: 450 } }} role="presentation">
        <Box
          sx={{
            paddingBottom: 2,
            paddingTop: 1,
            my: 0,
            backgroundColor: "rgb(219, 226, 190)",
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
              <h1>Unterurasch</h1>
              <Button onClick={onClose} color={"transparent"}>
                <HighlightOffIcon style={{ fontSize: "24px", color: "#333" }} />
              </Button>
            </Box>
            <Podcast />
          </Box>
        </Box>
        <Divider sx={{ mb: 1 }} />
        <DisplayImages />
      </Box>
    </Drawer>
  );
};

export default LocationInfo;
