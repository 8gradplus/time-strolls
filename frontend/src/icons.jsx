import L from "leaflet";

export const GoogleMaterialIcon = ({
  name, // icon name as given imported in index.css
  color = "currentColor",
  size = 24,
  fill = 0,
  weight = 400,
  style = {},
}) => {
  // use icons from google imported in index.css
  const combinedStyle = {
    color,
    fontSize: size,
    fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
    display: "inline-block",
    verticalAlign: "middle",
    ...style,
  };

  return (
    <span className="material-symbols-outlined" style={combinedStyle}>
      {name}
    </span>
  );
};

// A place is a small scrap of the logo, turned by `rotation` degrees so
// neighbouring places don't look stamped.
export const scrapIcon = (size = 30, rotation = 0) => {
  const center = size / 2;

  return L.divIcon({
    html: `<img src="/logo.svg" alt="" width="${size}" height="${size}" class="place-scrap" style="transform: rotate(${rotation}deg)" />`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [center, center],
  });
};

export const currentLocationIcon = (color = "#4285F4", size = 32) => {
  const center = size / 2;
  const outerRadius = size * 0.33;
  const haloRadius = size * 0.31;
  const coreRadius = size * 0.22;
  const haloColor = "white";

  const svg = `
    <svg class="pulsating-location" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle class="outer" cx="${center}" cy="${center}" r="${outerRadius}" fill="${color}" />
      <circle class="halo" cx="${center}" cy="${center}" r="${haloRadius}" fill="${haloColor}" />
      <circle class="core" cx="${center}" cy="${center}" r="${coreRadius}" fill="${color}" />
    </svg>
  `;

  return L.divIcon({
    html: svg.trim(),
    className: "",
    iconSize: [size, size],
    iconAnchor: [center, center],
  });
};
