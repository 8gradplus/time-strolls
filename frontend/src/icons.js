import L from "leaflet";

const getSvgHexagon = (color, size) => {
  const radius = size / 2;
  const center = size / 2;
  const getHexagonPoints = (cx, cy, r) => {
    let points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  };

  return `
  <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${getHexagonPoints(center, center, radius)}" fill="${color}" />
  </svg>
`;
};

export const placeIcon = (color = "yellow", size = 24) => {
  return L.divIcon({
    html: getSvgHexagon(color, size),
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export const currentLocationIcon = (color = "#4285F4", size = 25) => {
  const center = size / 2;
  const haloRadius = size * 0.3125; // ~10 for default 32
  const coreRadius = size * 0.15625; // ~5 for default 32
  const haloColor = color.replace(/^(#\w{6})$/, "rgba(66, 133, 244, 0.3)"); // fallback halo

  return L.divIcon({
    html: `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${center}" cy="${center}" r="${haloRadius}" fill="${haloColor}" />
        <circle cx="${center}" cy="${center}" r="${coreRadius}" fill="${color}" />
      </svg>
    `,
    className: "",
    iconSize: [size, size],
    iconAnchor: [center, center],
  });
};
