import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Link from "@mui/material/Link";
import { useColorScheme } from "@mui/material/styles";
import Dock from "./Components/Dock";
import Wordmark from "./Components/Wordmark";
import { DownGlyph, Icon, ModeGlyph } from "./icons";
import { api } from "./api";
import { sources } from "./historic/manifest";
import { localized, previewUrl, yearRange } from "./historic/regions";
import { useLanguage } from "./LanguageContext";
import { motion, serif } from "./theme";

// Close transition of the dock (Dock.jsx); an area's flight starts after it
const CLOSE_MS = 200;

// Whether the dock is folded: a preference of this device, not part of a view
// worth linking to, so it is kept here and not in the URL
const FOLDED_KEY = "dockFolded";

const storedFolded = () => {
  try {
    return localStorage.getItem(FOLDED_KEY) === "true";
  } catch {
    return false;
  }
};

const hover = {
  transition: "background-color 160ms ease",
  "&:hover": { bgcolor: "action.hover" },
  "&:focus-visible": { outline: 2, outlineColor: "primary.main" },
};

// A plain button that is laid out by its sx
const Plain = ({ sx, ...props }) => (
  <Box
    component="button"
    type="button"
    sx={{
      font: "inherit",
      color: "inherit",
      border: 0,
      bgcolor: "transparent",
      p: 0,
      textAlign: "left",
      cursor: "pointer",
      ...sx,
    }}
    {...props}
  />
);

const Label = ({ children }) => (
  <Box
    component="p"
    sx={{
      m: 0,
      mx: 0.75,
      mb: 0.75,
      fontSize: "0.68rem",
      fontWeight: 500,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "text.secondary",
    }}
  >
    {children}
  </Box>
);

// One section of the main page; i orders the fade-in (Dock.jsx)
const Group = ({ title, i, children }) => (
  <Box className="dock-fade" style={{ "--i": i }} sx={{ display: "grid" }}>
    <Label>{title}</Label>
    {children}
  </Box>
);

// A row that switches something on or off: icon, text, round indicator
const ToggleRow = ({ icon, primary, secondary, on, onClick }) => (
  <Plain
    aria-pressed={on}
    onClick={onClick}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      width: "100%",
      px: 1,
      py: 1.1,
      borderRadius: 1.5,
      fontSize: "0.95rem",
      ...hover,
    }}
  >
    <Box sx={{ color: "text.secondary", display: "flex" }}>
      <Icon name={icon} size={22} />
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      {primary}
      {secondary && (
        <Box sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
          {secondary}
        </Box>
      )}
    </Box>
    <Box
      sx={{
        width: 18,
        height: 18,
        flex: "none",
        boxSizing: "border-box",
        borderRadius: "50%",
        border: 1.5,
        borderColor: on ? "primary.main" : "text.secondary",
        position: "relative",
        transition: "border-color 160ms ease",
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 3,
          borderRadius: "50%",
          bgcolor: "primary.main",
          transform: on ? "scale(1)" : "scale(0)",
          transition: `transform 200ms ${motion.open}`,
        },
      }}
    />
  </Plain>
);

const langLabels = { de: "De", cz: "Cz", en: "En" };

const LanguageSwitch = () => {
  const { language, setLanguage } = useLanguage();

  return (
    // Language names stay as they are, also under a page translator
    <Box
      translate="no"
      className="notranslate"
      sx={{ display: "flex", gap: 1.5 }}
    >
      {Object.entries(langLabels).map(([lang, label]) => (
        <Plain
          key={lang}
          aria-pressed={language === lang}
          onClick={() => setLanguage(lang)}
          sx={{
            minHeight: 28,
            color: language === lang ? "text.primary" : "text.secondary",
            fontWeight: language === lang ? 600 : 400,
            "&:hover": { color: "text.primary" },
          }}
        >
          {label}
        </Plain>
      ))}
    </Box>
  );
};

