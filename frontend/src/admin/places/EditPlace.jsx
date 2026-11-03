// Changing a place from its panel: its kind, its village and where it is.
// A village isn't part of a village: choosing that kind hides the picker and
// saving drops the link.
// The slug stays (links keep working); names are texts, edited in the panel.
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useLanguage } from "../../LanguageContext";
import { getPlace, link, unlink, updatePlace } from "../api";
import MapPicker from "./MapPicker";
import { KindSelect } from "./NewPlace";
import PlacePicker from "./PlacePicker";

// place: the panel's item (id, kind, lat, lon); relations: the resource's
const EditPlace = ({ open, place, relations, onClose, onSaved }) => {
  const { t } = useLanguage();
  const mobile = useMediaQuery((theme) => theme.breakpoints.down("sm"));
  const current = relations.find(
    (r) => r.predicate === "part_of" && r.subject_id === place.id,
  );
  const [kind, setKind] = useState(place.kind);
  const [point, setPoint] = useState({ lat: place.lat, lon: place.lon });
  const [village, setVillage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setKind(place.kind);
    setPoint({ lat: place.lat, lon: place.lon });
    setError(null);
    setVillage(null);
    if (current)
      getPlace(current.object_id)
        .then(setVillage)
        .catch(() => setVillage(null));
  }, [open, place, current?.object_id]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const changes = {
        ...(kind !== place.kind ? { kind } : {}),
        ...(point.lat !== place.lat || point.lon !== place.lon ? point : {}),
      };
      if (Object.keys(changes).length) await updatePlace(place.id, changes);
      const partOf = kind === "village" ? null : village;
      if ((partOf?.id ?? null) !== (current?.object_id ?? null)) {
        if (current) await unlink(current.id);
        if (partOf) await link(place.id, "part_of", partOf.id);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={mobile}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>{t.admin.editPlace}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, pt: 1, mb: 2 }}>
          <KindSelect value={kind} onChange={setKind} />
          {kind !== "village" && (
            <Box sx={{ flex: "1 1 260px" }}>
              <PlacePicker
                multiple={false}
                value={village}
                onChange={setVillage}
                label={t.admin.village}
              />
            </Box>
          )}
        </Box>
        <MapPicker value={point} onChange={setPoint} ignore={place.id} />
        {error && (
          <Typography role="alert" sx={{ color: "error.main", mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.admin.cancel}</Button>
        <Button
          variant="contained"
          disableElevation
          disabled={busy}
          onClick={save}
        >
          {t.admin.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditPlace;
