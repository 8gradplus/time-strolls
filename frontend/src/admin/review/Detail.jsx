// One resource of the review list in a panel (right on larger screens, full
// screen on phones): the picture, its texts per language with how they came
// about, the places a photo shows (chips, changed at once), its sources and
// permission, its history, and the same actions as the list.
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Icon } from "../../icons";
import { useLanguage } from "../../LanguageContext";
import { serif } from "../../theme";
import TextField from "@mui/material/TextField";
import { Plain } from "../../Components/Preferences";
import {
  deleteResource,
  editText,
  fill,
  LANGS,
  link,
  putText,
  resourceDetail,
  resourceHistory,
  unlink,
} from "../api";
import EditPlace from "../places/EditPlace";
import PlacePicker, { placeMeta } from "../places/PlacePicker";

const FIELDS = ["name", "title", "description"];

const Section = ({ title, children }) => (
  <Box
    component="section"
    sx={{ px: 2.5, py: 2, borderTop: 1, borderColor: "divider" }}
  >
    <Typography
      component="h3"
      sx={{
        fontSize: 12,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "text.secondary",
        mb: 1,
      }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

// The original of a field, which translations are made from
const originalOf = (texts, field) =>
  texts.find(
    (x) => x.field === field && x.method === "original" && x.is_primary,
  ) ?? texts.find((x) => x.field === field && x.method === "original");

// One text in place: an original from a source is edited with a note (and
// marked as edited), an own original or a translation is replaced; a
// translation by hand becomes "human". `x` is null for a new text: a
// translation from `from`, or without `from` the field's first text, an
// original.
const TextEditor = ({ id, field, lang, x, from, onDone, onCancel }) => {
  const { t } = useLanguage();
  const [body, setBody] = useState(x?.body ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fromSource = x?.method === "original" && Boolean(x.source_record_id);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (fromSource) await editText(id, field, lang, body.trim(), note.trim());
      else if (!x && !from)
        await putText(id, field, lang, { body: body.trim() });
      else if (x?.method === "original")
        await putText(id, field, lang, {
          body: body.trim(),
          is_primary: x.is_primary,
        });
      else
        await putText(id, field, lang, {
          body: body.trim(),
          method: "human",
          translated_from: from,
        });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Box sx={{ my: 1 }}>
      <TextField
        multiline
        fullWidth
        autoFocus
        size="small"
        minRows={field === "description" ? 4 : 1}
        label={`${t.admin.fields[field] ?? field} · ${lang.toUpperCase()}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {fromSource && (
        <TextField
          fullWidth
          size="small"
          label={t.admin.editNote}
          helperText={t.admin.editNoteHint}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          sx={{ mt: 1 }}
        />
      )}
      {error && (
        <Typography role="alert" sx={{ color: "error.main", fontSize: 13 }}>
          {error}
        </Typography>
      )}
      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
        <Button
          size="small"
          variant="contained"
          disableElevation
          disabled={busy || !body.trim() || (fromSource && !note.trim())}
          onClick={save}
        >
          {t.admin.save}
        </Button>
        <Button size="small" onClick={onCancel}>
          {t.admin.cancel}
        </Button>
      </Box>
    </Box>
  );
};

// `offer`: fields shown even while empty (a place's description), so the
// first text can be written; it becomes the original.
const Texts = ({ id, texts, verbatim, editable, onChanged, offer = [] }) => {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(null); // "field/lang"
  const fields = FIELDS.filter(
    (f) => texts.some((x) => x.field === f) || (editable && offer.includes(f)),
  );
  const done = () => {
    setEditing(null);
    onChanged();
  };
  return fields.map((field) => {
    const original = originalOf(texts, field);
    const missing = LANGS.filter(
      (l) => !texts.some((x) => x.field === field && x.lang === l),
    );
    // without an original only an empty offered field can get a first text
    const empty = !texts.some((x) => x.field === field);
    const addable = original || empty ? missing : [];
    return (
      <Box key={field} sx={{ mb: 2 }}>
        <Box sx={{ fontWeight: 600, fontSize: 14, mb: 0.5 }}>
          {t.admin.fields[field] ?? field}
        </Box>
        {texts
          .filter((x) => x.field === field)
          .sort(
            (a, b) =>
              (a.method === "original" ? -1 : 0) -
              (b.method === "original" ? -1 : 0),
          )
          .map((x) =>
            editing === `${field}/${x.lang}` ? (
              <TextEditor
                key={x.id}
                id={id}
                field={field}
                lang={x.lang}
                x={x}
                from={original?.lang}
                onDone={done}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <Box
                key={x.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "2.5em 1fr auto",
                  gap: 1,
                  mb: 1,
                }}
              >
                <Box
                  translate="no"
                  sx={{
                    color: "text.secondary",
                    fontSize: 13,
                    textTransform: "uppercase",
                    pt: "2px",
                  }}
                >
                  {x.lang}
                </Box>
                <Box>
                  <Box
                    sx={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}
                  >
                    {x.body}
                  </Box>
                  <Box sx={{ color: "text.secondary", fontSize: 12 }}>
                    {[
                      t.admin.methods[x.method] ?? x.method,
                      x.model,
                      verbatim[`${x.field}/${x.lang}`] && t.admin.edited,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Box>
                </Box>
                {editable && (
                  <Plain
                    onClick={() => setEditing(`${field}/${x.lang}`)}
                    sx={{
                      fontSize: 13,
                      color: "text.secondary",
                      alignSelf: "start",
                      "@media (hover: hover)": {
                        "&:hover": { color: "text.primary" },
                      },
                    }}
                  >
                    {t.admin.edit}
                  </Plain>
                )}
              </Box>
            ),
          )}
        {editable &&
          addable.map((lang) =>
            editing === `${field}/${lang}` ? (
              <TextEditor
                key={lang}
                id={id}
                field={field}
                lang={lang}
                x={null}
                from={original?.lang}
                onDone={done}
                onCancel={() => setEditing(null)}
              />
            ) : null,
          )}
        {editable && addable.length > 0 && (
          <Box sx={{ display: "flex", gap: 1.5, fontSize: 13 }}>
            {addable.map((lang) => (
              <Plain
                key={lang}
                onClick={() => setEditing(`${field}/${lang}`)}
                sx={{ color: "primary.main" }}
              >
                {fill(t.admin.addTranslation, { lang: lang.toUpperCase() })}
              </Plain>
            ))}
          </Box>
        )}
      </Box>
    );
  });
};

// The places a photo shows (its `shows` links) as chips: ✕ removes one, the
// search adds more. Every change is saved at once, then the panel reloads.
const ShownPlaces = ({ id, shows, editable, onChanged }) => {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (!editable)
    return shows.length ? (
      shows.map((p) => (
        <Box key={p.id} sx={{ fontSize: 14 }}>
          {p.name}
          <Box component="span" sx={{ color: "text.secondary", fontSize: 13 }}>
            {" · "}
            {placeMeta(p, t)}
          </Box>
        </Box>
      ))
    ) : (
      <Box sx={{ fontSize: 14, color: "text.secondary" }}>
        {t.admin.showsNone}
      </Box>
    );
  const change = async (next) => {
    const ids = new Set(next.map((p) => p.id));
    const before = new Set(shows.map((p) => p.id));
    setBusy(true);
    setError(null);
    try {
      for (const p of shows.filter((p) => !ids.has(p.id)))
        await unlink(p.relation_id);
      for (const p of next.filter((p) => !before.has(p.id)))
        await link(id, "shows", p.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      onChanged();
    }
  };
  return (
    <Box sx={{ opacity: busy ? 0.6 : 1 }}>
      <PlacePicker value={shows} onChange={change} label={t.admin.addPlace} />
      {error && (
        <Typography
          role="alert"
          sx={{ color: "error.main", fontSize: 14, mt: 1 }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
};

// Why a photo may be shown: our own, or the permissions that cover it,
// through a source (library scope) or its creator or owner (owner scope);
// else who would have to agree.
const RightsInfo = ({ rights }) => {
  const { t, language } = useLanguage();
  if (rights.own) return <Box sx={{ fontSize: 14 }}>{t.admin.rightsOwn}</Box>;
  if (!rights.permissions.length) {
    const who = [
      ...rights.sources.map((s) => `${t.admin.rightsScopes.source}: ${s}`),
      rights.owner && `${t.admin.rightsScopes.owner}: ${rights.owner}`,
      rights.creator &&
        rights.creator !== rights.owner &&
        `${t.admin.rightsScopes.creator}: ${rights.creator}`,
    ].filter(Boolean);
    return (
      <Box sx={{ fontSize: 14 }}>
        <Box sx={{ color: "warning.main", mb: 0.5 }}>{t.admin.rightsNone}</Box>
        {who.map((w) => (
          <Box key={w} sx={{ color: "text.secondary" }}>
            {w}
          </Box>
        ))}
      </Box>
    );
  }
  return rights.permissions.map((p) => (
    <Box key={p.id} sx={{ fontSize: 14, mb: 1 }}>
      <Box>
        <Box component="span" sx={{ color: "text.secondary" }}>
          {t.admin.rightsScopes[p.scope] ?? p.scope}:{" "}
        </Box>
        {p.via}
      </Box>
      <Box sx={{ color: "text.secondary", fontSize: 13 }}>
        {[
          p.copy ? t.admin.mayCopy : t.admin.mayShow,
          p.granted_by && fill(t.admin.grantedBy, { name: p.granted_by }),
          p.granted_at &&
            new Date(p.granted_at).toLocaleDateString(language, {
              dateStyle: "medium",
            }),
          p.note,
        ]
          .filter(Boolean)
          .join(" · ")}
      </Box>
    </Box>
  ));
};

// Deleting for good (admins): muting stays the rule. The confirmation says
// what goes along; a place others are part of is refused by the API.
const DeleteForGood = ({ detail, label, onDeleted }) => {
  const { t } = useLanguage();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteResource(detail.resource.id);
      setAsking(false);
      onDeleted();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button
        size="small"
        color="error"
        onClick={() => {
          setError(null);
          setAsking(true);
        }}
      >
        {t.admin.deleteForGood}
      </Button>
      <Dialog
        open={asking}
        onClose={() => setAsking(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogContent>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>
            {fill(t.admin.deleteWhat, { label })}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
            {fill(t.admin.deleteAlong, {
              texts: detail.texts.length,
              links: detail.relations.length,
            })}
            {detail.sources.length > 0 && ` ${t.admin.deleteSource}`}
          </Typography>
          {error && (
            <Typography
              role="alert"
              sx={{ color: "error.main", fontSize: 14, mt: 1.5 }}
            >
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(false)}>{t.admin.cancel}</Button>
          <Button
            variant="contained"
            color="error"
            disableElevation
            disabled={busy}
            onClick={confirm}
          >
            {t.admin.deleteConfirm}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const Detail = ({
  id,
  row,
  actions,
  actionLabel,
  onAction,
  onClose,
  mayWrite = false,
  mayDelete = false,
  onChanged = () => {},
  onDeleted = () => {},
}) => {
  const { t, language } = useLanguage();
  const mobile = useMediaQuery((theme) => theme.breakpoints.down("sm"));
  const [state, setState] = useState({
    detail: null,
    history: [],
    loading: false,
    failed: false,
  });

  const [version, setVersion] = useState(0); // a change reloads the panel
  const [editingPlace, setEditingPlace] = useState(false);
  const changed = () => {
    setVersion((v) => v + 1);
    onChanged();
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState((s) => ({
      detail: version ? s.detail : null,
      history: version ? s.history : [],
      loading: true,
      failed: false,
    }));
    Promise.all([resourceDetail(id), resourceHistory(id).catch(() => [])])
      .then(
        ([detail, history]) =>
          !cancelled &&
          setState({ detail, history, loading: false, failed: false }),
      )
      .catch(
        () =>
          !cancelled &&
          setState({ detail: null, history: [], loading: false, failed: true }),
      );
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  const { detail, history } = state;
  const item = detail?.item ?? {};
  const label = row?.label ?? item.name ?? "—";
  const published = detail?.resource?.status === "published";

  return (
    <Drawer
      anchor={mobile ? "bottom" : "right"}
      open={Boolean(id)}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: mobile
            ? { height: "100dvh", pt: "env(safe-area-inset-top)" }
            : { width: 480, borderLeft: 1, borderColor: "divider" },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          px: 2.5,
          pt: 2.5,
          pb: 1.5,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            component="h2"
            sx={{
              fontFamily: serif,
              fontSize: 26,
              fontWeight: 600,
              lineHeight: 1.15,
              overflowWrap: "anywhere",
            }}
          >
            {label}
          </Typography>
          {row && (
            <Box sx={{ color: "text.secondary", fontSize: 13, mt: 0.5 }}>
              {[
                row.kind && (t.kinds[row.kind] ?? row.kind),
                row.places.join(", "),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Box>
          )}
        </Box>
        <IconButton onClick={onClose} aria-label={t.close} edge="end">
          <Icon name="close" />
        </IconButton>
      </Box>
      <Box sx={{ height: 2 }}>{state.loading && <LinearProgress />}</Box>

      <Box sx={{ overflowY: "auto", flex: 1 }}>
        {state.failed && (
          <Typography sx={{ p: 2.5, color: "text.secondary" }}>
            {t.admin.loadFailed}
          </Typography>
        )}
        {item.url && (
          <Box
            component="img"
            src={item.url}
            alt=""
            sx={{
              display: "block",
              width: "100%",
              maxHeight: "50vh",
              objectFit: "contain",
              bgcolor: "action.hover",
            }}
          />
        )}
        {item.may_show === false && (
          <Box sx={{ px: 2.5, py: 1.5, fontSize: 14, color: "warning.main" }}>
            {t.admin.noPermission}
          </Box>
        )}
        {(item.date_text || item.creator || item.rights_holder) && (
          <Box sx={{ px: 2.5, py: 1.5, fontSize: 14, color: "text.secondary" }}>
            {[
              item.date_text,
              item.creator,
              item.rights_holder !== item.creator && item.rights_holder,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Box>
        )}
        {detail && (
          <>
            <Section title={t.admin.texts}>
              <Texts
                id={detail.resource.id}
                texts={detail.texts}
                verbatim={detail.verbatim ?? {}}
                editable={mayWrite}
                onChanged={changed}
                offer={detail.resource.type === "place" ? ["description"] : []}
              />
            </Section>
            {detail.resource.type === "media" && (
              <Section title={t.admin.shows}>
                <ShownPlaces
                  id={detail.resource.id}
                  shows={detail.shows ?? []}
                  editable={mayWrite}
                  onChanged={changed}
                />
              </Section>
            )}
            {mayWrite && detail.resource.type === "place" && (
              <Section title={t.admin.placeSection}>
                <Box sx={{ fontSize: 14, mb: 1 }}>
                  {[
                    t.kinds[item.kind] ?? item.kind,
                    `${item.lat?.toFixed(6)}, ${item.lon?.toFixed(6)}`,
                  ].join(" · ")}
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setEditingPlace(true)}
                >
                  {t.admin.editPlace}
                </Button>
                <EditPlace
                  open={editingPlace}
                  place={item}
                  relations={detail.relations}
                  onClose={() => setEditingPlace(false)}
                  onSaved={() => {
                    setEditingPlace(false);
                    changed();
                  }}
                />
              </Section>
            )}
            {detail.rights && (
              <Section title={t.admin.rights}>
                <RightsInfo rights={detail.rights} />
              </Section>
            )}
            {(detail.sources.length > 0 || item.source_url) && (
              <Section title={t.admin.source}>
                {[
                  ...new Set(
                    [
                      item.source_url,
                      ...detail.sources.map((s) => s.url),
                    ].filter(Boolean),
                  ),
                ].map((url) => (
                  <Box key={url}>
                    <Link
                      href={url}
                      target="_blank"
                      rel="noopener"
                      sx={{ overflowWrap: "anywhere", fontSize: 14 }}
                    >
                      {url}
                    </Link>
                  </Box>
                ))}
              </Section>
            )}
            {published && item.slug && detail.resource.type === "place" && (
              <Section title={t.admin.onMap}>
                <Link
                  href={`/?location=${item.slug}`}
                  target="_blank"
                  rel="noopener"
                  sx={{ fontSize: 14 }}
                >
                  {item.slug}
                </Link>
              </Section>
            )}
            {history.length > 0 && (
              <Section title={t.admin.history}>
                {history
                  .slice()
                  .reverse()
                  .map((h) => (
                    <Box
                      key={h.id}
                      sx={{ fontSize: 13, color: "text.secondary" }}
                    >
                      {new Date(h.at).toLocaleString(language, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {" · "}
                      {h.action}
                      {h.diff?.to ? ` → ${h.diff.to}` : ""}
                      {h.diff?.reason ? ` (${h.diff.reason})` : ""}
                    </Box>
                  ))}
              </Section>
            )}
            {mayDelete && (
              <Section title={t.admin.danger}>
                <DeleteForGood
                  detail={detail}
                  label={label}
                  onDeleted={onDeleted}
                />
              </Section>
            )}
          </>
        )}
      </Box>

      {actions.length > 0 && (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            px: 2.5,
            py: 1.5,
            borderTop: 1,
            borderColor: "divider",
            pb: "calc(12px + env(safe-area-inset-bottom))",
          }}
        >
          {actions.map((status) => (
            <Button
              key={status}
              variant={status === "published" ? "contained" : "outlined"}
              disableElevation
              onClick={() => onAction(status, item.may_show)}
            >
              {actionLabel(status)}
            </Button>
          ))}
        </Box>
      )}
    </Drawer>
  );
};

export default Detail;