// Light, dark, or the device setting ("system"); MUI stores the choice. One
// quiet button next to the languages: its icon and name show the current
// mode, a tap steps to the next one.
const modes = [
  ["system", "modeSystem"],
  ["light", "modeLight"],
  ["dark", "modeDark"],
];

const ModeButton = () => {
  const { mode, setMode } = useColorScheme();
  const { t } = useLanguage();
  if (!mode) return null;

  const index = Math.max(
    0,
    modes.findIndex(([value]) => value === mode),
  );
  const [value, name] = modes[index];
  return (
    <Plain
      onClick={() => setMode(modes[(index + 1) % modes.length][0])}
      aria-label={`${t.appearance}: ${t[name]}`}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        minHeight: 28,
        color: "text.secondary",
        "&:hover": { color: "text.primary" },
      }}
    >
      <ModeGlyph mode={value} />
      {t[name]}
    </Plain>
  );
};

// One area: a tile as thumbnail, the name, countries and years; the area
// around the centre of the view is marked "Hier".
const AreaRow = ({ region, here, onClick }) => {
  const { language, t } = useLanguage();
  const preview = previewUrl(region);
  const subtitle = localized(region.subtitle, language);

  return (
    <Plain
      onClick={onClick}
      sx={{
        display: "grid",
        gridTemplateColumns: "64px minmax(0, 1fr) auto",
        gap: 1.5,
        alignItems: "center",
        width: "100%",
        p: 0.75,
        borderRadius: 1.5,
        ...hover,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: 0.75,
          bgcolor: "#8a8a88",
          backgroundImage: preview ? `url("${preview}")` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.12)",
        }}
      />
      <Box sx={{ minWidth: 0 }}>
        {/* Place names are not translated by page translators */}
        <Box
          translate="no"
          className="notranslate"
          sx={{
            fontFamily: serif,
            fontWeight: 600,
            fontSize: "1.3rem",
            lineHeight: 1.1,
          }}
        >
          {localized(region.title, language)}
        </Box>
        {[
          subtitle,
          [...(region.countries ?? []), yearRange(region.times)].join(" · "),
        ]
          .filter(Boolean)
          .map((line) => (
            <Box
              key={line}
              sx={{
                mt: 0.25,
                fontSize: "0.78rem",
                color: "text.secondary",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {line}
            </Box>
          ))}
      </Box>
      {here ? (
        <Box
          sx={{
            fontSize: "0.7rem",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "primary.main",
            bgcolor: "accentSoft",
            px: 1,
            py: 0.4,
            borderRadius: 999,
          }}
        >
          {t.here}
        </Box>
      ) : (
        <Box sx={{ color: "text.secondary", display: "flex" }}>
          <Icon name="chevron_right" />
        </Box>
      )}
    </Plain>
  );
};

// The logo has a white background, so it sits on a white plate in dark mode
const FundingLogo = () => (
  <Box
    component="img"
    src="/interreg-logo.png"
    alt="Interreg Österreich–Tschechien"
    sx={{
      display: "block",
      width: "100%",
      p: 1,
      boxSizing: "border-box",
      bgcolor: "#fff",
      borderRadius: 0.75,
    }}
  />
);

// The map's sources: OpenStreetMap (also credited on the map itself) and the
// aerial imagery of the selected year. Quoted as published, not translated.
const Sources = ({ time, year }) => {
  const { t } = useLanguage();

  return (
    <>
      <Box translate="no" className="notranslate">
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
        <Box>
          <Box sx={{ color: "text.primary", fontWeight: 500 }}>
            {t.aerialImagery} {year}
          </Box>
          {sources(time).map((source) => (
            <Box key={source} translate="no" className="notranslate">
              {source}
            </Box>
          ))}
        </Box>
      )}
    </>
  );
};

// The operator, quoted as is (not translated)
const Imprint = () => (
  <Box translate="no" className="notranslate">
    <Box sx={{ color: "text.primary", fontWeight: 500 }}>Viktor Atalla</Box>
    <Box>Berliner Allee 83</Box>
    <Box>13088 Berlin</Box>
    <Link href="mailto:viktor.atalla@gmail.com" color="inherit">
      viktor.atalla@gmail.com
    </Link>
  </Box>
);

