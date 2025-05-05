import L from "leaflet";

export const placeIcon = (color = "gray", haloColor = "yellow", size = 30) => {
  const center = size / 2;
  const outerRadius = size * 0.46875;
  const haloRadius = size * 0.32; // ~10 for default 32
  const coreRadius = size * 0.11; // ~5 for default 32

  return L.divIcon({
    html: `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${center}" cy="${center}" r="${outerRadius}" fill="${color}" stroke="black" stroke-width="0.2" />
        <circle cx="${center}" cy="${center}" r="${haloRadius}" fill="${haloColor}" />
        <circle cx="${center}" cy="${center}" r="${coreRadius}" fill="${color}" />
      </svg>
    `,
    className: "",
    iconSize: [size, size],
    iconAnchor: [center, center],
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
