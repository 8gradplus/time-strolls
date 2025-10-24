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

export const currentLocationIcon = (color = "#4285F4", size = 32) => {
  const center = size / 2;
  const haloRadius = size * 0.3125;
  const coreRadius = size * 0.15625;
  const haloColor = "rgba(66, 133, 244, 0.25)";

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${center}" cy="${center}" r="${haloRadius}" fill="${haloColor}" />
      <circle cx="${center}" cy="${center}" r="${coreRadius}" fill="${color}" />
    </svg>
  `;

  return L.divIcon({
    html: svg.trim(),
    className: "",
    iconSize: [size, size],
    iconAnchor: [center, center],
  });
};

export const currentLocationIconNavigate = (color = "#4285F4", size = 32) => {
  const center = size / 2;
  const haloRadius = size * 0.3125;
  const coreRadius = size * 0.15625;
  const haloColor = "rgba(66, 133, 244, 0.25)";

  const pointerHeight = size * 0.25;
  const pointerWidth = size * 0.18;

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${center}" cy="${center}" r="${haloRadius}" fill="${haloColor}" />
      <polygon
        points="${center - pointerWidth / 2},${center - haloRadius - 2}
                ${center + pointerWidth / 2},${center - haloRadius - 2}
                ${center},${center - haloRadius - pointerHeight}"
        fill="${color}"
      />
      <circle cx="${center}" cy="${center}" r="${coreRadius}" fill="${color}" />
    </svg>
  `;

  return L.divIcon({
    html: svg.trim(),
    className: "",
    iconSize: [size, size],
    iconAnchor: [center, center],
  });
};
