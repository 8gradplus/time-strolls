// Choose places by name: any status, any language, a part of the name is
// enough (GET /api/admin/places/search). Each option names its kind and
// village, as several houses share a number. `value` is a list of places
// ({id, name, kind, part_of_name}); with `multiple={false}` one place or null.
import { useEffect, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { useLanguage } from "../../LanguageContext";
import { searchPlaces } from "../api";

const WAIT_MS = 250;

export const placeMeta = (place, t) =>
  [
    t.kinds[place.kind] ?? place.kind,
    place.part_of_name,
    place.status !== "published" && t.admin.statuses[place.status],
  ]
    .filter(Boolean)
    .join(" · ");

const PlacePicker = ({
  value,
  onChange,
  label,
  kind,
  multiple = true,
  autoFocus = false,
}) => {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = input.trim();
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchPlaces({ q, kind });
        if (!cancelled) setOptions(found);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, WAIT_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input, kind]);

  return (
    <Autocomplete
      multiple={multiple}
      value={value}
      onChange={(_, next) => onChange(next)}
      inputValue={input}
      onInputChange={(_, next) => setInput(next)}
      options={options}
      loading={loading}
      // the API filters; the options are what it found
      filterOptions={(x) => x}
      getOptionLabel={(place) => place.name ?? place.slug}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      noOptionsText={
        input.trim().length < 2 ? t.admin.typeToSearch : t.admin.noPlaces
      }
      loadingText="…"
      renderOption={({ key, ...props }, place) => (
        <Box component="li" key={key} {...props}>
          <Box>
            <Box>{place.name}</Box>
            <Box sx={{ color: "text.secondary", fontSize: 13 }}>
              {placeMeta(place, t)}
            </Box>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField {...params} label={label} autoFocus={autoFocus} />
      )}
    />
  );
};

export default PlacePicker;
