import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Radio from "@mui/material/Radio";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useColorScheme } from "@mui/material/styles";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ZoomOutMapRoundedIcon from "@mui/icons-material/ZoomOutMapRounded";
import DirectionsWalkRoundedIcon from "@mui/icons-material/DirectionsWalkRounded";
import LocationPinIcon from "@mui/icons-material/LocationPin";
import Button from "./Components/Button";
import Dock from "./Components/Dock";
import { api } from "./api";
import { sources } from "./historic/manifest";
import { useLanguage } from "./LanguageContext";
import { serif } from "./theme";

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

const langLabels = { de: "De", cz: "Cz", en: "En" };

const LanguageSwitch = () => {
  const { language, setLanguage } = useLanguage();

  return (
    // Language names stay as they are, also under a page translator
    <Box
      translate="no"
      className="notranslate"
      sx={{ display: "flex", gap: 1.5, mt: 0.5 }}
    >
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

// Light, dark, or the device setting ("system"); MUI stores the choice
const AppearanceSwitch = () => {
  const { mode, setMode } = useColorScheme();
  const { t } = useLanguage();
  if (!mode) return null;

  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      size="small"
      value={mode}
      onChange={(event, value) => value && setMode(value)}
      sx={{ px: 1 }}
    >
      <ToggleButton value="system">{t.modeSystem}</ToggleButton>
      <ToggleButton value="light">{t.modeLight}</ToggleButton>
      <ToggleButton value="dark">{t.modeDark}</ToggleButton>
    </ToggleButtonGroup>
  );
};

// The map's sources: OpenStreetMap (also credited on the map itself) and the
// aerial imagery of the selected year. Quoted as published, not translated.
const Sources = ({ time, year }) => {
  const { t } = useLanguage();

  return (
    <Box sx={{ px: 1, typography: "body2", color: "text.secondary" }}>
      <Box translate="no" className="notranslate" sx={{ mb: 1 }}>
        ©{" "}
        <Link
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener"
          color="inherit"
        >
          OpenStreetMap
        </Link>
      </Box>
      {time && (
        <>
          <Box sx={{ color: "text.primary" }}>
            {t.aerialImagery} {year}
          </Box>
          {sources(time).map((source) => (
            <Box key={source} translate="no" className="notranslate">
              {source}
            </Box>
          ))}
        </>
      )}
    </Box>
  );
};

// The menu button opens the dock: it grows upwards, the controls stay in its
// top row and the menu unfolds underneath them (a first version; the look and
// the motion get their own design pass). A tap outside or Escape closes it.
// The other dock controls come in as children.
const Menu = (props) => {
  const { onItemClick, itemState, onTrackingModeChange, time, year, children } =
    props;
  const [open, setOpen] = useState(false);
  const [tours, setTours] = useState([]);
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Moving the map closes the menu, so the user sees where it went
  const handleTrackingMode = (mode) => () => {
    onTrackingModeChange(mode);
    setOpen(false);
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

  const button = (
    <Button
      onClick={() => setOpen(!open)}
      label={open ? t.close : t.menu}
      plain
    >
      {open ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
    </Button>
  );

  const panel = (
    <Box role="dialog" aria-label={t.menu}>
      <Box sx={{ px: 2, pt: 2, pb: 1.5, borderTop: 1, borderColor: "divider" }}>
        {/* The wordmark is a name, page translators leave it alone */}
        <Typography
          translate="no"
          className="notranslate"
          sx={{ fontFamily: serif, fontWeight: 600, fontSize: 28 }}
        >
          <Box component="i" sx={{ fontWeight: 500 }}>
            Time
          </Box>{" "}
          Strolls
        </Typography>
        <LanguageSwitch />
      </Box>
      <Box sx={{ borderTop: 1, borderColor: "divider" }}>
        {/* Layer menu */}
        <Section title={t.map}>
          <ListItemButton onClick={handleTrackingMode("area")}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ZoomOutMapRoundedIcon />
            </ListItemIcon>
            <ListItemText primary={t.showArea} />
          </ListItemButton>
          <ListItemButton onClick={onItemClick("showMarkers")}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <LocationPinIcon />
            </ListItemIcon>
            <ListItemText primary={t.showLocations} />
            <Radio checked={itemState.showMarkers} edge="end" tabIndex={-1} />
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

        {/* Light or dark */}
        <Section title={t.appearance}>
          <AppearanceSwitch />
        </Section>

        {/* Map and imagery sources */}
        <Section title={t.sources}>
          <Sources time={time} year={year} />
        </Section>

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
      </Box>
    </Box>
  );

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Dock open={open} panel={panel}>
        {button}
        {children}
      </Dock>
    </ClickAwayListener>
  );
};

export default Menu;