// The pages under the menu's links slide in inside the dock
const subPages = {
  about: ({ t }) => (
    <>
      <Box component="p" sx={{ m: 0 }}>
        {t.aboutText}
      </Box>
      <Box>
        <Box sx={{ mb: 1 }}>{t.withSupportFrom}</Box>
        <FundingLogo />
      </Box>
    </>
  ),
  sources: ({ time, year }) => <Sources time={time} year={year} />,
  imprint: () => <Imprint />,
};

// The menu button opens the dock: the menu grows above the row of controls,
// the ☰ folds into ⌄. A tap outside, Escape or the handle closes it. The
// other dock controls come in as children, the location button as float.
// Order: the wordmark with the languages and the appearance under it, the
// areas, what is on the map (places, then the tours), then a colophon with
// the pages about the project (with the funding), the sources and the imprint.
const Menu = (props) => {
  const {
    onItemClick,
    itemState,
    regions,
    hereId,
    onRegion,
    time,
    year,
    float,
    children,
  } = props;
  const [open, setOpen] = useState(false);
  const [folded, setFolded] = useState(storedFolded);
  const [page, setPage] = useState(null);
  const [tours, setTours] = useState([]);
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Back to the main page once the dock has closed
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => setPage(null), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [open]);

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

  const fold = (value) => {
    setFolded(value);
    try {
      localStorage.setItem(FOLDED_KEY, value);
    } catch {
      // Without storage the dock just unfolds again on the next visit
    }
  };

  // The dock closes first, then the map flies, so the user sees where it went
  const chooseRegion = (region) => {
    setOpen(false);
    setTimeout(() => onRegion(region), CLOSE_MS);
  };

  const burger = (
    <Plain
      onClick={() => setOpen(!open)}
      aria-label={open ? t.close : t.menu}
      aria-expanded={open}
      sx={{
        position: "relative",
        width: 44,
        height: 44,
        flex: "none",
        borderRadius: "50%",
        ...hover,
        // ☰ drawn as three lines. Open, they draw together and fade, and a
        // ⌄ (the menu folds back down) drops in in the same 1.6 px line
        "& i": {
          position: "absolute",
          left: 13,
          width: 18,
          height: 1.6,
          borderRadius: 1,
          bgcolor: "currentColor",
          transition: `transform 240ms ${motion.open}, opacity 160ms ease`,
          ...(open && { opacity: 0 }),
        },
        "& i:nth-of-type(1)": {
          top: 16,
          transform: open ? "translateY(5.2px) scaleX(0.5)" : "none",
        },
        "& i:nth-of-type(2)": {
          top: 21.2,
          transform: open ? "scaleX(0.5)" : "none",
        },
        "& i:nth-of-type(3)": {
          top: 26.4,
          transform: open ? "translateY(-5.2px) scaleX(0.5)" : "none",
        },
        "& svg": {
          position: "absolute",
          left: 10,
          top: 10,
          opacity: open ? 1 : 0,
          transform: open ? "none" : "translateY(-4px)",
          transition: `transform 240ms ${motion.open}, opacity 200ms ease ${open ? "60ms" : "0ms"}`,
        },
      }}
    >
      <i />
      <i />
      <i />
      <DownGlyph size={24} />
    </Plain>
  );

  // The colophon stands at the foot of the sheet, the rest at the top
  const main = (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ display: "grid", gap: 3, pb: 4.5 }}>
        <Box
          className="dock-fade"
          style={{ "--i": 0 }}
          sx={{
            display: "grid",
            justifyItems: "start",
            gap: 2.25,
            px: 0.75,
            pt: 0.5,
            fontSize: "0.8rem",
          }}
        >
          <Wordmark play={open} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
            <LanguageSwitch />
            <Box
              aria-hidden="true"
              sx={{ width: "1px", height: 14, bgcolor: "divider" }}
            />
            <ModeButton />
          </Box>
        </Box>

        {regions.length > 0 && (
          <Group title={t.areas} i={1}>
            {regions.map((region) => (
              <AreaRow
                key={region.id}
                region={region}
                here={region.id === hereId}
                onClick={() => chooseRegion(region)}
              />
            ))}
          </Group>
        )}

        <Group title={t.onTheMap} i={2}>
          <ToggleRow
            icon="location_on"
            primary={t.places}
            on={itemState.showMarkers}
            onClick={onItemClick("showMarkers")}
          />
          {tours.map((tour) => (
            <ToggleRow
              key={tour.id}
              icon="directions_walk"
              primary={tour.name}
              secondary={`${tour.length.toFixed(1)} km`}
              on={itemState.tourId === tour.id}
              onClick={() =>
                onItemClick("tour")(
                  itemState.tourId === tour.id ? null : tour.id,
                )
              }
            />
          ))}
        </Group>
      </Box>

      {/* The colophon: small print after a pause, links split by middots */}
      <Box
        className="dock-fade"
        style={{ "--i": 3 }}
        sx={{
          display: "flex",
          flexWrap: "wrap",
          pt: 1.25,
          px: 0.75,
          borderTop: 1,
          borderColor: "divider",
          fontSize: "0.8rem",
          color: "text.secondary",
        }}
      >
        {Object.keys(subPages).map((key, i) => (
          <Box key={key} sx={{ display: "flex", alignItems: "center" }}>
            {i > 0 && (
              <Box
                component="span"
                aria-hidden="true"
                sx={{ px: 1.25, opacity: 0.5 }}
              >
                ·
              </Box>
            )}
            <Plain
              onClick={() => setPage(key)}
              sx={{ py: 0.75, "&:hover": { color: "text.primary" } }}
            >
              {t[key]}
            </Plain>
          </Box>
        ))}
      </Box>
    </Box>
  );

  const SubPage = page && subPages[page];
  const sub = (
    <Box sx={{ display: "grid", gap: 1.25, alignContent: "start" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, pt: 0.5 }}>
        <Plain
          onClick={() => setPage(null)}
          aria-label={t.back}
          sx={{
            width: 44,
            height: 44,
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            ...hover,
          }}
        >
          <Icon name="arrow_back" />
        </Plain>
        <Box
          component="h2"
          sx={{ m: 0, fontFamily: serif, fontWeight: 600, fontSize: "1.4rem" }}
        >
          {page && t[page]}
        </Box>
      </Box>
      <Box
        sx={{
          mx: 0.75,
          display: "grid",
          gap: 1.25,
          fontSize: "0.88rem",
          lineHeight: 1.6,
          color: "text.secondary",
        }}
      >
        {SubPage && <SubPage t={t} time={time} year={year} />}
      </Box>
    </Box>
  );

  // Two pages side by side; a link slides the second one in. They fill the
  // dock's sheet (Dock.jsx), which grows only for a longer page in view.
  const panel = (
    <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <Box
        sx={{
          display: "flex",
          width: "200%",
          flex: "none",
          alignItems: "stretch",
          transform: page ? "translateX(-50%)" : "none",
          transition: `transform 300ms ${motion.open}`,
          "& > *": {
            display: "flex",
            flexDirection: "column",
            width: "50%",
            boxSizing: "border-box",
            px: 1.5,
            pt: 0.75,
            pb: 1.75,
          },
          // The page out of view doesn't add to the height
          "& > [inert]": { height: 0 },
        }}
      >
        <Box inert={!!page}>{main}</Box>
        <Box inert={!page}>{sub}</Box>
      </Box>
    </Box>
  );

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Dock
        open={open}
        onClose={() => setOpen(false)}
        label={t.menu}
        panel={panel}
        folded={folded}
        onFold={fold}
        badge={year}
        foldLabel={t.foldDock}
        unfoldLabel={t.unfoldDock}
        float={float}
      >
        {burger}
        {children}
      </Dock>
    </ClickAwayListener>
  );
};

export default Menu;
