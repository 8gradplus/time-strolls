// A new place (/admin/places/new): its name and the name's language, its
// kind (a village by default), the village it belongs to (not for a
// village), and where it is on the map. A place that
// looks like an existing one is refused with the existing one named; it can
// still be created when it really is another place. What is added waits for
// review, and opens there.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useLanguage } from "../../LanguageContext";
import { createPlace, LANGS, link, PLACE_KINDS } from "../api";
import { Section } from "../accounts/Mine";
import MapPicker from "./MapPicker";
import PlacePicker from "./PlacePicker";

export const KindSelect = ({ value, onChange }) => {
  const { t } = useLanguage();
  return (
    <TextField
      select
      size="small"
      label={t.admin.kind}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth: 180 }}
    >
      {PLACE_KINDS.map((kind) => (
        <MenuItem key={kind} value={kind}>
          {t.kinds[kind] ?? kind}
        </MenuItem>
      ))}
    </TextField>
  );
};

const NewPlace = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [lang, setLang] = useState("de");
  const [kind, setKind] = useState("village");
  const [village, setVillage] = useState(null);
  const [point, setPoint] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // {text, duplicate?}

  const save = async (force = false) => {
    setBusy(true);
    setError(null);
    try {
      const place = await createPlace({
        name: name.trim(),
        lang,
        kind,
        lat: point.lat,
        lon: point.lon,
        ...(force ? { force: true } : {}),
      });
      // the place exists now: a failed link is fixed in its panel
      if (village && kind !== "village")
        await link(place.id, "part_of", village.id).catch(() => null);
      navigate(`/admin?type=place&status=${place.status}&open=${place.id}`);
    } catch (err) {
      setError({ text: err.message, duplicate: err.status === 409 });
      setBusy(false);
    }
  };

  const ready = name.trim() && point && !busy;
  return (
    <Box sx={{ maxWidth: 860, mx: "auto", px: { xs: 2, sm: 3 }, pb: 8 }}>
      <Typography variant="h1" sx={{ fontSize: 36, mt: 3 }}>
        {t.admin.newPlace}
      </Typography>
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) save();
        }}
      >
        <Section title={t.admin.fields.name}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
            <TextField
              size="small"
              label={t.admin.fields.name}
              helperText={t.admin.nameHint}
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ flex: "1 1 260px" }}
            />
            <TextField
              select
              size="small"
              label={t.admin.language}
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              sx={{ width: 110 }}
            >
              {LANGS.map((l) => (
                <MenuItem key={l} value={l}>
                  {l.toUpperCase()}
                </MenuItem>
              ))}
            </TextField>
            <KindSelect value={kind} onChange={setKind} />
          </Box>
        </Section>
        {kind !== "village" && (
          <Section title={t.admin.village}>
            <PlacePicker
              multiple={false}
              value={village}
              onChange={setVillage}
              label={t.admin.villageHint}
            />
          </Section>
        )}
        <Section title={t.admin.position}>
          <MapPicker value={point} onChange={setPoint} />
        </Section>
        {error && (
          <Box role="alert" sx={{ mt: 3, color: "error.main" }}>
            <Typography sx={{ overflowWrap: "anywhere" }}>
              {error.duplicate ? t.admin.duplicate : error.text}
            </Typography>
            {error.duplicate && (
              <>
                <Typography
                  sx={{ color: "text.secondary", fontSize: 14, my: 1 }}
                >
                  {error.text}
                </Typography>
                <Button
                  variant="outlined"
                  disabled={busy}
                  onClick={() => save(true)}
                >
                  {t.admin.createAnyway}
                </Button>
              </>
            )}
          </Box>
        )}
        <Box sx={{ display: "flex", gap: 1, mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            disableElevation
            disabled={!ready}
          >
            {t.admin.create}
          </Button>
          <Button onClick={() => navigate(-1)}>{t.admin.cancel}</Button>
        </Box>
      </Box>
    </Box>
  );
};

export default NewPlace;
