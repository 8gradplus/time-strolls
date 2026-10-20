import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Radio from "@mui/material/Radio";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import HistoryIcon from "@mui/icons-material/History";
import DirectionsWalkRoundedIcon from "@mui/icons-material/DirectionsWalkRounded";
import LocationPinIcon from "@mui/icons-material/LocationPin";
import Button from "./Components/Button";
import Sheet from "./Components/Sheet";
import { api } from "./api";
import { useLanguage } from "./LanguageContext";
import { yearLabel } from "./historic/manifest";
import { serif } from "./theme";

const menuButtonStyle = {
  position: "absolute",
  top: "10px",
  right: "10px",
  zIndex: 1000,
};

const Section = ({ title, children }) => (
  <List
    dense
    sx={{ px: 1.5 }}
    subheader={
      <ListSubheader
        disableSticky
        sx={{ typography: "overline", bgcolor: "transparent", px: 1 }}
      >
        {title}
      </ListSubheader>
    }
  >
    {children}
  </List>
);

// One row per year: the real acquisition date(s), then the sources.
const YearItem = ({ time, checked, onClick }) => {
  const { language, t } = useLanguage();
  const flags = [
    time.layers.some((l) => l.enhanced) && t.enhanced,
    time.layers.some((l) => l.ai_generated) && t.aiGenerated,
  ].filter(Boolean);

  return (
    <ListItemButton selected={checked} onClick={onClick}>
      <ListItemIcon sx={{ minWidth: 36 }}>
        <HistoryIcon />
      </ListItemIcon>
      <ListItemText
        primary={yearLabel(time, language)}
        secondary={
          <>
            {time.layers.map((l) => l.title).join(" · ")}
            {flags.length > 0 && (
              <Box
                component="span"
                sx={{ display: "block", color: "warning.main" }}
              >
                {flags.join(" · ")}
              </Box>
            )}
          </>
        }
      />
      <Radio checked={checked} edge="end" tabIndex={-1} />
    </ListItemButton>
  );
};

const langLabels = { de: "De", cz: "Cz", en: "En" };

const LanguageSwitch = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Box sx={{ display: "flex", gap: 1.5, mt: 0.5 }}>
      {Object.entries(langLabels).map(([lang, label]) => (
        <Box
          key={lang}
          component="button"
          onClick={() => setLanguage(lang)}
          sx={{
            all: "unset",
            cursor: "pointer",
            fontSize: 14,
            color: language === lang ? "text.primary" : "text.disabled",
            fontWeight: language === lang ? 600 : 400,
            "&:hover": { color: "text.primary" },
          }}
        >
          {label}
        </Box>
      ))}
    </Box>
  );
};

const Menu = (props) => {
  const { onItemClick, itemState, years, times } = props;
  const [open, setOpen] = useState(false);
  const [tours, setTours] = useState([]);
  const { t } = useLanguage();

  const handleOpen = (open) => () => {
    setOpen(open);
  };

  useEffect(() => {
    fetch(api.tours)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Track response not ok");
        }
        return res.json();
      })
      .then((data) => setTours(data))
      .catch((error) => console.error("Error fetching track:", error));
  }, []);

  return (
    <div style={menuButtonStyle}>
      <Button onClick={handleOpen(true)} label={t.menu}>
        <LayersOutlinedIcon />
      </Button>

      <Sheet
        open={open}
        onClose={handleOpen(false)}
        header={
          <>
            <Typography
              sx={{ fontFamily: serif, fontWeight: 700, fontSize: 22 }}
            >
              Time Strolls
            </Typography>
            <LanguageSwitch />
          </>
        }
      >
        {/* Historic aerial imagery */}
        <Section title={t.historicImagery}>
          {years.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
              {t.noImageryInView}
            </Typography>
          )}
          {years.map((year) => (
            <YearItem
              key={year}
              time={times[year]}
              checked={itemState.year === year}
              onClick={() =>
                onItemClick("year")(itemState.year === year ? null : year)
              }
            />
          ))}
        </Section>

        {/* Layer menu */}
        <Section title={t.map}>
          <ListItemButton onClick={onItemClick("showMarkers")}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <LocationPinIcon />
            </ListItemIcon>
            <ListItemText primary={t.showLocations} />
            <Switch checked={itemState.showMarkers} edge="end" tabIndex={-1} />
          </ListItemButton>
        </Section>

        {/* Tours */}
        {tours.length > 0 && (
          <Section title={t.tours}>
            {tours.map((tour) => (
              <ListItemButton
                key={tour.id}
                selected={itemState.tourId === tour.id}
                onClick={() =>
                  onItemClick("tour")(
                    itemState.tourId === tour.id ? null : tour.id,
                  )
                }
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <DirectionsWalkRoundedIcon />
                </ListItemIcon>
                <ListItemText
                  primary={tour.name}
                  secondary={`${tour.length.toFixed(1)} km`}
                />
                <Radio
                  checked={itemState.tourId === tour.id}
                  edge="end"
                  tabIndex={-1}
                />
              </ListItemButton>
            ))}
          </Section>
        )}

        {/* With support from */}
        <Box
          sx={{
            mx: 2.5,
            mt: 4,
            mb: 3,
            pt: 2,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t.withSupportFrom}
          </Typography>
          {/* The logo has a white background, so it sits on a white plate in dark mode */}
          <Box
            sx={{
              display: "inline-block",
              bgcolor: "#fff",
              borderRadius: 1,
              p: 1,
            }}
          >
            <Box
              component="img"
              src="/interreg-logo.png"
              alt="Interreg"
              sx={{ display: "block", maxWidth: 280, width: "100%" }}
            />
          </Box>
        </Box>
      </Sheet>
    </div>
  );
};

export default Menu;
