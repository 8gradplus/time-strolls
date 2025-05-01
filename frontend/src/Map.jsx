import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import { useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { divIcon } from "leaflet";
import { renderToString } from "react-dom/server";
import StarIcon from "@mui/icons-material/Star";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet's default icon path
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const imageFilenames = [
  "full_res_image_1.jpg",
  "full_res_image_2.jpg",
  "full_res_image_3.jpg",
  "full_res_image_4.jpg",
  "full_res_image_5.jpg",
  "full_res_image_6.jpg",

  // add more as needed
];

const createMuiIcon = (MuiIcon, size = 32) => {
  // Render the MUI icon to an HTML string
  const iconHtml = renderToString(<MuiIcon />);
  console.log(iconHtml);
  // Create a div icon with the MUI icon HTML
  return divIcon({
    html: iconHtml,
    className: "mui-leaflet-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
};

const CoordinateMap = () => {
  const center = [48.61017854015886, 14.04406485511563];
  const starIcon = createMuiIcon(StarIcon);
  const [showInfo, setShowInfo] = useState(false);

  const toggleDrawer = (newOpen) => () => {
    setShowInfo(newOpen);
  };

  return (
    <MapContainer
      center={center}
      zoom={16}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution="Timestrolls"
      />
      <TileLayer
        url="/tiles/{z}/{x}/{y}.png"
        attribution="1945"
        noWrap={true}
      />
      <Marker
        position={center}
        icon={starIcon}
        eventHandlers={{
          click: () => {
            setShowInfo(true);
          },
        }}
      />

      <Drawer open={showInfo} onClose={toggleDrawer(false)}>
        <Box
          sx={{ width: 450 }}
          role="presentation"
          onClick={toggleDrawer(false)}
        >
          <Box sx={{ my: 2, display: "flex", justifyContent: "center" }}>
            <audio controls>
              <source src="/audio/test.mp3" type="audio/mpeg" />
            </audio>
          </Box>
          <Divider sx={{ my: 2 }} />

          {imageFilenames.map((filename, idx) => (
            <Box key={idx} sx={{ mb: 1 }}>
              <img
                src={`/images/${filename}`}
                alt={`img-${idx}`}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </Box>
          ))}
        </Box>
      </Drawer>
    </MapContainer>
  );
};

export default CoordinateMap;
