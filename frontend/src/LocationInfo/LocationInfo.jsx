import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import Podcasts from "./Audio";
import DisplayImages from "./Images";
import Sheet from "../Components/Sheet";
import { api } from "../api";
import { useLanguage } from "../LanguageContext";
import { formatCoordinates } from "./coordinates";
import { serif } from "../theme";
import { Icon } from "../icons";
import { groupsOf, isHouse } from "../LocationMarkers/hierarchy";

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

// "Haus · verfallen · frühere Nr. 78, 155". The state and the address are
// in the archive's language, as stored ("Zaniklé", "Wüstung", "Pasečná 111")
const factsLine = (place, t) =>
  [
    t.kinds[place.kind],
    place.state,
    place.address,
    place.former_number && `${t.formerNumber} ${place.former_number}`,
  ]
    .filter(Boolean)
    .join(" · ");

// One row of a village's list: the house number, the name, the number of
// photos
const PlaceRow = ({ place, onOpen, t }) => {
  const state = place.state || place.address;
  const house = isHouse(place);
  return (
    <ButtonBase
      onClick={() => onOpen(place)}
      sx={{
        display: "grid",
        // a house's number in front; churches and chapels without
        gridTemplateColumns: house
          ? "2.2em minmax(0, 1fr) auto"
          : "minmax(0, 1fr) auto",
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
      {house && (
        <Box
          component="span"
          sx={{
            color: "text.secondary",
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {place.number}
        </Box>
      )}
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
          : place.name}
        {state && (
          <Box
            component="span"
            sx={{ color: "text.secondary", fontSize: "0.85rem", ml: 0.75 }}
          >
            {state}
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

// A village's churches, chapels or houses: a heading with the count that
// unfolds the list
const PlaceGroup = ({ title, places, onOpen, t }) => {
  const [open, setOpen] = useState(false);
  return (
    <Box>
      <ButtonBase
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        sx={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          gap: 0.5,
          px: 2.5,
          pt: 1.25,
          pb: 0.75,
          font: "inherit",
          color: "text.secondary",
        }}
      >
        <Typography
          variant="overline"
          component="h3"
          sx={{ flexGrow: 1, textAlign: "left" }}
        >
          {title}
        </Typography>
        <Typography variant="overline" component="span">
          {places.length}
        </Typography>
        <Box
          sx={{
            display: "flex",
            transition: "transform 0.2s",
            transform: open ? "rotate(90deg)" : "none",
          }}
        >
          <Icon name="chevron_right" size={20} />
        </Box>
      </ButtonBase>
      <Collapse in={open}>
        <Box sx={{ px: 1, pb: 1 }}>
          {places.map((child) => (
            <PlaceRow key={child.id} place={child} onOpen={onOpen} t={t} />
          ))}
        </Box>
      </Collapse>
    </Box>
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
            <Typography variant="h1">{place.name}</Typography>
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
          {groupsOf(info.children ?? []).map((group) => (
            <PlaceGroup
              key={`${slug}-${group.key}`}
              title={t[group.key]}
              places={group.places}
              onOpen={onOpen}
              t={t}
            />
          ))}
          {podcasts.length > 0 && (
            <>
              <SectionLabel title={t.audio} count={podcasts.length} />
              <Podcasts
                podcasts={podcasts}
                place={{
                  slug: place.slug,
                  name: place.name,
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
