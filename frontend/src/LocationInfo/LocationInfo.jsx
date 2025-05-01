import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import Podcast from "./Audio";
import DisplayImages from "./Images";

// Todo Propaget id prop to Podcast and Display Images
// They should then talk to an API via the id

const LocationInfo = (props) => {
  const { open, onClose, id } = props;
  if (id === null || id === undefined) return null;
  return (
    <Drawer open={open} onClose={onClose}>
      <Box sx={{ width: 450 }} role="presentation">
        <Box sx={{ my: 2, display: "flex", justifyContent: "center" }}>
          <Podcast />
        </Box>
        <Divider sx={{ my: 2 }} />
        <DisplayImages />
      </Box>
    </Drawer>
  );
};

export default LocationInfo;
