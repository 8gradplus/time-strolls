// One coordinate as degrees, minutes, seconds: 48.61638 -> 48°36′59″
const dms = (value) => {
  const totalSeconds = Math.round(Math.abs(value) * 3600);
  const degrees = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${degrees}°${pad(minutes)}′${pad(seconds)}″`;
};

// "48°36′59″ N, 14°04′09″ E", as on a museum label
export const formatCoordinates = (lat, lon) =>
  `${dms(lat)} ${lat < 0 ? "S" : "N"}, ${dms(lon)} ${lon < 0 ? "W" : "E"}`;
