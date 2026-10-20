import { useState, useEffect } from "react";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import HistoryIcon from "@mui/icons-material/History";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import DirectionsWalkRoundedIcon from "@mui/icons-material/DirectionsWalkRounded";
import Button from "./Components/Button";
import { api } from "./api";
import { Radio } from "@mui/material";
import LocationPinIcon from "@mui/icons-material/LocationPin";
import { useLanguage } from "./LanguageContext";
import { yearLabel } from "./historic/manifest";

// Styling should go to css or theming (tailwind, mui)
const menuButtonStyle = {
  position: "absolute",
  top: "10px",
  right: "10px",
  zIndex: 1000,
};

const sectionBoxStyle = {
  width: "85%",
  backgroundColor: "white",
  borderRadius: 3,
  mt: 3,
  p: 2, // padding
  mx: "auto", // center box
  display: "flex",
  flexDirection: "column", // vertical layout
  gap: 1, // spacing between items
};

const IconBorder = ({ children }) => {
  return (
    <Box
      sx={{
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
        color: "black",
        borderRadius: 2,
        border: "2px solid black",
      }}
    >
      {children}
    </Box>
  );
};

const HikeIcon = () => {
  return (
    <Box
      sx={{
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgb(219, 226, 190)",
        color: "gray",
        borderRadius: "50%", // Circle
      }}
    >
      <DirectionsWalkRoundedIcon sx={{ fontSize: 25 }} />
    </Box>
  );
};

const ClickableBox = ({ checked, onClick, children }) => {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        cursor: "pointer",
        paddingLeft: 1,
        borderRadius: 2,
        bgcolor: checked ? "grey.200" : "transparent",
        "&:hover": {
          bgcolor: "grey.100",
        },
      }}
    >
      {children}
    </Box>
  );
};

// One row per year: the real acquisition date(s), then the sources.
const YearItem = ({ time, checked, onClick }) => {
  const { language, t } = useLanguage();
  const flags = [
    time.layers.some((l) => l.enhanced) && t.enhanced,
    time.layers.some((l) => l.ai_generated) && t.aiGenerated,
  ].filter(Boolean);

  return (
    <ClickableBox checked={checked} onClick={onClick}>
      <IconBorder>
        <HistoryIcon sx={{ fontSize: 25 }} />
      </IconBorder>
      <Box sx={{ flexGrow: 1 }}>
        <Box>{yearLabel(time, language)}</Box>
        <Box sx={{ fontSize: 12, color: "text.secondary" }}>
          {time.layers.map((l) => l.title).join(" · ")}
        </Box>
        {flags.length > 0 && (
          <Box sx={{ fontSize: 12, color: "warning.dark" }}>
            {flags.join(" · ")}
          </Box>
        )}
      </Box>
      <Radio checked={checked} />
    </ClickableBox>
  );
};

const langLabels = { de: "De", cz: "Cz", en: "En" };

const LanguageSwitch = () => {
  const { language, setLanguage } = useLanguage();
  const options = ["de", "cz", "en"];

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1 }}>
      {options.map((lang, i) => (
        <Box key={lang} sx={{ display: "flex", alignItems: "center" }}>
          <Box
            component="span"
            onClick={() => setLanguage(lang)}
            sx={{
              cursor: "pointer",
              color: language === lang ? "black" : "grey.500",
              fontSize: 14,
              userSelect: "none",
              "&:hover": { color: "black" },
            }}
          >
            {langLabels[lang]}
          </Box>
          {i < options.length - 1 && (
            <Box
              component="span"
              sx={{
                mx: 0.5,
                color: "grey.400",
                fontSize: 14,
                userSelect: "none",
              }}
            >
              {"|"}{" "}
            </Box>
          )}
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
      <Button onClick={handleOpen(true)}>
        <LayersOutlinedIcon style={{ fontSize: "24px", color: "#333" }} />
      </Button>

      <Drawer onClose={handleOpen(false)} open={open}>
        {/* Full width on mobild device */}
        <Box
          sx={{
            width: { xs: "100vw", sm: 450 },
            height: "100vw",
            backgroundColor: "rgb(219, 226, 190)",
          }}
          role="presentation"
        >
          <Box sx={{ mx: 2, paddingBottom: 2, paddingTop: 1, my: 0 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <h1 style={{ marginBottom: 0 }}>Menu</h1>
                <LanguageSwitch />
              </Box>
              <Button onClick={handleOpen(false)} color={"transparent"}>
                <HighlightOffIcon style={{ fontSize: "24px", color: "#333" }} />
              </Button>
            </Box>
          </Box>

          {/* Historic aerial imagery */}
          <Box sx={sectionBoxStyle}>
            <Box sx={{ fontWeight: 500 }}>{t.historicImagery}</Box>
            {years.length === 0 && (
              <Box sx={{ fontSize: 14, color: "text.secondary" }}>
                {t.noImageryInView}
              </Box>
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
          </Box>

          {/* Layer menu */}
          <Box sx={sectionBoxStyle}>
            <ClickableBox
              checked={itemState.showMarkers}
              onClick={onItemClick("showMarkers")}
            >
              <IconBorder>
                <LocationPinIcon sx={{ fontSize: 25 }} />
              </IconBorder>
              <Box sx={{ flexGrow: 1 }}>{t.showLocations}</Box>
              <Radio checked={itemState.showMarkers} />
            </ClickableBox>
          </Box>

          {/* Tours */}
          <Box sx={sectionBoxStyle}>
            {tours.map((tour) => (
              <ClickableBox
                key={tour.id}
                checked={itemState.tourId === tour.id}
                onClick={() =>
                  onItemClick("tour")(
                    itemState.tourId === tour.id ? null : tour.id,
                  )
                }
              >
                <HikeIcon />
                <Box sx={{ flexGrow: 1 }}>
                  {`${tour.name} · ${tour.length.toFixed(1)} km`}
                </Box>
                <Radio checked={itemState.tourId === tour.id} />
              </ClickableBox>
            ))}
          </Box>

          {/* With support from */}
          <Box
            sx={{
              width: "85%",
              mt: 8,
              mb: 3,
              mx: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              textAlign: "left",
              gap: 2,
            }}
          >
            <Box sx={{ color: "text.secondary", fontSize: 20 }}>
              {t.withSupportFrom}
            </Box>
            <Box
              component="img"
              src="/interreg-logo.png"
              alt="Supporter logo"
              sx={{
                maxWidth: "85%",
                height: "auto",
                objectFit: "contain",
                // Blends a white logo background into the menu background
                mixBlendMode: "multiply",
              }}
            />
          </Box>
        </Box>
      </Drawer>
    </div>
  );
};

export default Menu;
