import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Radio from "@mui/material/Radio";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useColorScheme } from "@mui/material/styles";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import DirectionsWalkRoundedIcon from "@mui/icons-material/DirectionsWalkRounded";
import LocationPinIcon from "@mui/icons-material/LocationPin";
import Button from "./Components/Button";
import Sheet from "./Components/Sheet";
import { api } from "./api";
import { useLanguage } from "./LanguageContext";
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

const Menu = (props) => {
  const { onItemClick, itemState } = props;
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
              sx={{ fontFamily: serif, fontWeight: 600, fontSize: 28 }}
            >
              <Box component="i" sx={{ fontWeight: 500 }}>
                Time
              </Box>{" "}
              Strolls
            </Typography>
            <LanguageSwitch />
          </>
        }
      >
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

        {/* Light or dark */}
        <Section title={t.appearance}>
          <AppearanceSwitch />
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
      </Sheet>
    </div>
  );
};

export default Menu;
