// Where a place is: a click on the map or dragging the pin sets it, or
// coordinates pasted as "48.6090, 14.0562" (as Google Maps copies them).
// The places nearby are drawn as small grey dots with their names on hover,
// so a place isn't added twice. The map is the app's light grey base map.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { placeIcon } from "../../icons";
import { useLanguage } from "../../LanguageContext";
import { searchPlaces } from "../api";

// Deutsch Reichenau, where most places are
const HOME = { lat: 48.6195, lon: 14.0835 };
const NEARBY_M = 600;

// the app's own mark, as the open place
const pin = placeIcon("dot", true);

// "48.6090, 14.0562", "48.6090 14.0562" or "48,6090; 14,0562"
export const parsePoint = (text) => {
  const numbers = text.match(/-?\d+(?:[.,]\d+)?/g);
  if (!numbers || numbers.length !== 2) return null;
  const [lat, lon] = numbers.map((n) => Number(n.replace(",", ".")));
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
};

const round = (n) => Math.round(n * 1e6) / 1e6;

// A click sets the point; from far out it also zooms in, to place it well
const Clicks = ({ onPick }) => {
  const map = useMapEvents({
    click: (e) => {
      onPick({ lat: round(e.latlng.lat), lon: round(e.latlng.lng) });
      if (map.getZoom() < 16) map.setView(e.latlng, 17);
    },
  });
  return null;
};

// Keeps a typed or pasted point in view
const Follow = ({ point }) => {
  const map = useMap();
  useEffect(() => {
    if (point && !map.getBounds().contains([point.lat, point.lon]))
      map.setView([point.lat, point.lon], Math.max(map.getZoom(), 16));
  }, [map, point]);
  return null;
};

const MapPicker = ({ value, onChange, ignore }) => {
  const { t } = useLanguage();
  const [typed, setTyped] = useState("");
  const [nearby, setNearby] = useState([]);
  const start = useRef(value ?? HOME);

  useEffect(() => {
    if (!value) return;
    let cancelled = false;
    searchPlaces({ lat: value.lat, lon: value.lon, limit: 40 })
      .then(
        (found) =>
          !cancelled &&
          setNearby(
            found.filter(
              (p) => p.id !== ignore && (p.distance_m ?? 0) <= NEARBY_M,
            ),
          ),
      )
      .catch(() => !cancelled && setNearby([]));
    return () => {
      cancelled = true;
    };
  }, [value, ignore]);

  const handlers = useMemo(
    () => ({
      dragend: (e) => {
        const { lat, lng } = e.target.getLatLng();
        onChange({ lat: round(lat), lon: round(lng) });
      },
    }),
    [onChange],
  );

  return (
    <Box>
      <Box
        data-mui-color-scheme="light"
        sx={{ height: { xs: 280, sm: 360 }, border: 1, borderColor: "divider" }}
      >
        <MapContainer
          center={[start.current.lat, start.current.lon]}
          zoom={value ? 17 : 14}
          maxZoom={20}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            className="base-map"
            url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxNativeZoom={18}
            maxZoom={20}
          />
          <Clicks onPick={onChange} />
          <Follow point={value} />
          {nearby.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lon]}
              radius={5}
              pathOptions={{ color: "#555", weight: 1, fillOpacity: 0.4 }}
            >
              <Tooltip>{p.name}</Tooltip>
            </CircleMarker>
          ))}
          {value && (
            <Marker
              position={[value.lat, value.lon]}
              icon={pin}
              draggable
              eventHandlers={handlers}
            />
          )}
        </MapContainer>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2,
          mt: 1,
        }}
      >
        <TextField
          size="small"
          label={t.admin.coordinates}
          placeholder="48.6090, 14.0562"
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            const point = parsePoint(e.target.value);
            if (point) onChange(point);
          }}
          sx={{ width: { xs: "100%", sm: 240 } }}
        />
        <Box sx={{ fontSize: 14, color: "text.secondary" }}>
          {value
            ? `${value.lat.toFixed(6)}, ${value.lon.toFixed(6)}`
            : t.admin.pickOnMap}
          {nearby.length > 0 &&
            ` · ${nearby
              .slice(0, 3)
              .map((p) => `${p.name} ${Math.round(p.distance_m)} m`)
              .join(", ")}`}
        </Box>
      </Box>
    </Box>
  );
};

export default MapPicker;
