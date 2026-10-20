import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Podcast from "./Audio";
import DisplayImages from "./Images";
import Sheet from "../Components/Sheet";
import { api } from "../api";

// "1910 – 1965" from the image years, or null
const yearRange = (images) => {
  const years = images.map((img) => img.year).filter(Boolean);
  if (years.length === 0) return null;
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? `${min}` : `${min} – ${max}`;
};

const LocationInfo = (props) => {
  const { open, onClose, slug } = props;
  const [locationInfo, setLocationInfo] = useState(null);

  useEffect(() => {
    if (!slug) return;

    fetch(api.locationInfo(slug))
      .then((res) => {
        if (!res.ok) {
          throw new Error("Places response not ok");
        }
        return res.json();
      })
      .then((data) => setLocationInfo(data))
      .catch((error) => console.error("Error fetching places:", error));
  }, [slug]);

  // Until the new slug has loaded, don't show the previous place
  const info = locationInfo?.place.slug === slug ? locationInfo : null;
  const years = info && yearRange(info.images);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      loading={!info}
      header={
        info && (
          <>
            <Typography variant="h1">{info.place.name}</Typography>
            {years && (
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {years}
              </Typography>
            )}
          </>
        )
      }
    >
      {info && (
        <Box sx={{ py: 2 }}>
          <Podcast podcast={info.podcast} />
          <DisplayImages images={info.images} />
        </Box>
      )}
    </Sheet>
  );
};

export default LocationInfo;
