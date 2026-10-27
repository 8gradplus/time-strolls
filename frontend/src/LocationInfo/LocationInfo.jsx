import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import Podcasts from "./Audio";
import DisplayImages from "./Images";
import Sheet from "../Components/Sheet";
import { api } from "../api";
import { useLanguage } from "../LanguageContext";
import { formatCoordinates } from "./coordinates";
import { serif } from "../theme";
import { displayName, groupsOf, isHouse } from "../LocationMarkers/hierarchy";

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

// "Haus · verfallen · frühere Nr. 78, 155"; a standing house with today's
// address: "Haus · steht · Pasečná 111"
const factsLine = (place, t) =>
  [
    t.kinds[place.kind],
    place.state && t.states[place.state],
    place.address,
    place.former_number && `${t.formerNumber} ${place.former_number}`,
  ]
    .filter(Boolean)
    .join(" · ");

// One row of a village's list: the house number (or a cross), the name, the
// number of photos
const PlaceRow = ({ place, parent, onOpen, t }) => {
  const house = isHouse(place);
  return (
    <ButtonBase
      onClick={() => onOpen(place)}
      sx={{
        display: "grid",
        gridTemplateColumns: "2.2em minmax(0, 1fr) auto",
        gap: 1.25,
        alignItems: "baseline",
        width: "100%",
        textAlign: "left",
        px: 1.5,
        py: 0.9,
        borderRadius: 1,
        font: "inherit",
        "@media (hover: hover)": {
          "&:hover": { bgcolor: "accentSoft" },
        },
      }}
    >
      <Box
        component="span"
        sx={{
          color: "text.secondary",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {house ? place.number : "✝"}
      </Box>
      <Box component="span">
        {house
          ? place.house_name && (
              <Box
                component="span"
                sx={{
                  fontFamily: serif,
                  fontStyle: "italic",
                  fontSize: "1.15rem",
                }}
              >
                {place.house_name}
              </Box>
            )
          : displayName(place, parent, t)}
        {place.state && (
          <Box
            component="span"
            sx={{ color: "text.secondary", fontSize: "0.85rem", ml: 0.75 }}
          >
            {t.states[place.state]}
          </Box>
        )}
      </Box>
      <Box
        component="span"
        sx={{
          color: "primary.main",
          fontSize: "0.85rem",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {place.images > 0 && `${place.images} ${t.photos}`}
      </Box>
    </ButtonBase>
  );
};

const LocationInfo = (props) => {
  const { open, onClose, onOpen, slug } = props;
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
  const place = info?.place;
  const parent = info?.parent;
  const facts = place && factsLine(place, t);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      loading={!info && !failed}
      header={
        info && (
          // Like a museum wall label: where, what, when
          <>
            {parent && (
              <ButtonBase
                onClick={() => onOpen(parent)}
                aria-label={`${t.backTo} ${parent.name}`}
                sx={{ font: "inherit", color: "primary.main", mb: 0.5 }}
              >
                ‹ {parent.name}
              </ButtonBase>
            )}
            <Typography
              variant="overline"
              component="p"
              color="text.secondary"
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatCoordinates(place.lat, place.lon)}
            </Typography>
            <Typography variant="h1">
              {displayName(place, parent, t)}
            </Typography>
            {place.house_name && (
              <Typography
                sx={{
                  fontFamily: serif,
                  fontStyle: "italic",
                  fontSize: "1.4rem",
                }}
              >
                {place.house_name}
              </Typography>
            )}
            {facts && place.kind !== "village" && (
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {facts}
              </Typography>
            )}
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
                  slug: place.slug,
                  name: displayName(place, parent, t),
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
          {groupsOf(info.children ?? []).map((group) => (
            <Box key={group.key}>
              <SectionLabel title={t[group.key]} count={group.places.length} />
              <Box sx={{ px: 1 }}>
                {group.places.map((child) => (
                  <PlaceRow
                    key={child.id}
                    place={child}
                    parent={place}
                    onOpen={onOpen}
                    t={t}
                  />
                ))}
              </Box>
            </Box>
          ))}
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
