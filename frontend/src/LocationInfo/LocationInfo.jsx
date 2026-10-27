import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Podcasts from "./Audio";
import DisplayImages from "./Images";
import Sheet from "../Components/Sheet";
import { api } from "../api";
import { useLanguage } from "../LanguageContext";
import { formatCoordinates } from "./coordinates";

// Small caps heading with a count, e.g. "HÖREN 1" or "BILDER 70"
const SectionLabel = ({ title, count }) => (
  <Typography
    variant="overline"
    component="h3"
    color="text.secondary"
    sx={{
      display: "flex",
      justifyContent: "space-between",
      px: 2.5,
      pt: 1.5,
      pb: 0.5,
    }}
  >
    <span>{title}</span>
    <span>{count}</span>
  </Typography>
);

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
  // { slug, data }: the slug asked for (the place may answer under its
  // current slug when an earlier one was asked for)
  const [locationInfo, setLocationInfo] = useState(null);
  const [failedSlug, setFailedSlug] = useState(null);
  const { language, t } = useLanguage();

  useEffect(() => {
    if (!slug) return;

    fetch(api.locationInfo(slug, language))
      .then((res) => {
        if (!res.ok) {
          throw new Error("Places response not ok");
        }
        return res.json();
      })
      .then((data) => setLocationInfo({ slug, data }))
      .catch((error) => {
        console.error("Error fetching place:", error);
        setFailedSlug(slug);
      });
  }, [slug, language]);

  // Until the new slug has loaded, don't show the previous place
  const info = locationInfo?.slug === slug ? locationInfo.data : null;
  const years = info && yearRange(info.images);
  const failed = !info && failedSlug === slug;
  const podcasts = info?.podcasts ?? [];

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
        <Box sx={{ pt: 0.5, pb: 2.5 }}>
          {podcasts.length > 0 && (
            <>
              <SectionLabel title={t.audio} count={podcasts.length} />
              <Podcasts
                podcasts={podcasts}
                place={{
                  slug: info.place.slug,
                  name: info.place.name,
                  image: info.images[0]?.url,
                }}
              />
            </>
          )}
          {info.images.length > 0 && (
            <>
              <SectionLabel title={t.photos} count={info.images.length} />
              <DisplayImages images={info.images} />
            </>
          )}
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
