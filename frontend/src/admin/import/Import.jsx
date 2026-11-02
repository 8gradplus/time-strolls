// Topothek import (/admin/import): paste document links, choose the places
// they show, and harvest them one after another, gently (the archives are
// small). Each link gets a row: new, already there, or what went wrong. What
// is new waits for review; a row opens it in the review list.
import { useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useLanguage } from "../../LanguageContext";
import { fill, harvestTopothek } from "../api";
import { Section } from "../accounts/Mine";
import PlacePicker from "../places/PlacePicker";
import { parseLinks } from "./links";

// What went wrong, from the API's answer (api/controller/admin_content.py)
const problem = (error, t) =>
  ({
    404: t.admin.importNotFound,
    422: t.admin.importBadLink,
    502: t.admin.importUnreachable,
  })[error.status] ?? error.message;

const Result = ({ row }) => {
  const { t } = useLanguage();
  const state = {
    waiting: t.admin.importWaiting,
    running: t.admin.importRunning,
    new: t.admin.importNew,
    known: t.admin.importKnown,
    error: row.error,
  }[row.state];
  return (
    <Box
      component="li"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        py: 1,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Box
        sx={{ width: 56, height: 56, flex: "none", bgcolor: "action.hover" }}
      >
        {row.image && (
          <Box
            component="img"
            src={row.image}
            alt=""
            sx={{ width: 56, height: 56, objectFit: "cover", display: "block" }}
          />
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {row.id ? (
          <Link
            component={RouterLink}
            to={`/admin?type=media&status=${row.status}&open=${row.id}`}
            sx={{ fontWeight: 500, overflowWrap: "anywhere" }}
          >
            {row.title ?? row.url}
          </Link>
        ) : (
          <Box sx={{ overflowWrap: "anywhere" }}>{row.url}</Box>
        )}
        <Box
          sx={{
            fontSize: 13,
            color: row.state === "error" ? "error.main" : "text.secondary",
          }}
        >
          {state}
        </Box>
      </Box>
    </Box>
  );
};

const Import = () => {
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const [places, setPlaces] = useState([]);
  const [rows, setRows] = useState([]);
  const [running, setRunning] = useState(false);
  const stop = useRef(false);
  const { links, bad } = parseLinks(text);

  const update = (i, changes) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...changes } : row)));

  const run = async () => {
    const ids = places.map((p) => p.id);
    setRows(links.map((url) => ({ url, state: "waiting" })));
    setRunning(true);
    stop.current = false;
    for (const [i, url] of links.entries()) {
      if (stop.current) break;
      update(i, { state: "running" });
      try {
        const { media, created, title } = await harvestTopothek(url, ids);
        update(i, {
          state: created ? "new" : "known",
          id: media.id,
          status: media.status,
          image: media.url,
          title,
        });
      } catch (error) {
        update(i, { state: "error", error: problem(error, t) });
      }
    }
    setRunning(false);
  };

  const count = (state) => rows.filter((r) => r.state === state).length;
  const done = !running && rows.length > 0;

  return (
    <Box sx={{ maxWidth: 860, mx: "auto", px: { xs: 2, sm: 3 }, pb: 8 }}>
      <Typography variant="h1" sx={{ fontSize: 36, mt: 3 }}>
        {t.admin.import}
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>
        {t.admin.importText}
      </Typography>

      <Section title={t.admin.importLinks}>
        <TextField
          multiline
          fullWidth
          minRows={4}
          maxRows={14}
          label={t.admin.importLinks}
          placeholder="https://deutsch-reichenau.topothek.at/?doc=742582"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={running}
        />
        <Typography sx={{ fontSize: 14, color: "text.secondary", mt: 1 }}>
          {fill(t.admin.importFound, { n: links.length })}
          {bad.length > 0 && (
            <Box component="span" sx={{ color: "error.main" }}>
              {" · "}
              {fill(t.admin.importIgnored, { n: bad.length })}
            </Box>
          )}
        </Typography>
      </Section>

      <Section title={t.admin.importPlaces}>
        <Typography sx={{ color: "text.secondary", mb: 1.5 }}>
          {t.admin.importPlacesText}
        </Typography>
        <PlacePicker
          value={places}
          onChange={setPlaces}
          label={t.admin.searchPlace}
        />
      </Section>

      <Box sx={{ display: "flex", gap: 1, mt: 3 }}>
        <Button
          variant="contained"
          disableElevation
          disabled={running || links.length === 0}
          onClick={run}
        >
          {fill(t.admin.importRun, { n: links.length })}
        </Button>
        {running && (
          <Button onClick={() => (stop.current = true)}>
            {t.admin.importStop}
          </Button>
        )}
      </Box>

      {rows.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ height: 2 }}>
            {running && (
              <LinearProgress
                variant="determinate"
                value={
                  (100 * rows.filter((r) => r.state !== "waiting").length) /
                  rows.length
                }
              />
            )}
          </Box>
          {done && (
            <Typography role="status" sx={{ my: 1.5 }}>
              {fill(t.admin.importDone, {
                new: count("new"),
                known: count("known"),
                error: count("error"),
              })}{" "}
              {count("new") > 0 && (
                <Link component={RouterLink} to="/admin?type=media&status=new">
                  {t.admin.importReview}
                </Link>
              )}
            </Typography>
          )}
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {rows.map((row) => (
              <Result key={row.url} row={row} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Import;
