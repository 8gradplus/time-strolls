import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Podcast from "./Audio";
import DisplayImages from "./Images";
import Sheet from "../Components/Sheet";
import { api } from "../api";
import { useLanguage } from "../LanguageContext";
import { formatCoordinates } from "./coordinates";

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
  const [failedSlug, setFailedSlug] = useState(null);
  const { t } = useLanguage();

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
      .catch((error) => {
        console.error("Error fetching place:", error);
        setFailedSlug(slug);
      });
  }, [slug]);

  // Until the new slug has loaded, don't show the previous place
  const info = locationInfo?.place.slug === slug ? locationInfo : null;
  const years = info && yearRange(info.images);
  const failed = !info && failedSlug === slug;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      loading={!info && !failed}
      header={
        info && (
          // Like a museum wall label: where, what, when
          <>
            <Typography
              variant="overline"
              component="p"
              color="text.secondary"
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatCoordinates(info.place.lat, info.place.lon)}
            </Typography>
            <Typography variant="h1">{info.place.name}</Typography>
            {years && (
              <Typography
                color="text.secondary"
                sx={{ mt: 0.5, fontVariantNumeric: "tabular-nums" }}
              >
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
      {failed && (
        <Typography color="text.secondary" sx={{ px: 2.5, py: 3 }}>
          {t.placeFailed}
        </Typography>
      )}
    </Sheet>
  );
};

export default LocationInfo;
