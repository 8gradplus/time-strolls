import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import Podcast from "./Audio";
import DisplayImages from "./Images";

const LocationInfo = (props) => {
  const { open, onClose } = props;
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
